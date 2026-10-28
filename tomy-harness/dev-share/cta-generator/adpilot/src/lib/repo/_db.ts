// 리포지토리 공통 — DB 씸(seam)·결과 계약·row 값 정규화.
//
// 이 계층의 역할은 **CRUD와 매핑뿐이다.** 판정·계산은 순수함수(strategy.ts·funnelPath.ts·
// keywords.ts)의 몫이다. 여기에 판정을 넣으면 같은 규칙이 두 곳에 생기고, 화면과 DB가
// 다른 답을 말하기 시작한다.
//
// ⚠️ 읽기도 service_role(adminClient)로 한다. anon 키로 읽으면 RLS에 막혀 0행이 오고,
// 실데이터가 DB에 있는데도 조용히 빈 목록으로 폴백한다 — 실제로 그 상태였다
// (2026-08-05 실측: anon 0행 / service_role 120행. 화면은 계속 샘플을 보여주고 있었다).
// data.ts가 같은 이유로 adminClient만 쓴다.
//
// 왜 db를 인자로 받는가: 어댑터의 `fetchImpl`과 같은 이유다 — 실제 Supabase 없이
// "어떤 표에 어떤 컬럼을 보내는가"를 테스트가 확인할 수 있어야 한다.

import { hasSupabase, adminClient } from "../supabase";

export type Db = ReturnType<typeof adminClient>;

export interface RepoOpts {
  db?: Db;
}

/** Supabase 미설정이면 null. 호출부는 읽기에서 빈 배열로, 쓰기에서 noDb()로 답한다 */
export function resolveDb(opts: RepoOpts = {}): Db | null {
  if (opts.db) return opts.db;
  return hasSupabase ? adminClient() : null;
}

export interface WriteResult<T> {
  ok: boolean;
  row?: T;
  /** 저장하지 못한 사유. 화면이 그대로 보여준다 */
  error?: string;
}

/**
 * Supabase 미설정.
 * adminSync의 no-op(`ok:true`)과 달리 **실패로 본다** — 광고비 푸시는 "이 기능 안 씀"이
 * 정상이지만, 사람이 누른 저장이 사라진 건 정상이 아니다. 조용한 성공으로 위장하지 않는다.
 * (기존 API 라우트가 같은 상황에서 501을 내는 것과 같은 판단이다.)
 */
export const NO_DB_ERROR = "Supabase가 연결되지 않아 저장하지 않았어요";

export function noDb<T>(): WriteResult<T> {
  return { ok: false, error: NO_DB_ERROR };
}

export function dbFailed<T>(message: string | undefined): WriteResult<T> {
  return { ok: false, error: message ?? "저장 실패(사유 없음)" };
}

/**
 * 수치 컬럼 정규화 — **미계측(null·undefined)과 0을 섞지 않는다.**
 * 비수치·NaN도 null로 떨군다. 여기서 0으로 채우면 "0건"과 "안 셌다"가 합쳐지고,
 * 그 아래 모수 게이트(ratios·reliability·funnelPath)가 통째로 무력해진다.
 */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : null;
}

/** text 컬럼 정규화 — 공백만 남은 값은 null. 빈 문자열과 null이 섞이면 "비었는가" 판정이 갈린다 */
export function str(v: unknown): string | null {
  if (typeof v !== "string") return v === null || v === undefined ? null : String(v);
  const t = v.trim();
  return t === "" ? null : t;
}

/** jsonb 배열 컬럼 → 배열. 형태가 깨진 값은 빈 배열로 (화면이 map()에서 죽지 않게) */
export function jsonArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * 도메인 id(문자열) → DB identity(정수).
 * 도메인 타입은 id를 문자열로 쓴다(JSONB 시절 `path-uuid` 형태를 그대로 유지). 신규 저장은
 * id가 비어 있고, 그때는 컬럼을 아예 보내지 않아야 identity가 값을 만든다.
 */
export function rowId(id: string | null | undefined): number | null {
  const n = num(id);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}

/** 갱신 시각. 트리거를 두지 않으므로 쓰기 경로가 직접 넣는다 */
export function touched(): string {
  return new Date().toISOString();
}

export interface SaveOpts {
  /** 기존 행이면 DB identity, 신규면 null */
  id: number | null;
  /** 신규 저장의 자연키 충돌 대상. 없으면 순수 INSERT */
  onConflict?: string;
}

/**
 * 행 저장 — **id가 있으면 UPDATE, 없으면 INSERT(또는 자연키 upsert).**
 *
 * ⚠️ 갈라야 하는 이유: 이 스키마의 `id`는 0001부터 0005까지 전부
 * `generated always as identity`다. Postgres는 GENERATED ALWAYS 컬럼에 명시값을 INSERT하면
 * `OVERRIDING SYSTEM VALUE` 없이는 **거부한다**(428C9). 그런데 PostgREST의 upsert는 기존 행
 * 수정이어도 `INSERT ... ON CONFLICT`로 나가므로, id를 payload에 실으면 "고치기"가 통째로
 * 실패한다. 자연키(onConflict)로 갱신되는 표는 id를 안 실어서 우연히 살아 있었지만,
 * id로만 행을 구분하는 표(funnel_maps·tasks·funnel_path_tests)는 수정 경로가 전부 막힌다.
 *
 * UPDATE는 의미적으로도 맞다 — 있는 행을 고치는 것이지 넣는 게 아니다.
 * (2026-08-11 F3·F4·F6 담당이 각자 독립적으로 같은 지점을 지목해 확인됐다.)
 */
export async function saveRow<R>(
  db: Db,
  table: string,
  row: Record<string, unknown>,
  o: SaveOpts
): Promise<{ data: R | null; error?: string }> {
  // identity 컬럼은 어느 경로에서도 payload에 싣지 않는다
  const payload = { ...row };
  delete payload.id;

  const t = db.from(table);
  const q =
    o.id !== null
      ? t.update(payload).eq("id", o.id)
      : o.onConflict
        ? t.upsert(payload, { onConflict: o.onConflict })
        : t.insert(payload);

  const { data, error } = await q.select().single();
  // 행이 안 돌아왔는데 오류도 없는 경우(고칠 행이 이미 지워졌다든지)를 성공으로 넘기지 않는다
  if (error || !data) {
    return { data: null, error: error?.message ?? "고칠 내용을 찾지 못해 저장하지 않았어요" };
  }
  return { data: data as R };
}
