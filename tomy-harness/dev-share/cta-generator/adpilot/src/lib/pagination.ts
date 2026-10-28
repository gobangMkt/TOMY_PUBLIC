// 클라이언트 표 페이지 나누기 — 필터·정렬을 거친 뒤의 행을 자른다(소재 비교 4탭, 2026-10-16).
// 순수 함수만 둔다. 상태(지금 페이지)는 화면이 들고, 무엇이 바뀌면 1쪽으로 돌아가는지는 resetKey가 말한다.

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 25;

export function isPageSize(v: unknown): v is PageSize {
  return PAGE_SIZES.includes(Number(v) as PageSize);
}

export interface Paged<T> {
  rows: T[];
  /** 범위 밖 요청은 마지막 쪽으로 당긴다 — 행이 줄어 빈 쪽을 보는 일이 없게 */
  page: number;
  pageCount: number;
  total: number;
  /** 1부터 세는 표시용 범위. 행이 없으면 0–0 */
  from: number;
  to: number;
}

export function paginate<T>(rows: readonly T[], page: number, size: number): Paged<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (p - 1) * size;
  const slice = rows.slice(start, start + size);
  return {
    rows: slice,
    page: p,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
  };
}

/** 조건(필터·정렬·탭·쪽 크기)이 바뀌면 1쪽으로 — 다른 목록의 3쪽을 보고 있게 되는 걸 막는다 */
export function pageAfterKeyChange(prevKey: string, nextKey: string, page: number): number {
  return prevKey === nextKey ? page : 1;
}

/**
 * 쪽 번호 줄 — 처음·끝·현재 주변만 남기고 사이는 'gap'. 쪽이 7개 이하면 전부.
 * 예: 현재 5 / 10쪽 → 1 … 4 5 6 … 10
 */
export function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const keep = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => keep.add(n));
  const nums = Array.from(keep)
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export type PageCheckState = "none" | "some" | "all";

/** 지금 쪽의 행이 얼마나 골라졌는지 — 머리 체크박스의 켜짐/부분(대시)/꺼짐 */
export function pageCheckState(checked: readonly string[], pageIds: readonly string[]): PageCheckState {
  if (pageIds.length === 0) return "none";
  const set = new Set(checked);
  const n = pageIds.filter((id) => set.has(id)).length;
  if (n === 0) return "none";
  return n === pageIds.length ? "all" : "some";
}

/**
 * 머리 체크박스 — 지금 쪽만 대상으로. 다 골라져 있으면 이 쪽만 풀고, 아니면 빠진 것만 더한다.
 * 다른 쪽에서 고른 것은 건드리지 않고, 이미 고른 순서도 지킨다(`pickedTargets`가 고른 순서를 쓴다).
 *
 * `max`가 있으면 전체 선택 수가 그 값을 넘지 않게 앞에서부터 채운다. 상한이 차서 이 쪽을 다 못 골랐을
 * 때(일부만 선택)도 한 번 더 누르면 이 쪽을 푼다 — 안 그러면 머리 체크박스가 더는 못 담고 풀지도 못한다.
 */
export function togglePageChecked(
  checked: readonly string[],
  pageIds: readonly string[],
  max = Number.POSITIVE_INFINITY
): string[] {
  const state = pageCheckState(checked, pageIds);
  if (state === "all" || (state === "some" && checked.length >= max)) {
    const drop = new Set(pageIds);
    return checked.filter((id) => !drop.has(id));
  }
  const set = new Set(checked);
  const room = Math.max(0, max - checked.length);
  return [...checked, ...pageIds.filter((id) => !set.has(id)).slice(0, room)];
}
