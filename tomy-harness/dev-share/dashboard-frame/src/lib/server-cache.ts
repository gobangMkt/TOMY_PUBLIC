// 서버 사이드 캐시 — GAS·GA4·시트 왕복(각 2~20초)을 감춰 화면 전환을 즉시화한다.
// globalThis에 저장해 dev HMR 모듈 리로드에도 캐시가 살아남는다(모듈 스코프 변수는 dev에서 매 리로드 초기화됨).
//
// ⚠️ **stale-while-revalidate가 핵심이다**(2026-08-03 재설계). 그전엔 TTL 5분 단순 캐시라
//    "탭을 잠깐 옮겼다 오면 또 몇 초씩 기다린다"가 반복됐다 — 실측 콜드: revenue 2.6s ·
//    inquiries 4.2s · traffic 4.3s, 한 화면이 이걸 4~5개 동시에 부르니 첫 표시가 5초+였다.
//    이제 TTL이 지나도 **낡은 값을 즉시 돌려주고 뒤에서 갱신**한다 → 한 번 본 뒤로는 기다림이 없다.
//    운영자 대시보드라 몇 분 낡은 값이 문제가 되지 않고(정본은 시트·GA4), 쓰기 성공·명시적
//    새로고침(fresh)은 그대로 즉시 무효화되므로 신선도 손해가 없다.
//
// 디스크 영속화(2026-10-06): 서버를 재기동하면 메모리 캐시가 비어 첫 화면마다 GAS를 10~70초 기다렸다.
// 그래서 스냅샷을 `.cache/admin-server-cache.json`에 저장하고 첫 접근 때 읽어 온다. 항목은 원래 시각(at)을
// 그대로 들고 있어 ttl·staleMs 규칙이 똑같이 적용된다(12시간 넘은 건 여전히 새로 받는다).
// JSON 직렬화가 안 되는 항목은 건너뛰고, IO 실패는 삼킨다(경고 1회). 비우려면 파일을 지우고 재기동.
//
// 수명 3단:
//   age < ttlMs     → 그대로 반환(갱신 안 함)
//   age < staleMs    → **즉시 반환 + 백그라운드 갱신**(사용자는 기다리지 않는다)
//   age >= staleMs   → 너무 낡음. 새로 받을 때까지 기다린다(하루 넘게 안 켠 경우)

import fs from 'node:fs';
import path from 'node:path';

declare global {
  // eslint-disable-next-line no-var
  var __adminCache: Map<string, { at: number; data: unknown }> | undefined;
  // eslint-disable-next-line no-var
  var __adminInflight: Map<string, Promise<unknown>> | undefined;
}

const store = (globalThis.__adminCache ??= new Map<string, { at: number; data: unknown }>());
const inflight = (globalThis.__adminInflight ??= new Map<string, Promise<unknown>>());

const PERSIST_DEBOUNCE_MS = 2000;

declare global {
  // eslint-disable-next-line no-var
  var __adminCachePersist: { loaded: boolean; timer?: ReturnType<typeof setTimeout>; warned: boolean } | undefined;
}
const persist = (globalThis.__adminCachePersist ??= { loaded: false, warned: false });

// 테스트(VITEST·NODE_ENV=test)에서는 꺼 둔다. ADMIN_CACHE_PERSIST=1/0으로 강제 가능.
function persistEnabled(): boolean {
  const f = process.env.ADMIN_CACHE_PERSIST;
  if (f === '1') return true;
  if (f === '0') return false;
  return !process.env.VITEST && process.env.NODE_ENV !== 'test';
}

const cacheFile = () =>
  process.env.ADMIN_CACHE_FILE || path.join(process.cwd(), '.cache', 'admin-server-cache.json');

function warnOnce(err: unknown) {
  if (persist.warned) return;
  persist.warned = true;
  console.warn('[server-cache] 디스크 캐시 입출력 실패(무시하고 메모리만 사용):', err);
}

// 첫 접근 때 한 번만 읽는다. 이미 메모리에 있는 키는 덮어쓰지 않는다.
function loadOnce(): void {
  if (persist.loaded || !persistEnabled()) return;
  persist.loaded = true;
  try {
    const parsed = JSON.parse(fs.readFileSync(cacheFile(), 'utf8')) as Record<string, unknown>;
    for (const [k, v] of Object.entries(parsed)) {
      const e = v as { at?: unknown; data?: unknown } | null;
      if (!e || typeof e.at !== 'number' || store.has(k)) continue;
      store.set(k, { at: e.at, data: e.data });
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') warnOnce(err);
  }
}

/** 지금 스냅샷을 즉시 쓴다(임시 파일 → rename). 실패해도 throw하지 않는다. */
export function flushCacheToDisk(): void {
  if (persist.timer) clearTimeout(persist.timer);
  persist.timer = undefined;
  if (!persistEnabled()) return;
  try {
    const parts: string[] = [];
    for (const [k, v] of store) {
      try {
        const s = JSON.stringify({ at: v.at, data: v.data });
        if (s !== undefined) parts.push(`${JSON.stringify(k)}:${s}`);
      } catch {
        // 직렬화 안 되는 항목은 저장하지 않는다
      }
    }
    const file = cacheFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `{${parts.join(',')}}`);
    fs.renameSync(tmp, file);
  } catch (err) {
    warnOnce(err);
  }
}

function schedulePersist(): void {
  if (!persistEnabled() || persist.timer) return;
  persist.timer = setTimeout(flushCacheToDisk, PERSIST_DEBOUNCE_MS);
  persist.timer.unref?.();
}

/** 테스트용: 로드 상태·타이머·경고 플래그를 초기화한다. */
export function resetPersistenceForTest(): void {
  if (persist.timer) clearTimeout(persist.timer);
  persist.timer = undefined;
  persist.loaded = false;
  persist.warned = false;
}

// 낡은 값을 그대로 써도 되는 상한. 이걸 넘으면 기다려서라도 새로 받는다.
// 12시간 = 하루 안에 다시 열면 항상 즉시 뜬다(그 사이 값은 백그라운드로 최신화된다).
const DEFAULT_STALE_MS = 12 * 60 * 60 * 1000;

// key별 실제 왕복 1회 — 같은 key를 동시에 요청하면 진행 중 Promise를 공유해 중복 왕복을 막는다.
function run<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const flying = inflight.get(key);
  if (flying) return flying as Promise<T>;
  const p = (async () => {
    const data = await fn();
    store.set(key, { at: Date.now(), data });
    schedulePersist();
    return data;
  })();
  inflight.set(key, p);
  // finally로 지운다 — 실패해도 잠금이 남으면 그 key가 영원히 막힌다.
  void p.catch(() => undefined).finally(() => inflight.delete(key));
  return p;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  fresh: boolean,
  fn: () => Promise<T>,
  staleMs: number = DEFAULT_STALE_MS,
): Promise<T> {
  loadOnce();
  if (fresh) return run(key, fn); // 명시적 새로고침·쓰기 후 — 최신을 기다린다

  const hit = store.get(key);
  if (hit) {
    const age = Date.now() - hit.at;
    if (age < ttlMs) return hit.data as T;
    if (age < staleMs) {
      // 낡았지만 쓸 만하다 → 지금 값을 주고 갱신은 뒤에서. 실패해도 화면은 이미 그려졌다.
      void run(key, fn).catch(() => undefined);
      return hit.data as T;
    }
  }
  return run(key, fn);
}

// 접두사로 시작하는 캐시 키 무효화 (쓰기 성공 시 해당 도메인 갱신 유도).
export function invalidate(prefix: string): void {
  loadOnce(); // 먼저 읽어 둬야 지운 키가 디스크에서 되살아나지 않는다
  let removed = false;
  for (const k of [...store.keys()]) {
    if (k.startsWith(prefix)) {
      store.delete(k);
      removed = true;
    }
  }
  if (removed) schedulePersist();
}
