"use client";

// 관리자 write 요청 공용 헬퍼 — 캠페인 생성·일시중지처럼 실제 매체에 반영되는 요청에
// x-admin-token 헤더를 붙인다. 로그인 시스템이 아니라 "인증 없는 외부 요청이 매체를
// 건드릴 수 있는" 구멍을 막는 최소 장치다 — 토큰은 세션에만 보관해 탭을 닫으면 사라진다.

const TOKEN_KEY = "adpilot_admin_token";

/**
 * 이 요청이 무엇을 하는지 — 프롬프트 문구에 그대로 들어간다.
 *
 * ⚠️ 기본 문구를 모든 요청에 쓰면 안 된다. 주간 원장 보정·예산 기준 등록은 **매체에 나가지 않는
 * 우리 기록**인데, "실제 매체 캠페인에 반영됩니다"라고 물으면 사용자가 광고가 바뀐다고 믿는다
 * (2026-08-24 실사용 확인 — 비고 한 줄 저장에 그 경고가 떴다).
 */
const DEFAULT_REASON = "이 요청은 실제 매체 캠페인에 반영됩니다.";

function getToken(reason: string): string | null {
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = window.prompt(`관리자 토큰을 입력해 주세요 — ${reason}`);
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export async function adminFetch(
  input: string,
  init: RequestInit = {},
  /** 매체에 나가지 않는 요청(원장 보정·설정 저장)은 반드시 자기 문구를 넘긴다 */
  reason: string = DEFAULT_REASON
): Promise<Response> {
  const token = getToken(reason);
  const headers = new Headers(init.headers);
  if (token) headers.set("x-admin-token", token);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    // 저장된 토큰이 틀렸다는 뜻 — 지워서 다음 시도 때 다시 물어보게 한다.
    sessionStorage.removeItem(TOKEN_KEY);
  }
  return res;
}

/**
 * 내부 기록용 요청 — **매체에 아무것도 보내지 않는 것**(목표 예산, 주간 원장 보정)에 쓴다.
 *
 * 왜 갈랐나(2026-08-24 지적 "그냥 일예산 기준 수정하는게 다잖아? 실제 예산 바뀌는거랑 관계도
 * 없는거고"): `adminFetch`는 저장 전에 항상 토큰을 물었는데, 이 요청들은 우리 표에 숫자를 적는
 * 일이라 물을 이유가 없다. 게다가 `ADMIN_API_TOKEN`이 없는 환경에서는 서버가 어차피 통과시키므로
 * 아무 값이나 넣어도 되는 창을 띄우고 있었다 — 보안이 아니라 마찰이었다.
 *
 * 그래서 **먼저 토큰 없이 보내고, 서버가 401을 줄 때만** 묻고 한 번 다시 보낸다.
 * 프로덕션에 토큰이 설정돼 있으면 그때만 창이 뜬다.
 */
export async function internalFetch(
  input: string,
  init: RequestInit = {},
  reason = "이 요청은 내부 기록만 바꿉니다."
): Promise<Response> {
  const saved = sessionStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (saved) headers.set("x-admin-token", saved);

  const res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  // 서버가 토큰을 요구한다 — 이때만 묻는다
  sessionStorage.removeItem(TOKEN_KEY);
  const token = window.prompt(`관리자 토큰을 입력해 주세요 — ${reason}`);
  if (!token) return res;
  sessionStorage.setItem(TOKEN_KEY, token);

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("x-admin-token", token);
  const retry = await fetch(input, { ...init, headers: retryHeaders });
  if (retry.status === 401) sessionStorage.removeItem(TOKEN_KEY);
  return retry;
}
