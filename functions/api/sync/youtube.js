/**
 * POST /api/sync/youtube
 * 유튜브에 예약된 라이브를 가져와 broadcast_channels 에 시청 링크를 채웁니다.
 *
 * 네 채널 중 유튜브만 이 방식이 가능합니다.
 * 네이버 쇼핑라이브와 카카오 쇼핑라이브는 방송 조회용 공개 API가 없어
 * 담당자가 링크를 등록하는 방식(source='manual')으로 처리합니다.
 * 틱톡샵은 파트너 승인 후 별도 구현이 필요합니다.
 *
 * 필요한 환경 변수 (Pages → Settings → Variables and secrets)
 *   YT_CLIENT_ID       구글 OAuth 클라이언트 ID
 *   YT_CLIENT_SECRET   시크릿
 *   YT_REFRESH_TOKEN   방송 채널 소유 계정으로 1회 발급받은 refresh token
 *   SYNC_TOKEN         이 엔드포인트를 호출할 때 쓰는 관리용 토큰
 *
 * 호출: curl -X POST https://<도메인>/api/sync/youtube -H "x-sync-token: <SYNC_TOKEN>"
 * Cron Trigger 로 10분마다 돌리면 편성표가 자동으로 최신 상태를 유지합니다.
 */
export async function onRequestPost({ request, env }) {
  const json = (b, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

  if (!env.SYNC_TOKEN || request.headers.get('x-sync-token') !== env.SYNC_TOKEN) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!env.DB) return json({ error: 'not_configured', message: 'D1 바인딩(DB)이 없습니다.' }, 501);
  if (!env.YT_REFRESH_TOKEN) return json({ error: 'not_configured', message: '유튜브 자격 정보가 없습니다.' }, 501);

  try {
    const token = await getAccessToken(env);
    const items = await listUpcoming(token);

    let matched = 0;
    for (const it of items) {
      const startISO = it?.snippet?.scheduledStartTime;
      if (!startISO) continue;

      // 유튜브는 UTC로 내려줍니다. 편성표는 한국시간(UTC+9) 기준입니다.
      const kst = new Date(new Date(startISO).getTime() + 9 * 3600 * 1000);
      const date = kst.toISOString().slice(0, 10);
      const hhmm = kst.toISOString().slice(11, 16);

      // 같은 날짜·시각의 편성을 찾아 연결합니다.
      // 제목이 완전히 같지 않아도 되도록 시각으로 맞춥니다.
      const row = await env.DB.prepare(
        `SELECT id FROM broadcasts WHERE date = ? AND start_time = ? LIMIT 1`
      ).bind(date, hhmm).first();

      if (!row) continue;

      await env.DB.prepare(
        `INSERT INTO broadcast_channels (broadcast_id, channel, watch_url, external_id, source, verified_at)
         VALUES (?, 'youtube', ?, ?, 'api', datetime('now'))
         ON CONFLICT(broadcast_id, channel) DO UPDATE SET
           watch_url = excluded.watch_url,
           external_id = excluded.external_id,
           source = 'api',
           verified_at = datetime('now')`
      ).bind(row.id, `https://www.youtube.com/watch?v=${it.id}`, it.id).run();

      matched++;
    }

    await log(env, 'youtube', 'ok', matched, `조회 ${items.length}건, 연결 ${matched}건`);
    return json({ ok: true, fetched: items.length, matched });
  } catch (e) {
    const msg = String(e).slice(0, 300);
    await log(env, 'youtube', 'error', 0, msg);
    return json({ error: 'sync_failed', message: msg }, 500);
  }
}

async function getAccessToken(env) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.YT_CLIENT_ID,
      client_secret: env.YT_CLIENT_SECRET,
      refresh_token: env.YT_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) throw new Error(`토큰 갱신 실패 ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function listUpcoming(token) {
  const url = new URL('https://www.googleapis.com/youtube/v3/liveBroadcasts');
  url.searchParams.set('part', 'id,snippet,status');
  url.searchParams.set('broadcastStatus', 'upcoming');
  url.searchParams.set('broadcastType', 'all');
  url.searchParams.set('maxResults', '50');

  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`방송 조회 실패 ${res.status}: ${await res.text()}`);
  return (await res.json()).items || [];
}

async function log(env, channel, result, matched, message) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      `INSERT INTO sync_log (channel, result, matched, message) VALUES (?,?,?,?)`
    ).bind(channel, result, matched, message).run();
  } catch { /* 로그 실패가 동기화를 막지 않도록 무시합니다 */ }
}
