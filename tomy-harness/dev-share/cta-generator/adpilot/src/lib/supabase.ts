import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * 연결 모드 판정(순수). service 키가 있어야만 live다. anon 키만 있으면 RLS에 막혀 0행이 오고
 * 조회부가 그걸 "데이터 없음"으로 읽어 조용히 mock으로 폴백하므로(2026-08-05 실사고),
 * anon만 있는 환경은 처음부터 mock으로 두고 경고를 낸다.
 */
export function resolveSupabaseMode(env: { url: string; anon: string; service: string }): {
  live: boolean;
  warning: string | null;
} {
  if (env.url && env.service) return { live: true, warning: null };
  if (env.url && env.anon) {
    return {
      live: false,
      warning:
        "[supabase] SUPABASE_SERVICE_ROLE_KEY가 없어 mock 모드로 동작한다 — anon 키는 RLS에 막혀 실데이터를 읽지 못한다.",
    };
  }
  return { live: false, warning: null };
}

const mode = resolveSupabaseMode({ url, anon, service });
if (mode.warning) console.warn(mode.warning);

export const hasSupabase = mode.live;

// Next.js App Router가 fetch()를 자동으로 Data Cache에 태운다 — 라우트에 force-dynamic을
// 걸어도 supabase-js 내부 fetch 호출까지는 안 걸러진다(2026-08-04 실측: 저장 직후 재조회가
// 계속 빈 값으로 보임). no-store를 명시해 요청마다 실제 최신값을 받는다.
function noStoreFetch(...args: Parameters<typeof fetch>) {
  const [input, init] = args;
  return fetch(input, { ...init, cache: "no-store" });
}

// 유일한 클라이언트. 읽기도 이걸로 한다 — anon 키로 읽으면 RLS에 막혀 0행이 오고,
// 조회부가 0행을 "데이터 없음"으로 읽어 조용히 샘플로 폴백한다(2026-08-05 실사고).
// anon 전용 팩토리를 두면 다음 사람이 그걸 집어 같은 사고를 반복하므로 두지 않는다.
// service 키가 없으면 anon으로 떨어지지 않고 던진다 — 호출부는 `hasSupabase`로 먼저 mock 분기한다.
export function adminClient() {
  if (!hasSupabase) {
    throw new Error("Supabase service 키가 없다(SUPABASE_SERVICE_ROLE_KEY) — hasSupabase 확인 후 호출할 것");
  }
  return createClient(url, service, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
}
