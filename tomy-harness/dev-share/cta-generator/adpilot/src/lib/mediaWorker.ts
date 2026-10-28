// 미디어허브 일꾼(127.0.0.1:3025) 호출 — 서버 전용. 스펙 2차의 나누는 축: 판단·조회는 AdPilot, 제작·발행·스케줄·수집은 일꾼.
// AdPilot 라우트는 일꾼이 할 일(구글 실적 수집·색인 확인·글감 넣기·묶음 노출 수집)만 여기로 넘기고, 판정은 하지 않는다.
// 일꾼이 꺼져 있으면 던지지 않고 { off: true }를 돌려준다 — 화면은 "일꾼 꺼짐"을 상태로 보이고 판단 화면은 그대로 돈다.
// 주소를 env로 빼지 않는다: 일꾼은 127.0.0.1에만 묶여 있어 다른 곳을 가리킬 일이 없다(옛 /media iframe과 같은 이유).
// 검수 서버는 MEDIA_WORKER_URL로 다른 포트(3125, 임시 원장)를 가리킬 수 있다 — 운영 원장·발행을 건드리지 않게.

import type { PublishedRow } from "./owned/insightRules";

export const MEDIA_WORKER_URL = process.env.MEDIA_WORKER_URL || "http://127.0.0.1:3025";

export interface WorkerResult<T> {
  ok: boolean;
  /** 일꾼에 닿지 못함(꺼짐·시간초과) */
  off: boolean;
  status: number;
  data: T | null;
  /** 일꾼이 돌려준 사유(사람이 읽는 문장) 또는 연결 실패 사유 */
  error?: string;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, timeoutMs = 15_000): Promise<WorkerResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${MEDIA_WORKER_URL}${path}`, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const detail = data && typeof data === "object" ? (data as { detail?: unknown }).detail : null;
      return { ok: false, off: false, status: res.status, data: null, error: typeof detail === "string" ? detail : `미디어허브 수집기 오류 (${res.status})` };
    }
    return { ok: true, off: false, status: res.status, data: data as T };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      off: true,
      status: 0,
      data: null,
      error: aborted ? "미디어허브 수집기가 제때 답하지 않았어요" : "미디어허브 수집기가 꺼져 있어요",
    };
  } finally {
    clearTimeout(timer);
  }
}

export const workerGet = <T>(path: string, timeoutMs?: number) => call<T>("GET", path, undefined, timeoutMs);
export const workerPost = <T>(path: string, body: unknown = {}, timeoutMs?: number) => call<T>("POST", path, body, timeoutMs);

export interface LedgerRefs {
  published: PublishedRow[];
  runs: { id: number; title: string }[];
  /** CTA 리다이렉트 주소 앞부분(공개 주소, 일꾼 설정 CTA_REDIRECT_BASE_URL) */
  cta_redirect_base?: string;
}

let refsCache: { at: number; refs: LedgerRefs } | null = null;
/** 마지막으로 받은 원장 목록. 일꾼이 잠깐 꺼져도 색인 건·우리 글이 목록에서 갑자기 빠지지 않게 이 값을 쓴다 */
let lastGood: { at: number; refs: LedgerRefs } | null = null;
const REFS_TTL_MS = 60_000;
/** 마지막 값을 대신 쓰는 한도. 이보다 오래되면 발행·삭제가 반영되지 않은 목록이라 쓰지 않는다 */
export const REFS_STALE_MAX_MS = 6 * 60 * 60_000;

export interface LedgerRefsResult {
  refs: LedgerRefs | null;
  /** 일꾼에 닿지 못했다(꺼짐·시간초과) */
  off: boolean;
  /** off인데 refs가 있으면 마지막으로 받은 값이다. 그 값을 받은 시각 */
  staleAt?: string;
  error?: string;
}

/**
 * 원장의 발행 글·글(run) 제목. 원장은 일꾼 로컬에만 있어 일꾼이 내려준다.
 * 꺼져 있으면 마지막으로 받은 값(REFS_STALE_MAX_MS 안)을 staleAt과 함께 돌려주고, 그것도 없으면 refs=null.
 * refs=null이면 호출부는 "우리 글" 판정(발행일·색인 지연)이 빠졌다는 것을 상태로 밝힌다.
 */
export async function loadLedgerRefs(now: () => number = Date.now): Promise<LedgerRefsResult> {
  if (refsCache && now() - refsCache.at < REFS_TTL_MS) return { refs: refsCache.refs, off: false };
  const r = await workerGet<LedgerRefs>("/api/insight/ledger-refs", 5_000);
  if (!r.ok || !r.data) {
    if (r.off && lastGood && now() - lastGood.at < REFS_STALE_MAX_MS) {
      return { refs: lastGood.refs, off: true, staleAt: new Date(lastGood.at).toISOString(), error: r.error };
    }
    return { refs: null, off: r.off, error: r.error };
  }
  refsCache = { at: now(), refs: r.data };
  lastGood = refsCache;
  return { refs: r.data, off: false };
}

export function forgetLedgerRefs() {
  refsCache = null;
  lastGood = null;
}

// ── 제작 화면 프록시(스펙 2-6) ─────────────────────────────────────────────
// 제작 화면(글쓰기·2차 발행·원본저장소·채널 연결)은 /api/media/worker/{경로}로 일꾼을 부른다. 아무 경로나 넘기지 않고
// 아래 목록만 통과시킨다 — 원장 저수준(/api/ledger/*)·발행 직행(/publications/{id}/publish)·스케줄러 1회(/scheduler/tick)·
// 주간 tick·노션 poll은 화면에서 부를 일이 없고, 열어 두면 확인창 없이 바깥으로 나가는 문이 하나 더 생긴다.

const PROXY_GET: RegExp[] = [
  /^health$/,
  /^sources$/,
  /^sources\/collectors$/,
  /^runs$/,
  /^runs\/counts$/,
  /^runs\/archived$/,
  /^runs\/\d+$/,
  /^weekly$/,
  /^scheduler$/,
  /^review-queue$/,
  /^spread\/(channels|origins|board)$/,
  /^bundle\/candidates$/,
  /^channels\/status$/,
];

const PROXY_POST: RegExp[] = [
  /^sources\/collect$/,
  /^sources\/url$/,
  /^sources\/paste$/,
  /^sources\/\d+\/dismiss$/,
  /^runs$/,
  /^runs\/\d+\/(resume|cancel|restore|approve)$/,
  /^spread\/create$/,
  /^spread\/publications\/\d+\/(retry|cancel)$/,
  /^bundle\/(suggest|start)$/,
  /^channels\/[a-z0-9_]+\/login$/,
];

/** 제작 화면이 일꾼에 넘겨도 되는 경로인가. path는 `/api/` 뒤 부분(쿼리 없이) */
export function workerProxyAllowed(method: string, path: string): boolean {
  const list = method === "GET" ? PROXY_GET : method === "POST" ? PROXY_POST : [];
  return list.some((re) => re.test(path));
}

/** 글 쓰기·추천처럼 LLM을 기다리는 호출은 길게 잡는다(일꾼이 동기로 돈다) */
export function workerProxyTimeout(method: string, path: string): number {
  if (method === "GET") return 15_000;
  if (/^runs(\/\d+\/resume)?$|^bundle\/(suggest|start)$/.test(path)) return 600_000;
  return 120_000;
}
