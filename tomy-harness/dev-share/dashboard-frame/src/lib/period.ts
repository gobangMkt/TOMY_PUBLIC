// 기간 해석 공용 — 대시보드/리포트 API가 공유. current + previous(비교기간) 계산.
export type Compare = 'prev' | 'yoy' | 'none';
export type DateRange = { from: string; to: string };

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const shiftYear = (s: string, n: number) => {
  const d = parse(s);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return iso(d);
};

// 기본 기간 = 최근 28일(어제 기준). from/to는 ISO 절대날짜(YYYY-MM-DD)만.
export function resolveRanges(
  fromQ: string | null,
  toQ: string | null,
  compare: Compare,
): { current: DateRange; previous: DateRange | null } {
  const yesterday = new Date(Date.now() - DAY);
  const to = toQ || iso(yesterday);
  const from = fromQ || iso(new Date(parse(to).getTime() - 27 * DAY));
  const current = { from, to };

  if (compare === 'none') return { current, previous: null };
  if (compare === 'yoy') return { current, previous: { from: shiftYear(from, -1), to: shiftYear(to, -1) } };

  const len = Math.round((parse(to).getTime() - parse(from).getTime()) / DAY) + 1;
  const prevTo = new Date(parse(from).getTime() - DAY);
  const prevFrom = new Date(prevTo.getTime() - (len - 1) * DAY);
  return { current, previous: { from: iso(prevFrom), to: iso(prevTo) } };
}

// ── 주 경계 = 일~토 (사용자 확정 2026-07-27) ────────────────
// 이 프로젝트의 '주'는 전부 일요일 시작·토요일 끝이다(revenue.ts weekStartISO·isoWeekStart와 동일).
// ⚠️ weekly-report.ts만 예외 — 월 목표를 ISO 주(월~일) 수로 균등 환산하는 별개 계산이라
//    그 파일은 월요일 시작을 유지한다(주간리포트 화면 전용, 파일 상단 주석 참조).

// KST 기준 오늘(YYYY-MM-DD). UTC로 계산하면 KST 오전 9시 전에 하루 밀려 주 경계가 어긋난다.
export function todayKST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}

// UTC 기준 오늘(YYYY-MM-DD). Clarity·트래킹/리드 원장의 `date`는 UTC 날짜라(KST 아님, clarity.ts
// 주석 참고) 그 경계와 맞춰 비교해야 한다 — todayKST()로 비교하면 최대 9시간 어긋난다.
export function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function shiftDays(isoDate: string, delta: number): string {
  const d = parse(isoDate);
  d.setUTCDate(d.getUTCDate() + delta);
  return iso(d);
}

// 오늘(진행 중이라 집계 미완결)은 기본값에서 뺀다 — 상한을 어제로 낮춘다. 이미 어제 이전이면 그대로.
// ⚠️ 달력에서 명시적으로 오늘을 고르는 길까지 막지는 않는다 — 그건 호출부가 원래 maxDate를 그대로
// 쓰는 쪽(달력 disabled 경계, '오늘' 프리셋)이 맡는다. 여기는 '기본값' 계산에만 쓸 것.
export function excludeToday(date: string, today: string = todayKST()): string {
  return date && date >= today ? shiftDays(today, -1) : date;
}

// 추이 차트가 덮는 기간 = 최근 6개월(5개월 전 1일 ~ 어제). 대시보드·리포트가 공유하는 창.
// 서버(API route)에서도 써야 해서 순수 모듈인 여기 둔다 — `components/metrics/use-metrics.ts`의
// 동명 함수는 'use client' 모듈이라 route에서 import하면 안 된다.
// ⚠️ 왜 6개월인가: 소스별 '가진 전부'를 그리면 문의 원장 43개월·GA4 12개월·매출 3~7개월로 차트마다
//    x축 길이가 달라 비교가 안 되고, 주 버킷 186개는 막대 폭이 1~2px가 된다. 6개월 = 주 26점 / 월 6점.
export function sixMonthRange(today: string = todayKST()): DateRange {
  const [y, m] = today.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 - 5, 1));
  return { from: iso(first), to: shiftDays(today, -1) };
}

// 그 날짜가 속한 주의 일요일.
export function weekStartSunday(isoDate: string): string {
  const d = parse(isoDate);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // 일=0
  return iso(d);
}

// 직전에 '끝난' 주(일~토). 오늘이 속한 주는 아직 진행 중이라 제외한다
// — 진행 중 주를 넣으면 '지난주 WAU'가 매일 커지는 반쪽 숫자가 된다.
export function lastFullWeek(today: string = todayKST()): DateRange {
  const from = shiftDays(weekStartSunday(today), -7);
  return { from, to: shiftDays(from, 6) };
}

// GA4 yearWeek('YYYYWW') → 그 주의 일요일 ISO.
// GA4 주도 일요일 시작이고 "1월 1일은 항상 week 01"이다 → week 01의 일요일 = 1/1 직전(포함) 일요일,
// week N = 거기서 (N-1)주 뒤. 실측 대조: 2026 week 30 = 2026-07-19(활성 61,930, 어드민 지난주 값과 일치).
// ⚠️ 연초/연말엔 같은 물리적 주가 202553·202601 두 행으로 쪼개져 온다(둘 다 이 함수로는 같은 일요일).
//    반쪽짜리라 합치면 유니크가 아니다 → cleanWeeklyWau가 그런 주를 버린다.
export function weekStartFromYearWeek(yearWeek: string): string | null {
  if (!/^\d{6}$/.test(yearWeek)) return null;
  const week = Number(yearWeek.slice(4, 6));
  if (week < 1 || week > 53) return null;
  return shiftDays(weekStartSunday(`${yearWeek.slice(0, 4)}-01-01`), (week - 1) * 7);
}

// 주 범위를 n주 앞으로 이동(전주 대비용: weekShift(lastFullWeek(), -1)).
export function weekShift(range: DateRange, weeks: number): DateRange {
  return { from: shiftDays(range.from, weeks * 7), to: shiftDays(range.to, weeks * 7) };
}

// 기간에 걸친 주(일~토)/월의 개수 — '주평균·월평균' 카드의 분모.
// 가장자리가 반쪽인 주·달도 1개로 센다(매출 추이 버킷이 그렇게 그려지므로 분모도 같게 맞춘다).
export function unitsInRange(from: string, to: string, unit: 'week' | 'month'): number {
  if (!from || !to || from > to) return 0;
  if (unit === 'month') {
    const [fy, fm] = from.slice(0, 7).split('-').map(Number);
    const [ty, tm] = to.slice(0, 7).split('-').map(Number);
    return (ty - fy) * 12 + (tm - fm) + 1;
  }
  let n = 0;
  for (let w = weekStartSunday(from); w <= to; w = shiftDays(w, 7)) n += 1;
  return n;
}

/**
 * 전년동기 범위. **주 정렬을 지키려고 364일(=52주) 전으로 평행 이동**한다.
 *
 * ⚠️ 365일이 아니다: 365를 빼면 요일이 하루 밀려 일~토 주가 월~일이 되고, 이 프로젝트의 주 경계
 * (일~토)와 어긋나 "전년 같은 주"가 절반씩 두 주에 걸친다.
 * 단 **범위가 달 전체와 정확히 일치하면 전년 같은 달 전체**로 준다(달은 요일이 아니라 날짜로 읽는
 * 단위이고, 364일 이동은 7월 1~31일을 6월 말~7월 말로 어긋내 월 비교를 깨뜨린다).
 */
export function prevYearRange({ from, to }: DateRange): DateRange {
  const lastDayOf = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  };
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const wholeMonth =
    sameMonth && from.endsWith('-01') && Number(to.slice(8)) === lastDayOf(from.slice(0, 7));
  if (wholeMonth) {
    const ym = `${Number(from.slice(0, 4)) - 1}-${from.slice(5, 7)}`;
    return { from: `${ym}-01`, to: `${ym}-${String(lastDayOf(ym)).padStart(2, '0')}` };
  }
  return { from: shiftDays(from, -364), to: shiftDays(to, -364) };
}

// 이번 달 1일 ~ 오늘(KST). 매출 '이번달' 카드 기준.
export function thisMonthToDate(today: string = todayKST()): DateRange {
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

// 일요일 ISO → GA4 yearWeek('YYYYWW'). weekStartFromYearWeek의 역함수.
// 연도 판정 = **그 주 토요일이 속한 해**. 연말에 걸친 주(2025-12-28~2026-01-03)를 GA4는
// 202553·202601 두 행으로 보내지만 화면 라벨은 하나여야 하므로 뒤쪽 해(202601)로 고정한다
// — week 53을 만들지 않는 대신 weekStartFromYearWeek(yearWeekOf(w)) === w 왕복은 유지된다.
export function yearWeekOf(weekStart: string): string {
  const year = shiftDays(weekStart, 6).slice(0, 4);
  const anchor = weekStartSunday(`${year}-01-01`);
  const week = Math.round((Date.parse(`${weekStart}T00:00:00Z`) - Date.parse(`${anchor}T00:00:00Z`)) / 604_800_000) + 1;
  return `${year}${String(week).padStart(2, '0')}`;
}

const mdLabel = (isoDate: string) => `${Number(isoDate.slice(5, 7))}.${Number(isoDate.slice(8, 10))}`;

// ── 통합 대시보드 주/월 셀렉터 ────────────────────
// 진행 중인 주·달은 목록에 넣지 않는다 — 반쪽 실적으로 달성률을 읽으면 항상 미달로 보인다.
export type WeekOption = { weekStart: string; weekEnd: string; yearWeek: string; label: string };

export function weekOptions(limit = 52, today: string = todayKST()): WeekOption[] {
  const out: WeekOption[] = [];
  let cur = lastFullWeek(today);
  for (let i = 0; i < limit; i += 1) {
    const yw = yearWeekOf(cur.from);
    out.push({
      weekStart: cur.from,
      weekEnd: cur.to,
      yearWeek: yw,
      // 주차 번호만으로는 며칠인지 안 떠올라 실제 날짜를 같이 싣는다(사용자 요청 2026-07-28).
      label: `${yw.slice(2, 4)}-${Number(yw.slice(4, 6))}W · ${mdLabel(cur.from)}~${mdLabel(cur.to)}`,
    });
    cur = weekShift(cur, -1);
  }
  return out;
}

export type MonthOption = { month: string; from: string; to: string; label: string };

export function monthOptions(limit = 12, today: string = todayKST()): MonthOption[] {
  const out: MonthOption[] = [];
  let cur = lastMonthFull(today);
  for (let i = 0; i < limit; i += 1) {
    const month = cur.from.slice(0, 7);
    out.push({ month, from: cur.from, to: cur.to, label: `${month.slice(2)}` });
    cur = lastMonthFull(cur.from); // 그 달 1일의 '지난 달' = 한 달 더 앞
  }
  return out;
}

// 지난 달 전체(1일~말일).
export function lastMonthFull(today: string = todayKST()): DateRange {
  const [y, m] = today.slice(0, 7).split('-').map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const month = `${prevY}-${String(prevM).padStart(2, '0')}`;
  const last = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}
