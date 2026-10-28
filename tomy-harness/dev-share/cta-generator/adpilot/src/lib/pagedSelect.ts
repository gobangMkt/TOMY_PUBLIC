// PostgREST 기본 응답 상한(1000행) 넘는 읽기를 끝까지 받는 헬퍼.
//
// ⚠️ `.select()`는 **오류 없이** 1000행에서 조용히 자른다 — 그래서 합계·집계가 일부 행만의 값이 되고도 화면은
// 멀쩡해 보인다(2026-10-16 점검: 소재 일자별 지표 30일 3,722행이 1,000행만 읽혀 소재 소진·클릭·설치가 모자랐다).
// 페이지 사이에서 행이 겹치거나 빠지지 않게 **고유 키(기본 id)로 정렬**해야 한다 — 같은 값이 많은 열(date)로만 정렬하면
// 페이지 경계에서 행이 중복·누락된다.

export const PAGE = 1000;
/**
 * 한 번에 동시에 요청하는 페이지 수. 전체 행 수를 모르니 이만큼 먼저 던지고, 마지막 페이지가 꽉 차 있으면 다음 묶음을 던진다.
 * 예전엔 한 페이지씩 기다려 전 기간 지표(수천 행)가 왕복 수만큼 직렬로 늘어졌다(2026-10-19 묶음 상세 2.5초의 큰 몫).
 * 남는 요청은 묶음당 최대 3개의 빈 페이지뿐이다.
 */
const CONCURRENCY = 4;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * @param page `(from, to)` 범위를 받아 그 페이지를 읽는 함수. 호출마다 새 쿼리를 만들어 `.range(from, to)`를 건다.
 *   예) `(f, t) => db.from("x").select("*").gte("date", d).order("id").range(f, t)`
 * 결과는 항상 페이지 순서대로 붙인다(응답이 먼저 온 순서가 아니라). 오류가 난 페이지 앞까지만 돌려준다.
 */
export async function selectAllPages<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  for (let base = 0; ; base += PAGE * CONCURRENCY) {
    const batch = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => {
        const from = base + i * PAGE;
        return page(from, from + PAGE - 1);
      })
    );
    for (const { data, error } of batch) {
      if (error) return { data: all, error };
      if (!data || data.length === 0) return { data: all, error: null };
      all.push(...data);
      if (data.length < PAGE) return { data: all, error: null };
    }
  }
}
