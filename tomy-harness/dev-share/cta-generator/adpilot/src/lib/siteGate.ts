// 화면·조회 API 전체를 가리는 공유 암호 게이트.
//
// 로그인 시스템이 아니다 — 혼자 쓰는 도구가 URL만으로 열리는 것을 막는 최소 장치다.
// `CRON_SECRET`·`ADMIN_API_TOKEN`과 같은 패턴으로 **시크릿 미설정 시엔 통과시킨다**(로컬 개발).
//
// ⚠️ 이 게이트는 write 게이트(`adminAuth.ts`)를 대체하지 않는다. 층이 다르다 —
//    여기는 "이 사람이 화면을 볼 수 있는가", 거기는 "이 요청이 실제 매체를 건드려도 되는가".
//    암호를 통과했다고 매체에 쓸 수 있게 되면 안 되므로 두 층을 합치지 않는다.

export const GATE_COOKIE = "adpilot_gate";

/** 30일. 브라우저를 닫아도 유지된다 — 혼자 쓰는 도구에 매번 암호를 묻는 건 마찰뿐이다. */
export const GATE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * 게이트를 지나지 않는 경로.
 *
 * ⚠️ `/api/cron`을 반드시 통과시킨다. Vercel Cron 7개(`vercel.json`: 지표 적재·문구 수집·네이버 검색어·
 *    GA4 병합·이상감지·어드민 광고비 전송·주간 원장)가 여기서 막히면 자동화가 **조용히** 멈춘다 — 401은 크론 로그에만
 *    남고 화면에는 아무 표시가 없다. 그 라우트들은 각자 `CRON_SECRET`을 검사하므로
 *    통과시켜도 열리는 게 아니다. middleware가 아니라 여기 둔 이유는 테스트로 못박기 위함이다.
 */
export const GATE_OPEN_PREFIXES = ["/api/cron", "/api/gate", "/gate"];

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isOpenPath(pathname: string): boolean {
  return GATE_OPEN_PREFIXES.some((p) => underPrefix(pathname, p));
}

/**
 * 배포본(Vercel)에서 살아 있는 경로. **수집 크론만** 남긴다(2026-10-17 사용자 결정).
 *
 * AdPilot은 1인용 로컬 도구이고 Vercel은 매일 수집 크론을 돌리는 용도로만 남았다.
 * 화면·조회 API·암호 화면까지 배포본에 두면 공유 암호 1개가 유일한 방어선이 된다 —
 * 아무도 안 쓰는 화면을 지키느라 위험만 지는 셈이라 아예 404로 닫는다.
 * `robots.txt`는 "전부 색인 금지"를 계속 말하도록 남긴다.
 */
export const DEPLOYED_OPEN_PREFIXES = ["/api/cron"];
export const DEPLOYED_OPEN_EXACT = ["/robots.txt"];

export function deployedPathAllowed(pathname: string): boolean {
  if (DEPLOYED_OPEN_EXACT.includes(pathname)) return true;
  return DEPLOYED_OPEN_PREFIXES.some((p) => underPrefix(pathname, p));
}

/**
 * 로컬에서 게이트를 거치지 않는 정적 자산. middleware matcher가 배포본 차단을 위해
 * 전 경로를 받게 되면서, 로컬 동작을 예전(matcher에서 제외)과 같게 유지하려고 둔다.
 * 자산까지 막으면 암호 화면 자신이 스타일 없이 뜬다.
 */
const LOCAL_ASSET_PREFIXES = ["/_next/static", "/_next/image"];
const LOCAL_ASSET_EXACT = ["/favicon.ico", "/robots.txt"];

export function isLocalAsset(pathname: string): boolean {
  if (LOCAL_ASSET_EXACT.includes(pathname)) return true;
  return LOCAL_ASSET_PREFIXES.some((p) => underPrefix(pathname, p));
}

/**
 * 쿠키에 담을 값. 암호 원문을 쿠키에 넣지 않는다.
 * Edge(middleware)와 Node(라우트) 양쪽에 있는 Web Crypto만 쓴다 — `node:crypto`를 쓰면
 * middleware가 번들되지 않는다.
 */
export async function gateToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`adpilot-gate-v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 길이로 조기 종료하지 않는 비교. 해시끼리 비교하므로 길이는 항상 같다. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * 배포된 환경인가(Vercel 위에서 도는가). `VERCEL`은 Vercel이 자동으로 넣는다.
 * preview 배포도 URL만 알면 열리므로 production만 보지 않는다.
 * 배포/로컬 판정의 정본이다 — `claudeCli.isLocalEnvironment`도 이것을 뒤집어 쓴다.
 */
export function isDeployed(env: Record<string, string | undefined> = process.env): boolean {
  return !!env.VERCEL;
}

/**
 * 이 요청이 게이트를 통과하는가.
 *
 * ⚠️ 암호 미설정의 뜻이 환경에 따라 반대다.
 *  - 로컬: 게이트 없음 → 통과(`CRON_SECRET`·`ADMIN_API_TOKEN`과 같은 개발 편의)
 *  - 배포: **거부.** 여기서 통과시키면 암호를 등록하기 전에 배포한 순간 전 화면이 열린다 —
 *    게이트를 붙인 이유가 그 노출을 막는 것이었으므로 기본값은 거부다. 다만 2026-10-17부터
 *    배포본은 middleware가 이 게이트보다 먼저 `deployedPathAllowed` 밖 경로를 404로 닫으므로
 *    (암호 화면 `/gate`도 404), 배포에서 이 분기는 마지막 방어선으로만 남는다.
 */
export async function gateOpen(
  cookieValue: string | undefined,
  secret: string | undefined,
  deployed = isDeployed()
): Promise<boolean> {
  if (!secret) return !deployed;
  if (!cookieValue) return false;
  return safeEqual(cookieValue, await gateToken(secret));
}

/** 입력한 암호가 맞는가. 원문 비교 대신 해시를 비교해 길이를 흘리지 않는다. */
export async function passwordMatches(input: string, secret: string): Promise<boolean> {
  const [a, b] = await Promise.all([gateToken(input), gateToken(secret)]);
  return safeEqual(a, b);
}
