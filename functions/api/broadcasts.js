/**
 * GET /api/broadcasts
 * 편성 목록을 반환합니다. assets/js/data.js 의 broadcasts 와 같은 모양이라,
 * data.js 의 config.apiBase 만 채우면 화면 코드를 바꾸지 않고 붙습니다.
 *
 * 쿼리: ?from=2026-10-01&to=2026-10-31&cat=뷰티&channel=naver&limit=100
 *
 * D1 바인딩(DB)이 없으면 501을 돌려줍니다. 홈페이지는 그 경우
 * 정적 데이터로 계속 동작하므로 화면이 깨지지 않습니다.
 */
export async function onRequestGet({ request, env }) {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=120'
      }
    });

  if (!env.DB) {
    return json({
      error: 'not_configured',
      message: 'D1 데이터베이스(DB)가 연결되지 않았습니다. Pages 설정에서 바인딩을 추가해 주세요.'
    }, 501);
  }

  const u = new URL(request.url);
  const from = u.searchParams.get('from');
  const to = u.searchParams.get('to');
  const cat = u.searchParams.get('cat');
  const channel = u.searchParams.get('channel');
  const limit = Math.min(parseInt(u.searchParams.get('limit') || '100', 10) || 100, 300);

  const where = [];
  const bind = [];
  if (from) { where.push('b.date >= ?'); bind.push(from); }
  if (to) { where.push('b.date <= ?'); bind.push(to); }
  if (cat) { where.push('b.category = ?'); bind.push(cat); }
  if (channel) {
    where.push('EXISTS (SELECT 1 FROM broadcast_channels c WHERE c.broadcast_id = b.id AND c.channel = ?)');
    bind.push(channel);
  }
  where.push("b.status <> 'canceled'");

  const sql = `
    SELECT b.*,
           (SELECT json_group_array(json_object(
              'channel', c.channel, 'url', c.watch_url,
              'source', c.source, 'verified_at', c.verified_at))
            FROM broadcast_channels c WHERE c.broadcast_id = b.id) AS channels
    FROM broadcasts b
    WHERE ${where.join(' AND ')}
    ORDER BY b.date ASC, b.start_time ASC
    LIMIT ?`;

  try {
    const { results } = await env.DB.prepare(sql).bind(...bind, limit).all();
    const DOW = ['일', '월', '화', '수', '목', '금', '토'];

    const broadcasts = (results || []).map((r) => {
      const chs = safeParse(r.channels, []);
      const [y, m, d] = String(r.date).split('-').map(Number);
      return {
        id: r.id,
        date: r.date,
        dow: DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
        start: r.start_time,
        end: r.end_time,
        title: r.title,
        cat: r.category,
        host: r.host,
        hostRole: r.host_role,
        seller: r.seller,
        studio: r.studio,
        thumb: r.thumb,
        lineup: safeParse(r.lineup, []),
        note: r.note || '',
        status: r.status,
        plan: !!r.is_plan,
        channels: chs.map((c) => c.channel),
        // 확인된 링크만 내보냅니다. 미확인 링크는 화면에서 비활성으로 표시됩니다.
        channelLinks: Object.fromEntries(
          chs.filter((c) => c.url && c.verified_at).map((c) => [c.channel, c.url])
        )
      };
    });

    return json({ asOf: new Date().toISOString().slice(0, 10), count: broadcasts.length, broadcasts });
  } catch (e) {
    return json({ error: 'query_failed', message: String(e).slice(0, 200) }, 500);
  }
}

function safeParse(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}
