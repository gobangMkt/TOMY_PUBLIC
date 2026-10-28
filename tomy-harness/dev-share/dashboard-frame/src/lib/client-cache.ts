'use client';

// 클라이언트 JSON 캐시 — **라우트를 옮길 때 같은 원장을 처음부터 다시 받는 것**을 없앤다.
//
// 🚨 왜 필요한가(2026-08-11 실측). 화면을 옮기면 그 화면의 데이터 훅이 새로 마운트되며 무조건
//    fetch부터 다시 한다. `/api/revenue` 하나를 8개 화면이 각자 부르고, 주간↔월간↔OKR을 오갈 때마다
//    같은 원장을 매번 새로 받아 파싱하고 파생값을 다시 만든다. 서버는 이미 stale-while-revalidate
//    캐시(`server-cache.ts`)로 80ms에 돌려주지만, **전송(최대 1.5MB)·JSON.parse·재계산은 전환마다
//    그대로 낸다.** 그래서 실측에서 dev 재방문(PASS2 평균 7.4초)이 콜드(PASS1)보다 오히려 느렸다 —
//    재방문 이득이 0이었다. 서버 캐시의 클라이언트 짝이 비어 있던 것이 구조적 공백이다.
//
// 수명 3단(`server-cache.ts`와 같은 계약, 숫자만 짧다):
//   age < TTL    → 네트워크 0. 캐시 그대로 즉시 반환.
//   age < STALE  → 즉시 캐시 반환 + **배경 갱신**. 내용이 바뀌었으면 구독자에게 알린다.
//   age >= STALE → 너무 낡음. 새로 받을 때까지 기다린다.
//
// ⚠️ **배경 갱신 결과가 직전과 같으면 알리지 않는다**(응답 원문 문자열 비교). 내용이 같아도 새 객체로
//    갈아끼우면 그 값을 쓰는 표·차트가 통째로 다시 그려져 전환마다 수십~수백 ms를 까먹는다
//    (메일허브 2026-08-11에서 같은 함정을 실측했다 — 그 규칙을 여기에 그대로 적용).
//
// ⚠️ **`fresh=1` URL은 캐시하지 않고, 받은 값을 '보통 URL' 키에 심는다.** 그러지 않으면 새로고침
//    버튼이 자기 전용 캐시 항목(`?fresh=1`)을 만들어 두 번째 새로고침이 캐시 히트로 무시된다.

import { useEffect, useState } from 'react';

const TTL_MS = 60_000;
const STALE_MS = 12 * 60 * 60 * 1000;

type Entry = { at: number; raw: string; data: unknown };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<(key: string) => void>();

/** 캐시 키 = `fresh=1`을 뺀 URL. 새로고침으로 받은 값이 보통 조회의 캐시를 갱신하게 만든다. */
export function cacheKeyOf(url: string): string {
  return url
    .replace(/([?&])fresh=1(&|$)/, (_m, p1: string, p2: string) => (p2 === '&' ? p1 : ''))
    .replace(/[?&]$/, '');
}

const isFreshUrl = (url: string) => /[?&]fresh=1(&|$)/.test(url);

function notify(key: string) {
  for (const l of listeners) l(key);
}

function pull<T>(url: string): Promise<T> {
  const flying = inflight.get(url);
  if (flying) return flying as Promise<T>; // 같은 URL 동시 요청 = 왕복 1회(화면 두 곳이 같은 원장을 부를 때)
  const key = cacheKeyOf(url);
  const p = (async () => {
    const res = await fetch(url, { cache: 'no-store' });
    const raw = await res.text();
    const data = JSON.parse(raw) as T; // 비 JSON이면 throw — 호출부의 기존 catch가 그대로 동작한다
    const prev = store.get(key);
    store.set(key, { at: Date.now(), raw, data });
    if (prev?.raw !== raw) notify(key);
    return data;
  })();
  inflight.set(url, p);
  p.then(
    () => {
      if (inflight.get(url) === p) inflight.delete(url);
    },
    () => {
      // 실패한 요청의 잠금이 남으면 그 URL이 영원히 막힌다(server-cache와 같은 규칙).
      if (inflight.get(url) === p) inflight.delete(url);
    },
  );
  return p;
}

/**
 * `fetch(url).then(r => r.json())`의 자리를 그대로 대신한다 — 호출부는 한 줄만 바뀐다.
 *
 * 제네릭 기본값이 `any`인 이유: 대체 대상인 `res.json()`이 `any`를 돌려주므로, 기존 호출부를
 * 타입 주석 없이 그대로 옮길 수 있어야 한다(교체 diff를 최소화 = 사고 여지 최소화).
 * 새로 쓰는 코드는 응답 타입을 명시할 것.
 *
 * @param opts.fresh 서버 캐시까지 우회하는 새로고침. URL에 `fresh=1`이 들어 있으면 자동으로 참.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cachedJson<T = any>(url: string, opts: { fresh?: boolean; ttlMs?: number } = {}): Promise<T> {
  const { ttlMs = TTL_MS } = opts;
  if (opts.fresh || isFreshUrl(url)) return pull<T>(url);
  const hit = store.get(cacheKeyOf(url));
  if (!hit) return pull<T>(url);
  const age = Date.now() - hit.at;
  if (age < ttlMs) return Promise.resolve(hit.data as T);
  if (age < STALE_MS) {
    void pull<T>(url).catch(() => {}); // 배경 갱신 — 사용자는 기다리지 않는다
    return Promise.resolve(hit.data as T);
  }
  return pull<T>(url);
}

/** 캐시에 이미 있는 값(동기). 훅이 초기 state를 채워 '로딩 스켈레톤 깜빡임'을 없앨 때 쓴다. */
export function peekJson<T>(url: string): T | undefined {
  return store.get(cacheKeyOf(url))?.data as T | undefined;
}

/** 해당 prefix로 시작하는 캐시를 버린다(쓰기 성공 후). */
export function invalidateJson(prefix: string): void {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      notify(key);
    }
  }
}

/** 테스트·로그아웃용 전체 비우기. */
export function clearJsonCache(): void {
  store.clear();
  inflight.clear();
}

/**
 * 배경 갱신으로 **내용이 바뀐** URL이 생기면 카운터가 오른다. 훅은 이 값을 effect deps에 넣어
 * 데이터를 다시 조립한다(그때 `cachedJson`은 캐시 히트라 네트워크가 없다).
 *
 * prefix로 구독한다 — 훅이 조회 URL을 effect 안에서 만드는 경우가 많아 정확한 URL을 밖에서 알 수
 * 없다. 과잉 통지(같은 API의 다른 쿼리가 갱신돼도 깨어남)는 감수한다: 깨어나도 캐시 히트라 값싸고
 * 결과는 같다(멱등).
 */
export function useJsonVersion(prefixes: string[]): number {
  const key = prefixes.join('|');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const want = key ? key.split('|') : [];
    if (!want.length) return;
    const l = (k: string) => {
      if (want.some((p) => k.startsWith(p))) setVersion((n) => n + 1);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [key]);
  return version;
}

// ─────────────────────────────────────────────────────────────────────────────
// 쓰기 성공 시 캐시 무효화 — **호출부에 맡기지 않는다**
//
// 🚨 이 프로젝트에서 "쓰기 성공하면 X도 해라"를 호출부에 복붙해 뒀다가 한 곳을 빠뜨려 사고가 난
//    전례가 있다(분양 캐시 무효화 핑, 메일허브 2026-08-04 DB 미러). 쓰기 경로는 앞으로도 늘어나니
//    가장 낮은 층(fetch 자체)에서 한 번에 처리한다 — 규약을 사람 손에 맡기면 반드시 무너진다.
//
// 무효화 범위는 `/api/<첫 세그먼트>` — 예: POST `/api/revenue/neoflat` → `/api/revenue*` 전부.
// 넓게 버리는 쪽이 안전하다(최악 = 다음 조회 1회가 서버 캐시를 다시 타는 것, 80ms).
export function apiRootOf(raw: string): string | null {
  try {
    const path = raw.startsWith('http') ? new URL(raw).pathname : raw.split('?')[0];
    const m = /^(\/api\/[^/?]+)/.exec(path);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __adminFetchPatched: boolean | undefined;
}

if (typeof window !== 'undefined' && !globalThis.__adminFetchPatched) {
  globalThis.__adminFetchPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await original(input, init);
    const method = (
      init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET')
    ).toUpperCase();
    if (method !== 'GET' && res.ok) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      const root = apiRootOf(url);
      if (root) invalidateJson(root);
    }
    return res;
  };
}
