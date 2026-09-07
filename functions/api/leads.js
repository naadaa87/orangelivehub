/**
 * POST /api/leads
 * 셀러 신청 · 브랜드 제안 · 스튜디오 대관 · 문의 · 방송 알림을 접수합니다.
 *
 * 개인정보를 다루는 엔드포인트입니다. 아래 원칙을 지킵니다.
 *   · 개인정보 수집·이용 동의(consent)가 없으면 저장하지 않습니다.
 *   · 광고성 정보 수신은 별도 동의(marketing)로만 처리합니다.
 *   · 접속 IP는 원문으로 남기지 않고 해시만 저장합니다.
 *   · 저장 항목과 보유 기간은 policy.html 의 표와 일치해야 합니다.
 */

const TEAM = {
  seller: '셀러영업팀',
  brand: '셀러영업팀',
  studio: '스튜디오운영팀',
  notify: '마케팅팀',
  broadcast: '콘텐츠팀',
  order: '커머스운영팀',
  delivery: '물류운영팀',
  return: 'CS팀',
  etc: '통합 접수'
};

const PREFIX = { seller: 'SLR', brand: 'BRD', studio: 'STD', notify: 'NTF', inquiry: 'INQ' };

export async function onRequestPost({ request, env }) {
  const json = (b, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

  let data;
  try {
    const ct = request.headers.get('content-type') || '';
    data = ct.includes('application/json')
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return json({ error: 'bad_request', message: '요청 형식을 읽을 수 없습니다.' }, 400);
  }

  // 봇 차단용 허니팟 — 사람에게는 보이지 않는 필드입니다.
  if (data._hp) return json({ ok: true, ref_no: 'IGNORED' });

  const kind = String(data.kind || 'inquiry');
  if (!PREFIX[kind]) return json({ error: 'bad_kind', message: '접수 유형이 올바르지 않습니다.' }, 400);

  const email = String(data.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ error: 'bad_email', message: '이메일 형식을 확인해 주세요.' }, 400);
  }
  if (!truthy(data.agree) && !truthy(data.consent)) {
    return json({ error: 'no_consent', message: '개인정보 수집·이용 동의가 필요합니다.' }, 400);
  }

  const refNo = makeRef(PREFIX[kind]);

  if (!env.DB) {
    // 아직 D1을 연결하지 않은 상태에서도 화면 흐름은 유지되도록 접수번호만 돌려줍니다.
    return json({ ok: true, ref_no: refNo, stored: false, assigned_to: TEAM[data.type || kind] || TEAM.etc });
  }

  const known = ['kind', 'name', 'company', 'email', 'tel', 'agree', 'consent', 'marketing', '_hp'];
  const payload = Object.fromEntries(Object.entries(data).filter(([k]) => !known.includes(k)));
  const assigned = TEAM[data.type || kind] || TEAM.etc;

  try {
    await env.DB.prepare(
      `INSERT INTO leads (ref_no, kind, name, company, email, tel, payload, consent, marketing, assigned_to, ip_hash)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      refNo, kind,
      str(data.name), str(data.company), email, str(data.tel),
      JSON.stringify(payload), 1, truthy(data.marketing) ? 1 : 0, assigned,
      await hashIP(request.headers.get('cf-connecting-ip') || '', env.SALT || 'olh')
    ).run();

    // 알림 신청은 구독자 명단에도 반영합니다.
    if (kind === 'notify') {
      await env.DB.prepare(
        `INSERT INTO subscribers (email, tel, categories, marketing, unsub_token)
         VALUES (?,?,?,?,?)
         ON CONFLICT(email) DO UPDATE SET
           tel = excluded.tel, categories = excluded.categories,
           marketing = excluded.marketing, unsubscribed_at = NULL`
      ).bind(
        email, str(data.tel),
        JSON.stringify([].concat(data.cat || [])),
        truthy(data.marketing) ? 1 : 0,
        crypto.randomUUID()
      ).run();
    }

    return json({ ok: true, ref_no: refNo, stored: true, assigned_to: assigned });
  } catch (e) {
    return json({ error: 'store_failed', message: String(e).slice(0, 200) }, 500);
  }
}

const str = (v) => (v == null ? null : String(v).slice(0, 500));
const truthy = (v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1;

function makeRef(prefix) {
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function hashIP(ip, salt) {
  if (!ip) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ip));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}
