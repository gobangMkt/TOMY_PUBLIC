// 주간 흐름 — 통합 대시보드 '월간 흐름'의 주 단위 짝. 매주 사람이 해야 하는 일(u-ceo [전주 불러오기]
// 동기화)이 이 화면 하나에 모이도록, 장기 주간 시계열 + 전년동주(52주 전) 대비를 함께 보여준다.
//
// 소스 3개 — WAU(GA4 weeklyWau) · 조회/문의/판매건수(U사장님 지표 원장, u-ceo 자동수집) · 매출(매출 원장).
// 셋 다 이미 다른 화면(통합 대시보드·지표 화면)이 쓰는 헬퍼(sliceMetrics·seriesRevenue)로 만들어진
// 값을 그대로 받는다 — 이 파일은 그 셋을 주 키(일요일 시작)로 합치기만 한다.
import { lastFullWeek, shiftDays, weekShift, weekStartSunday } from './period';
import {
  bucketDailyWeekly,
  weekTotalViews,
  weekTotalInquiries,
  viewToInquiryRate,
  type DailyInquiry,
  type WeeklyInquiry,
} from './inquiries';
import { UBOSS_GROUP, type MonthlyTarget, type RevenueTxn } from './revenue';
import { deltaOf } from './format';

/** 주 라벨 "MM.DD~MM.DD" — 주 선택 드롭다운·기준 주 배지 공용. */
export function weekRangeLabel(from: string): string {
  const md = (iso: string) => `${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`;
  return `${md(from)}~${md(shiftDays(from, 6))}`;
}

/**
 * 최근 N개 완결 주 선택지(값=주 시작일) — 진행 중인 주는 넣지 않는다(반쪽 주에 실적을 넣거나
 * 기준으로 삼으면 안 된다).
 *
 * 🚨 **주간 흐름의 '기준 주'(차트가 보여주는 주)는 이 목록 — 정확히는 [주간 매출 입력]에서 고른
 * 값 — 과 연동된다**(2026-08-10 사용자 요청 "차트를 보여주는 기준 주 => 주간 매출 입력 부분의
 * 주랑 연동시킬 것 — 그게 의식의 흐름에 더 맞음"). 그전엔 두 컨트롤이 각자 다른 주를 가리켜서
 * "방금 입력한 매출이 왜 차트엔 안 보이지"가 났다 — 입력하려고 고른 주를 그대로 보는 게 자연스러운
 * 흐름이라는 지적이었다. `weekly-entry.tsx`(입력 표)와 `weekly-view.tsx`(차트·격자표)가 이 한 벌을
 * 함께 쓴다 — 화면마다 다시 계산하지 말 것.
 */
export function recentWeekOptions(count = 12): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  let cur = lastFullWeek();
  for (let i = 0; i < count; i += 1) {
    out.push({ value: cur.from, label: weekRangeLabel(cur.from) });
    cur = weekShift(cur, -1);
  }
  return out;
}

export type WeekMetricKey = 'wau' | 'views' | 'inquiries' | 'rate' | 'revenue' | 'purchases';

/**
 * 표 열 정의. `scope` = 그 값이 **무엇의 합인지**(2026-08-03 지적 "U사장님 문의수가 안 맞는데?").
 * 실측 대조 결과 값은 원장과 일치했고(07-26주 U사장님 9,839 + U중개사 732 = 10,571 = 일별 합),
 * 어긋나 보인 원인은 **표가 두 채널 합임을 말하지 않은 것**이었다 — u-ceo 화면의 U사장님 단독 값과
 * 비교하면 당연히 다르다. 그래서 열 머리에 범위 꼬리표를 박고 ⓘ에 내역·정본을 적는다.
 */
export const WEEK_METRIC_META: {
  key: WeekMetricKey;
  label: string;
  unit: string;
  format: 'int' | 'won' | 'rate';
  /** 열 머리에 붙는 짧은 범위 꼬리표(없으면 안 붙는다). */
  scope?: string;
  /** ⓘ 툴팁 — 분모·내역·정본 위치. */
  hint?: string;
}[] = [
  { key: 'wau', label: 'WAU', unit: '명', format: 'int', hint: 'GA4 주 순 활성 사용자(유니크라 일별 합으로 만들 수 없습니다). 최근 구간은 GA4에서 바로 읽고, 14개월보다 옛 구간은 적재된 트래픽 원장에서 옵니다.' },
  {
    key: 'views',
    label: '지점 조회수',
    unit: '회',
    format: 'int',
    scope: 'U사장님+U중개사',
    hint: '두 서비스(u-ceo · u-agent.kr) 합계입니다 — u-ceo 화면의 U사장님 단독 값과는 다릅니다. 채널별 내역은 U사장님 › 지표에서 봅니다. 정본 = 지표 원장의 일별 탭.',
  },
  {
    key: 'inquiries',
    label: '지점 문의수',
    unit: '건',
    format: 'int',
    scope: 'U사장님+U중개사',
    hint: '두 서비스(u-ceo · u-agent.kr) 전 채널 합계입니다 — u-ceo 화면의 U사장님 단독 값과는 다릅니다(예: 2026-07-26 주 = U사장님 9,839 + U중개사 732 = 10,571). 정본 = 지표 원장의 일별 탭이고, 주 단위 표는 U사장님 › 지표에서 보정합니다.',
  },
  { key: 'rate', label: '문의율', unit: '%', format: 'rate', hint: '문의수 ÷ 조회수(지점을 본 사람 중 문의한 비율). ⚠️ 월간 흐름의 문의율은 분모가 MAU라 다른 지표입니다.' },
  { key: 'revenue', label: '매출', unit: '원', format: 'won', scope: '고방+U사장님', hint: '매출 원장 건별 합(고방 BM·SNS + U사장님 애드 전부). 사업별로 가른 값은 위 구역 카드에 있습니다. 입력은 이 화면의 주간 매출 입력, 삭제는 고방 › 매출의 건별 원장.' },
  { key: 'purchases', label: '판매 건수', unit: '건', format: 'int', hint: '지점이 광고 상품을 산 건수(u-ceo ADS_COUNT). 우리가 판 건수와 같은 사건입니다. 주 단위 정본은 지표 원장의 주 원장(문의수 탭)이라 U사장님 › 지표의 주간 원장에서 고치면 이 값과 주간 리포트가 함께 바뀝니다. 월 숫자는 날짜 귀속이 필요해 일별 탭 그대로입니다.' },
];

export type WeekRow = { weekStart: string } & Record<WeekMetricKey, number | null>;

/**
 * 주 지표의 소스 결정 — **주 단위는 주 원장('문의수' 탭)이 정본**이고, 일별 원장은 주 원장에
 * 그 주 행이 없을 때만 채운다(`sliceMetrics`의 `overlayWeeklyLedger`와 같은 규칙).
 *
 * 🚨 왜(2026-09-07 지적 "판매건수 77인데 왜 리포트에서는 92라고 뜸?" → "77이 맞다"): 같은 8/30
 * 주가 리포트 92건 · 주간 흐름 77건이었다. 주 원장은 사람이 고치는 곳(U사장님 › 지표 › 주간
 * 원장)인데 그 보정이 일별 탭엔 안 써져서, 일별을 읽는 리포트만 옛 값을 계속 보여줬다.
 * 보정한 값이 화면에 안 나오면 보정 기능이 없는 것과 같아 주 단위 정본을 주 원장으로 모았다.
 * (조회·문의는 두 원장이 같았고 어긋난 건 그 주 판매 건수 하나였다.)
 *
 * ⚠️ **7일이 다 있는 주만 일별로 채운다.** 반쪽 주까지 채우면 확정치인 척 앉는다.
 */
export function resolveWeekLedger(daily: DailyInquiry[], weekly: WeeklyInquiry[]): WeeklyInquiry[] {
  const byWeek = new Map<string, WeeklyInquiry>();
  for (const w of bucketDailyWeekly(daily, weekStartSunday)) {
    if (w.days < 7) continue;
    const { days: _days, ...rest } = w;
    byWeek.set(w.weekStart, rest);
  }
  for (const w of weekly) byWeek.set(w.weekStart, w); // 주 원장이 최종 정본
  return [...byWeek.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function buildWeeklyMatrix(input: {
  weeklyWau: { weekStart: string; wau: number }[];
  weeks: WeeklyInquiry[];
  /** 주 키(일요일 ISO) → 그 주 매출 합계. 없는 주는 매출 원장이 그 주를 아직 안 담고 있다는 뜻. */
  revenueByWeek: Map<string, number>;
  /** 오늘(KST) — 넘기면 진행 중인 주(아직 완결 전)도 포함해 빈 행으로라도 보이게 한다. */
  today?: string;
}): WeekRow[] {
  const keys = new Set<string>();
  input.weeklyWau.forEach((w) => w.weekStart && keys.add(w.weekStart));
  input.weeks.forEach((w) => w.weekStart && keys.add(w.weekStart));
  input.revenueByWeek.forEach((_v, k) => keys.add(k));
  // 진행 중인 주(오늘이 속한 주) — 어느 소스도 아직 안 채웠어도 행이 있어야 "이번 주 입력 필요"를
  // 표에서 바로 보여줄 수 있다(월간 흐름과 같은 이유, 2026-07-31).
  if (input.today) keys.add(weekStartSunday(input.today));

  const wauBy = new Map(input.weeklyWau.map((w) => [w.weekStart, w.wau]));
  const inqBy = new Map(input.weeks.map((w) => [w.weekStart, w]));

  return [...keys]
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort()
    .map((weekStart) => {
      const wau = wauBy.has(weekStart) ? wauBy.get(weekStart)! : null;
      const inq = inqBy.get(weekStart);
      const views = inq ? weekTotalViews(inq) : null;
      const inquiries = inq ? weekTotalInquiries(inq) : null;
      const rate = views !== null && inquiries !== null ? viewToInquiryRate(inquiries, views) : null;
      const revenue = input.revenueByWeek.has(weekStart) ? input.revenueByWeek.get(weekStart)! : null;
      const purchases = inq ? inq.productPurchases : null;
      return { weekStart, wau, views, inquiries, rate, revenue, purchases };
    });
}

/** 전년동주(52주=364일 전) 대비 — 365일이면 요일이 밀려 일~토 경계가 어긋난다(period.ts와 동일 규칙). */
export function yoyOfWeek(rows: WeekRow[], weekStart: string, key: WeekMetricKey): number | null {
  const by = new Map(rows.map((r) => [r.weekStart, r]));
  const cur = by.get(weekStart)?.[key];
  const prev = by.get(shiftDays(weekStart, -364))?.[key];
  if (cur === null || cur === undefined || prev === null || prev === undefined || prev === 0) return null;
  return cur / prev - 1;
}

/**
 * 전년동주(-52)·전주(-1) 대비 — **비율 + 절대 증감 한 벌**(2026-08-03 사용자 확정 규칙).
 * `yoyOfWeek`(비율만)는 기존 호출부·테스트가 쓰므로 남기고, 이 함수가 그 상위집합이다.
 */
export function deltaOfWeek(
  rows: WeekRow[],
  weekStart: string,
  key: WeekMetricKey,
  weeksBack: number,
): { ratio: number | null; diff: number | null } {
  const by = new Map(rows.map((r) => [r.weekStart, r]));
  const cur = by.get(weekStart)?.[key];
  const prev = by.get(shiftDays(weekStart, weeksBack * 7))?.[key];
  return deltaOf(cur, prev);
}

/** 이 주(u-ceo 지표 원장)에 아직 동기화된 값이 없는가 — "[전주 불러오기]가 필요합니다" 배너 판정. */
export function weekNeedsSync(rows: WeekRow[], weekStart: string): boolean {
  const row = rows.find((r) => r.weekStart === weekStart);
  return !row || row.views === null || row.inquiries === null;
}

// ── 주간 매출 입력 ────────────────────────────────────────────────────────────
// 2026-08-03: "통합에서 매주 고방 및 U사장님 필요 데이터를 모두 채울 수 있도록" — 매출 원장에
// 손으로 넣어야 하는 항목이 고방 축(BM·SNS)과 U사장님 축(애드)에 흩어져 있어, 매주 두세 화면을
// 돌아야 한 주가 마감됐다. 이 헬퍼가 '그 주에 무엇이 비어 있는가'를 한 목록으로 만든다.

/**
 * 외부 구글시트에서 주간 자동 동기화되는 항목 — 수기 입력 대상에서 제외한다.
 * (GAS `syncExternalSales()` 시간트리거가 매주 일요일 00시에 원장으로 upsert. gas/Code.gs §SYNC_SOURCES)
 * ⚠️ 여기에 손으로 또 넣으면 다음 동기화가 같은 주를 덮어써 실적이 두 번 잡히거나 사라진다.
 */
export const SYNCED_ITEM_IDS = new Set(['gobangblog', 'billyshort']);

/**
 * 메모 입력을 받는 항목 — 목표 매트릭스에 없는 비정기 매출을 담는 항목(예: 기타매출)은 금액만으로는
 * "이게 뭔지" 원장에서 알 수 없다(2026-09-02 사용자 요청). 정형 항목(배너·오퍼월 등)은 이름 자체가
 * 내역이라 메모칸이 필요 없어 이 목록에 있는 항목에만 입력칸을 낸다.
 */
export const MEMO_ITEM_IDS = new Set(['rev-item']);

export type WeekEntryRow = {
  itemId: string;
  name: string;
  group: string;
  /** 그 주에 원장에 이미 기록된 매출 합계(원). 0원으로 확인한 주도 0이므로 판정은 `entries`로. */
  recorded: number;
  /**
   * 그 주에 이 항목으로 기록된 **원장 행 수**. 0 = 아직 안 채움.
   * ⚠️ `recorded === 0`으로 미입력을 판정하면 **0원으로 확인한 주**가 영원히 미입력으로 남는다
   *    (2026-08-03: 매출 없는 항목도 0원으로 마감할 수 있게 바뀌었다).
   */
  entries: number;
  /** 그 주에 이미 기록된 건수 합계. */
  units: number;
  /** 시트 자동동기화 항목인가 — true면 입력칸 대신 '시트 연동' 안내를 띄운다. */
  synced: boolean;
};

/**
 * 그 주에 매출을 채워야 하는 항목 목록 — 목표 매트릭스의 **매출 항목(track='revenue')** 전부를
 * 행으로 내고, 이미 기록된 금액·건수를 붙인다(무엇이 비었는지 눈으로 바로 보이게).
 *
 * ⚠️ `live` 플래그로 거르지 않는다 — 시트의 수기 Y/N이라 실제 매출과 무관하게 낡아 있고(2026-08-03
 *    실측: live=Y 9개 중 실제 매출 발생은 2개), 그걸로 걸러 버리면 새로 팔기 시작한 항목이 입력
 *    목록에서 조용히 빠진다. 화면은 '기록됨'으로 실제 상태를 보여주는 쪽이 정직하다.
 * ⚠️ 행 순서 = 목표 매트릭스 등장 순서(그 시트가 순서의 정본 — groupsOf와 같은 규칙).
 */
export function weekEntryRows(
  targets: MonthlyTarget[],
  txns: RevenueTxn[],
  week: { from: string; to: string },
): WeekEntryRow[] {
  const rows = new Map<string, WeekEntryRow>();
  for (const t of targets) {
    if (t.track !== 'revenue') continue; // 서브지표(MAU 등) 목표는 매출 입력 대상이 아니다
    if (rows.has(t.itemId)) continue; // 매트릭스는 월마다 1행 → 항목당 첫 행만
    rows.set(t.itemId, {
      itemId: t.itemId,
      name: t.name,
      group: t.group,
      recorded: 0,
      entries: 0,
      units: 0,
      synced: SYNCED_ITEM_IDS.has(t.itemId),
    });
  }
  for (const x of txns) {
    const d = (x.date ?? '').slice(0, 10);
    if (!d || d < week.from || d > week.to) continue;
    const row = rows.get(x.itemId);
    if (!row) continue; // 목표 매트릭스에 없는 항목(폐지된 id 등)은 입력 대상이 아니다
    row.recorded += x.amount ?? 0;
    row.entries += 1;
    row.units += x.units ?? 0;
  }
  return [...rows.values()];
}

/**
 * 아직 그 주 기록이 없는 수기 항목 수 — 헤더에 "N개 미입력"으로 띄운다(시트 연동은 제외).
 * 판정은 금액이 아니라 **행 존재**(`entries`)다 — 0원으로 확인한 항목은 마감된 것으로 본다.
 */
export function pendingEntryCount(rows: WeekEntryRow[]): number {
  return rows.filter((r) => !r.synced && r.entries === 0).length;
}

/**
 * 입력 목록을 **사업 2구획**(고방 / U사장님)으로 가른다(2026-08-04 사용자 요청 "주간 매출입력도
 * 고방·U사장님 구분되게").
 *
 * 왜 2개인가: 실제 group은 `고방 BM`·`고방 SNS`·`U사장님` 3개지만, 이 화면에서 사람이 구분해야 하는
 * 단위는 **어느 사업 것인지**다(달성률·목표가 그 단위로 갈린다 — revenue.ts §UBOSS_GROUP). BM·SNS까지
 * 쪼개면 11행짜리 표에 머리가 4개 붙어 행보다 구분선이 눈에 먼저 든다.
 * ⚠️ 판정은 여기 한 벌만 쓴다 — 화면에서 `group === 'U사장님'`을 손으로 짜면 매출 스코프에서 두 번
 *    겪은 fail-open 사고(허용목록 대신 블록리스트)가 이 화면에도 생긴다.
 * ⚠️ 행이 없는 구획은 내지 않는다(빈 머리만 남으면 "여기 항목이 없다"가 아니라 "덜 불러왔다"로 읽힌다).
 */
export type EntryScopeSection = {
  scope: 'gobang' | 'uboss';
  label: string;
  rows: WeekEntryRow[];
  /** 그 구획의 미입력 수 — 머리에 배지로 띄운다(어느 사업이 남았는지가 먼저 보이게). */
  pending: number;
};

export function entryScopeSections(rows: WeekEntryRow[]): EntryScopeSection[] {
  const of = (scope: 'gobang' | 'uboss') =>
    rows.filter((r) => (scope === 'uboss' ? r.group === UBOSS_GROUP : r.group !== UBOSS_GROUP));
  return (
    [
      { scope: 'gobang' as const, label: '고방' },
      { scope: 'uboss' as const, label: UBOSS_GROUP },
    ]
      .map((s) => {
        const own = of(s.scope);
        return { ...s, rows: own, pending: pendingEntryCount(own) };
      })
      .filter((s) => s.rows.length > 0)
  );
}

/**
 * 구획 안 행을 다시 세부 그룹(고방 BM·SNS)별로 묶는다(2026-08-06 사용자 요청 "고방 하위에서도 구분을
 * 넣어주면 좋겠어 — 구분이 안되니 헷갈려"). 사업 2구획(`entryScopeSections`)은 그대로 두되, 고방
 * 구획처럼 세부 그룹이 둘 이상 섞인 경우에만 화면이 이 블록으로 소제목 구분선을 그린다.
 *
 * 그룹은 **매트릭스에 처음 등장한 순서**로 인코운터되고, 그 그룹의 행 전부를 한데 모은다(원래
 * 매트릭스 순서는 BM·SNS가 뒤섞여 있을 수 있어 — `weekEntryRows`가 매트릭스 등장 순 그대로 내므로
 * — 그룹별로 다시 모아야 "BM 묶음 → SNS 묶음"으로 보인다). 그룹이 하나뿐이면(U사장님) 블록도 하나뿐이라
 * 화면은 `blocks.length > 1`일 때만 소제목을 그린다.
 */
export type EntryGroupBlock = { group: string; rows: WeekEntryRow[] };

export function entryGroupBlocks(rows: WeekEntryRow[]): EntryGroupBlock[] {
  const order: string[] = [];
  const byGroup = new Map<string, WeekEntryRow[]>();
  for (const r of rows) {
    if (!byGroup.has(r.group)) {
      byGroup.set(r.group, []);
      order.push(r.group);
    }
    byGroup.get(r.group)!.push(r);
  }
  return order.map((group) => ({ group, rows: byGroup.get(group)! }));
}

/**
 * 금액 입력칸(**만원 단위**)의 검증 상한 — 이 값을 넘으면 원 단위 오입력으로 본다.
 *
 * 🚨 실제 사고(2026-08-04): 토스 정산달력의 원 단위 값 `19,676,600`을 만원칸에 그대로 넣어
 * **1,967억원**(196,766,000,000)이 원장에 박혔고, 7월 U사장님 매출이 1,968억으로 집계됐다.
 * 화면이 아무 저항 없이 통과시킨 게 원인이라 여기서 막는다. 주 매출 최고치가 3,000만원 대라
 * 10억(=100,000만원)은 정상 입력을 잡아먹지 않는 선이다.
 */
export const MAN_SANITY_MAX = 100_000;

/**
 * 금액 입력값(만원, 문자열) → 검증 결과. **0원은 통과**한다(0원 마감이 정상 동작이라
 * 공란·음수·숫자 아님만 막는다 — inquiries의 validateTxn과 같은 규칙).
 */
export function parseManInput(man: string): { ok: boolean; man?: number; error?: string } {
  const raw = String(man ?? '').replace(/[,\s]/g, '');
  const n = Number(raw);
  if (raw === '' || !Number.isFinite(n) || n < 0) return { ok: false, error: '0 이상의 숫자' };
  if (n > MAN_SANITY_MAX) {
    return { ok: false, error: `원 단위로 넣으신 듯 — 이 칸은 만원 단위입니다(${fmtManHint(n)})` };
  }
  return { ok: true, man: n };
}

/** 오입력 경고에 붙일 힌트 — 넣은 값을 만원으로 환산해 '이 값을 의도했나'를 되묻는다. */
function fmtManHint(n: number): string {
  return `${Math.round(n / 10_000).toLocaleString()}만원을 넣으려던 게 아닌가요?`;
}

/**
 * 입력 단위 — 기본은 만원(기존 동작)이고, 토스 정산달력처럼 원 단위 원본을 그대로 복사해 넣고
 * 싶을 때 '원'으로 바꾼다(2026-08-10 사용자 요청 "금액 입력시 원단위 입력 가능하게 변경").
 *
 * 명시적 토글로 푸는 이유 — 마케팅 채널 월간흐름의 [Paid 표시: 월간/일평균]과 같은 판단이다.
 * 화면이 "숫자가 크다"만 보고 몰래 단위를 바꾸면 방금 본 값과 지금 보는 값이 달라져 헷갈린다.
 * 단위는 사람이 명시적으로 고르고, 저장은 늘 원 단위로 환산해서 나간다.
 */
export type AmountUnit = 'man' | 'won';

/** 원 단위 입력 상한 — 만원 상한(`MAN_SANITY_MAX`)과 같은 값을 원으로 표현한 것(주 매출 최고 3,000만원대). */
export const WON_SANITY_MAX = MAN_SANITY_MAX * 10_000;

/**
 * 항목별 입력 단위 — **전부 '원'**(2026-09-02 사용자 요청 "인스타 및 블로그 등도 지금 입력값이
 * 만원단위로 들어가잖아... 금액 입력은 원단위로 하게 다 바꿔"). 만원 입력은 실제 입금액이 만원
 * 단위로 딱 떨어지지 않을 때(애드포스트 일할계산 등) 자리수를 다시 계산해야 하는 번거로움이 있었다.
 * `AmountUnit`에 'man'이 남아 있는 건 `parseAmountInput`·`parseManInput`의 하위호환(기존 테스트)일
 * 뿐, 이 화면은 이제 이 함수를 통해 어떤 항목이든 'won' 하나로만 받는다.
 */
export function entryUnitOf(_itemId: string): AmountUnit {
  return 'won';
}

/**
 * 금액 입력값 → **원 단위** 검증 결과. `unit`에 따라 원문 그대로(원) 또는 ×10,000(만원)을 적용한다.
 * `parseManInput`은 만원 모드 하위호환(기존 호출부·테스트)으로 그대로 두고, 이 함수가 상위집합이다.
 */
export function parseAmountInput(raw: string, unit: AmountUnit): { ok: boolean; won?: number; error?: string } {
  if (unit === 'man') {
    const r = parseManInput(raw);
    return r.ok ? { ok: true, won: (r.man ?? 0) * 10_000 } : { ok: false, error: r.error };
  }
  const cleaned = String(raw ?? '').replace(/[,\s]/g, '');
  const n = Number(cleaned);
  if (cleaned === '' || !Number.isFinite(n) || n < 0) return { ok: false, error: '0 이상의 숫자' };
  if (n > WON_SANITY_MAX) {
    return { ok: false, error: `금액이 너무 큽니다 — 주 매출이 ${(WON_SANITY_MAX / 100_000_000).toLocaleString()}억원을 넘는 일은 없습니다` };
  }
  return { ok: true, won: n };
}

/**
 * 그 기간에 **매출 입력이 비어 있는 항목 수** — 리포트가 "이 숫자는 아직 덜 채워졌다"고 알리는 근거.
 *
 * 왜 필요한가(2026-08-04): 주간 흐름에는 마감 체크리스트·`N개 미입력` 배지가 있지만 리포트에는
 * 없었다. 리포트는 **그 시점 값을 굳히는 스냅샷**이라, 매출을 아직 안 넣은 주로 만들면 매출·달성률이
 * 실제보다 낮게 박힌 문서가 남는다(그리고 인사이트가 그 낮은 값을 근거로 문장을 쓴다).
 *
 * ⚠️ **기간 안에 온전히 들어오는 주(일~토)만** 센다 — 걸친 주는 그 리포트가 마감할 대상이 아니고,
 *    진행 중인 주는 아직 넣을 수 없다(주간 매출 입력이 완결 주만 목록에 내는 것과 같은 규칙).
 * ⚠️ 판정은 `pendingEntryCount` 한 벌 — 금액이 아니라 **원장 행 존재**다(0원 마감 = 확인된 것).
 */
export function pendingEntriesInRange(
  targets: MonthlyTarget[],
  txns: RevenueTxn[],
  from: string,
  to: string,
): { weeks: number; pending: number } {
  let weeks = 0;
  let pending = 0;
  // 기간 첫날이 낀 주부터 훑되, 시작·끝이 모두 기간 안인 주만 집계한다.
  for (let w = weekStartSunday(from); w <= to; w = shiftDays(w, 7)) {
    const end = shiftDays(w, 6);
    if (w < from || end > to) continue;
    weeks += 1;
    pending += pendingEntryCount(weekEntryRows(targets, txns, { from: w, to: end }));
  }
  return { weeks, pending };
}
