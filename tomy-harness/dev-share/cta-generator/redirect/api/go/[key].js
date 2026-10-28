// 공개 리다이렉트 — 고방미디어허브(로컬 3025)는 인터넷에서 안 붙어서 이 함수가 대신 302를 낸다.
// 같은 Supabase 프로젝트(cta_links 테이블)를 읽는다. 목적지를 바꾸는 화면은
// 고방미디어허브 `CTA 관리`이고, 여기는 조회 + 리다이렉트 + 클릭 기록(cta_clicks)만 한다.
import { createHash } from 'node:crypto';

// 링크 미리보기 봇(카카오·페북·네이버 등)은 글이 공유될 때 사람 대신 주소를 한 번 찔러 본다.
// 빼지 않으면 공유 한 번이 클릭 한 번으로 잡힌다. 지우지 않고 표시만 해 둔다.
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|yeti|daum|headless|curl|wget|python-requests|axios|node-fetch/i;

function deviceOf(ua) {
  if (!ua) return 'unknown';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

function hostOf(referer) {
  try {
    return new URL(referer).hostname.toLowerCase();
  } catch {
    return '';
  }
}

// 같은 사람을 하루 단위로만 묶는다. IP 원문은 남기지 않는다 — 방문자 수를 세는 데는
// 날짜가 섞인 해시면 충분하고, 날이 바뀌면 같은 사람도 다른 값이 돼 추적이 안 된다.
function visitorOf(req, ua) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.CTA_VISITOR_SALT || 'gobang-cta';
  return createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex').slice(0, 16);
}

// 기록이 실패해도 이동은 막지 않는다 — 독자에게는 클릭 통계보다 목적지가 먼저다.
async function logClick(base, serviceKey, req, key) {
  const ua = String(req.headers['user-agent'] || '');
  const referer = String(req.headers.referer || req.headers.referrer || '');
  const src = typeof req.query.src === 'string' ? req.query.src.slice(0, 64) : '';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    await fetch(`${base}/rest/v1/cta_clicks`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        key,
        src: src || null,
        referer: referer.slice(0, 500) || null,
        referer_host: hostOf(referer) || null,
        device: deviceOf(ua),
        visitor: visitorOf(req, ua),
        country: String(req.headers['x-vercel-ip-country'] || '') || null,
        is_bot: BOT_UA.test(ua),
      }),
    });
  } catch {
    // 기록 실패는 조용히 넘긴다(위 주석)
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const key = req.query.key;
  if (!key) {
    res.status(400).send('missing key');
    return;
  }

  const rawBase = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawBase || !serviceKey) {
    res.status(500).send('redirect service misconfigured');
    return;
  }
  const base = rawBase.replace(/\/$/, '');

  const query = new URLSearchParams({
    key: `eq.${key}`,
    select: 'destination_url,active,utm_source,utm_campaign,utm_content',
  });
  let rows;
  try {
    const resp = await fetch(`${base}/rest/v1/cta_links?${query}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    rows = await resp.json();
  } catch {
    res.status(502).send('lookup failed');
    return;
  }

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || !row.active) {
    res.status(404).send('not found');
    return;
  }

  let dest;
  try {
    dest = new URL(row.destination_url);
  } catch {
    res.status(500).send('invalid destination');
    return;
  }
  if (row.utm_source) dest.searchParams.set('utm_source', row.utm_source);
  if (row.utm_campaign) dest.searchParams.set('utm_campaign', row.utm_campaign);
  if (row.utm_content) dest.searchParams.set('utm_content', row.utm_content);

  await logClick(base, serviceKey, req, key);

  // 캐시되면 두 번째 클릭부터 이 함수가 안 불려 기록이 빠진다.
  res.writeHead(302, { Location: dest.toString(), 'Cache-Control': 'no-store' });
  res.end();
}
