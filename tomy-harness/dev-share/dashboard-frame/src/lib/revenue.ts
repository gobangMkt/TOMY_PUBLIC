// 고방 매출 — 타입 · 조합 · 집계.
// 설계(2026-07-20 목표 재구성): 목표(항목×월 매트릭스)와 매출 실적(원장)은 별개 소스.
//   - 목표 매트릭스 = 시트 '목표' 탭(항목×월, YYYY-MM 컬럼) — parseTargets로 MonthlyTarget[] 화.
//     소스 폴백 = src/data/revenue-targets.ts. 대시보드/진행현황 목표는 이 매트릭스 롤업으로 산출.
//   - 매출 원장     = src/data/revenue-txns.ts (건별 거래 append-only; 시트 연결 시 GAS '원장' 탭이 정본)
// 이 파일은 둘을 조합(buildRows)하고 집계(totals)하는 로직만 — 항목·그룹·목표를 하드코딩하지 않는다.

export type RevenueKind = 'sales' | 'adrev'; // 판매형(건수×객단가) | 광고수익형(매출만)

// OKR 트랙 — 목표 매트릭스 행이 "매출 목표"(원 단위)인지 "서브지표 목표"(MAU 등, 건수 단위)인지.
// RevenueKind(판매형/광고수익형)와는 별개 축 — kind는 매출의 성격, track은 목표의 종류.
// 하위호환: 시트에 track 컬럼이 없으면 전부 'revenue'로 취급(parseTargets 참고).
export type RevenueTrack = 'revenue' | 'metric';

// U사장님 그룹 라벨 — 목표 매트릭스 group 값의 정본. 고방(/gobang/*)은 이 그룹을 제외,
// U사장님(/uboss/*)은 이 그룹만 집계(화면단 필터, 라이브러리 로직 불변). 하드코딩 문자열
// 리터럴 중복·오타 방지를 위해 이 파일이 유일한 정의처.
export const UBOSS_GROUP = 'U사장님';

// ── 항목(목표 매트릭스 롤업 결과) ────────────────
// 목표 매트릭스(MonthlyTarget[])를 항목 단위로 롤업한 형태(itemsFromTargets가 생성).
// buildRows/totals/대시보드가 소비. target = 기간 내 월 목표 합.
export type OkrItem = {
  id: string;
  group: string; // 그룹 라벨 (예: '고방 BM' / '고방 SNS') — 고정 아님, 목표 매트릭스가 정의
  bucket: string; // 묶음 (광고 상품판매 / 제휴 상품판매 …)
  name: string;
  kind: RevenueKind;
  track: RevenueTrack; // 'revenue'(매출 목표, 원) | 'metric'(서브지표 목표, 건수)
  target: number; // 해당 기간 목표(원 또는 건수) — 매트릭스 월 목표 합
  live: boolean; // 현재 매출 발생 중 여부(false = 미출시, 자리만)
};

// ── 소스1: 매출 원장 ────────────────
// 정본 단위 = 건별 거래(RevenueTxn). 월×항목 요약(RevenueRecord)은 집계 결과.
export type RevenueTxn = {
  id: string; // 행 식별자 (GAS 발번, 'T###')
  date: string; // 거래일 'YYYY-MM-DD'
  itemId: string; // OKR 항목 id
  memo: string; // 거래처/메모
  units: number | null; // 건수 (adrev/미입력이면 null)
  amount: number; // 금액(원)
};

export type RevenueRecord = {
  itemId: string;
  period: string; // 실적 기간 (예: '2026-07')
  units: number | null; // 판매건수 (adrev면 null)
  arpu: number | null; // 객단가(원) (adrev면 null)
  revenue: number; // 매출액(원)
};

// 건별 거래 → itemId×월(period) 요약. buildRows가 소비하는 RevenueRecord 형태로 반환.
// itemId 없거나 date가 'YYYY-MM' 추출 불가한 행은 제외.
export function aggregateTxns(txns: RevenueTxn[]): RevenueRecord[] {
  const map = new Map<string, { units: number; hasUnits: boolean; revenue: number }>();
  for (const t of txns) {
    const period = (t.date ?? '').slice(0, 7);
    if (!t.itemId || !/^\d{4}-\d{2}$/.test(period)) continue;
    const key = `${t.itemId}|${period}`;
    const cur = map.get(key) ?? { units: 0, hasUnits: false, revenue: 0 };
    cur.revenue += t.amount || 0;
    if (t.units != null) {
      cur.units += t.units;
      cur.hasUnits = true;
    }
    map.set(key, cur);
  }
  return [...map.entries()].map(([key, a]) => {
    const [itemId, period] = key.split('|');
    const units = a.hasUnits ? a.units : null;
    return {
      itemId,
      period,
      units,
      arpu: units && units > 0 ? Math.round(a.revenue / units) : null,
      revenue: a.revenue,
    };
  });
}

// ── 조합 결과 ────────────────
export type RevenueRow = OkrItem & {
  units: number | null;
  arpu: number | null;
  revenue: number;
  achievement: number | null; // 매출 / 목표 (목표 0이면 null)
};

// 기간 표시 라벨 — 원본 데이터 합계바용. 둘 다 미지정이면 '전체 기간'.
export function fmtRange(from: string, to: string): string {
  if (!from && !to) return '전체 기간';
  return `${from || '처음'} ~ ${to || '현재'}`;
}

// 주(일요일) 시작일 ISO — 주간 버킷 키. 주 경계 = 일~토.
function weekStartISO(iso: string): string {
  const dt = new Date(iso + 'T00:00:00');
  const sundayOffset = dt.getDay(); // 일=0 … 토=6
  dt.setDate(dt.getDate() - sundayOffset);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// 추이 버킷 — 일(day) / 주(일~토) / 월.
export type RevBucket = 'day' | 'week' | 'month';

// 이미 필터된 거래를 일/주/월 단위 매출 시계열로 — 대시보드 추이 차트용. 정렬=시간 오름차순.
export function seriesRevenue(
  txns: RevenueTxn[],
  unit: RevBucket,
): { key: string; revenue: number }[] {
  const m = new Map<string, number>();
  for (const t of txns) {
    const d = (t.date ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const key = unit === 'day' ? d : unit === 'week' ? weekStartISO(d) : d.slice(0, 7);
    m.set(key, (m.get(key) ?? 0) + (t.amount || 0));
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, revenue]) => ({ key, revenue }));
}

// 기간 길이에 맞는 버킷 자동 선택 — 6개월을 일별로 그리면 막대 180개가 되고,
// 2주를 월별로 그리면 막대 1개가 된다. 기간 미지정(전체)은 월.
export function revenueBucketFor(from: string, to: string): RevBucket {
  const days = daySpan(from, to);
  if (days === 0) return 'month';
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

// 기간·항목으로 좁힌 거래 합계. itemIds를 주면 그 항목만(고방/U사장님 스코프 분리용 허용목록).
// from/to는 '' = 무제한. 대시보드 스코어카드(지난주·이번달·기간합)가 전부 이걸 쓴다.
//
// 🚨 **`count`는 매출이 실제로 발생한 거래만 센다 — 원장 행 수 전체가 아니다**(2026-08-10 실측 버그).
// 주간 매출 입력의 [매출 없음] 확정은 그 항목에 `amount:0`인 원장 행을 남긴다(§weekEntryRows —
// '기록됨=0원'을 만들기 위해 의도적으로 필요한 행). 이 행까지 `count`에 넣으면 "매출 건수"가 실제
// 판매 수가 아니라 '이번 주에 확인 처리한 항목 수'가 된다 — 실측: 2026-08-02~08주 실제 매출은
// 2건(고방블로그·빌리투어숏폼)인데 8개 항목의 0원 마감 행까지 세어 리포트 "매출 건수"가 10으로,
// "건당 매출"이 2만원(실제 11만원)으로 찍혔다. 0원 마감은 "매출이 없었음을 확인"이지 매출 건이
// 아니므로 `amount > 0`인 행만 센다. `revenue`·`units`는 그대로 전 행을 더한다(0을 더해도 무해).
export function sumTxnsInRange(
  txns: RevenueTxn[],
  from: string,
  to: string,
  itemIds?: ReadonlySet<string>,
): { revenue: number; units: number; count: number } {
  let revenue = 0;
  let units = 0;
  let count = 0;
  for (const t of txns) {
    const d = (t.date ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (from && d < from) continue;
    if (to && d > to) continue;
    if (itemIds && !itemIds.has(t.itemId)) continue;
    const amount = t.amount || 0;
    revenue += amount;
    units += t.units ?? 0;
    if (amount > 0) count += 1;
  }
  return { revenue, units, count };
}

// from..to(둘 다 'YYYY-MM-DD') 포함 일수. 형식 불량/역순이면 0 — 상세 데이터 일·주평균용.
export function daySpan(from: string, to: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return 0;
  const a = new Date(from + 'T00:00:00').getTime();
  const b = new Date(to + 'T00:00:00').getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

// 월(YYYY-MM)의 말일 ISO 날짜.
export function monthLastDayISO(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${period}-${String(last).padStart(2, '0')}`;
}

// ISO 날짜 + n일(음수 가능). targetForRange가 리비전 경계로 구간을 쪼갤 때 쓴다.
function addDaysISO(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// OKR 항목(소스2)에 날짜 range[from..to] 실적(소스1)을 결합·합산.
// from/to는 ISO 날짜('YYYY-MM-DD', '' = 미지정=전체). record.period(월)가 range와 겹치면 포함
// — 광고 대시보드 DateRangePicker(날짜 기반)와 동일 계약. 매출 원장은 월 단위라 월 전체를 겹침 판정.
export function buildRows(
  items: OkrItem[],
  records: RevenueRecord[],
  from: string,
  to: string,
): RevenueRow[] {
  type Agg = { units: number; hasUnits: boolean; revenue: number };
  const agg = new Map<string, Agg>();
  for (const r of records) {
    const first = `${r.period}-01`;
    const last = monthLastDayISO(r.period);
    if (from && last < from) continue; // 월이 range 시작 이전
    if (to && first > to) continue; // 월이 range 종료 이후
    const cur = agg.get(r.itemId) ?? { units: 0, hasUnits: false, revenue: 0 };
    cur.revenue += r.revenue;
    if (r.units != null) {
      cur.units += r.units;
      cur.hasUnits = true;
    }
    agg.set(r.itemId, cur);
  }
  return items.map((it) => {
    const a = agg.get(it.id);
    const revenue = a?.revenue ?? 0;
    const units = a?.hasUnits ? a.units : null;
    // range 합산 시 객단가는 총매출/총건수로 재계산(단일 월이면 원값과 일치).
    const arpu = units && units > 0 ? Math.round(revenue / units) : null;
    return {
      ...it,
      units,
      arpu,
      revenue,
      achievement: it.target > 0 ? revenue / it.target : null,
    };
  });
}

export type RevenueTotals = {
  revenue: number; // 총매출
  units: number; // 총 판매건수(판매형 합)
  liveCount: number; // 가동 중 항목 수
  itemCount: number; // 전체 항목 수
  target: number; // 목표 합
  achievement: number | null; // 총매출 / 목표 합
};

export function totals(rows: RevenueRow[]): RevenueTotals {
  const t = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      units: acc.units + (r.units ?? 0),
      liveCount: acc.liveCount + (r.live ? 1 : 0),
      itemCount: acc.itemCount + 1,
      target: acc.target + r.target,
    }),
    { revenue: 0, units: 0, liveCount: 0, itemCount: 0, target: 0 },
  );
  return { ...t, achievement: t.target > 0 ? t.revenue / t.target : null };
}

// 그룹 라벨을 정의 순서대로(중복 제거) — 목표 매트릭스 행 순서가 순서의 진실.
export function groupsOf(items: OkrItem[]): string[] {
  return [...new Set(items.map((i) => i.group))];
}

// ── 시트(GAS) 계약 ────────────────
// GAS doGet이 반환하는 헤더 키 객체 배열을 파싱한다. 순서는 gas/Code.gs 와 동일.
export const TXN_HEADERS = ['id', 'date', 'item_id', 'memo', 'units', 'amount', 'updated_at'] as const;

function toNum(v: unknown): number {
  return Number(String(v ?? '').replace(/[,\s₩]/g, '')) || 0;
}

// GAS '원장' 탭 객체 배열 → RevenueTxn[]. id·item_id 없는 행 제외. units 공란=null.
export function parseTxns(rows: unknown[]): RevenueTxn[] {
  const out: RevenueTxn[] = [];
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    const itemId = String(o.item_id ?? '').trim();
    if (!id || !itemId) continue;
    const unitsRaw = String(o.units ?? '').trim();
    const units = unitsRaw === '' ? null : Number(unitsRaw.replace(/[,\s]/g, ''));
    out.push({
      id,
      date: String(o.date ?? '').trim().slice(0, 10),
      itemId,
      memo: String(o.memo ?? ''),
      units: units != null && Number.isFinite(units) ? units : null,
      amount: toNum(o.amount),
    });
  }
  return out;
}

export type MonthlyTarget = { itemId: string; group: string; bucket: string; name: string; kind: RevenueKind; track: RevenueTrack; month: string; target: number; live: boolean };
// 목표 매트릭스 계약: 고정 메타 컬럼 + 월 컬럼(YYYY-MM, 동적으로 오른쪽 확장).
// 롤업 로직(achievementByPeriod 등)은 MonthlyTarget[]만 소비하므로, 매트릭스 1행은
// 월 컬럼 수만큼 MonthlyTarget로 flatten된다(형식만 매트릭스, 내부 계약 불변).
export const TARGET_META_HEADERS = ['item_id', 'group', 'bucket', 'name', 'kind', 'live', 'track'] as const;
// 월 컬럼 키 감지. 시트가 'YYYY-MM' 헤더를 날짜로 강제변환해 'YYYY-MM-DD'로 줄 수 있음 → 둘 다 허용.
const MONTH_COL_RE = /^\d{4}-\d{2}(?:-\d{2})?$/;

function liveOf(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  return String(v ?? '').trim().toUpperCase() === 'Y';
}

// 목표 매트릭스 rows → MonthlyTarget[] (기존 타입·롤업 계약 유지).
//  - 입력 행: { item_id, group, bucket, name, kind, live, '2026-07':원, '2026-08':원, … }
//  - 월 컬럼은 YYYY-MM(또는 날짜강제된 YYYY-MM-DD) 키를 자동 감지 → 2027 등 확장에 하드코딩 불필요.
//  - 각 월 컬럼이 1개의 MonthlyTarget로 flatten. target 0 이하·빈셀·비숫자는 0으로 유지(월 누락 아님).
//  - live는 행 단위 → 그 행의 모든 MonthlyTarget에 동일 적용.
//  - 하위호환: 월 컬럼이 없고 long-format(month 단일 컬럼)이면 그 형식으로 파싱.
export function parseTargets(rows: unknown[]): MonthlyTarget[] {
  const out: MonthlyTarget[] = [];
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const itemId = String(o.item_id ?? '').trim();
    if (!itemId) continue;
    const group = String(o.group ?? '').trim();
    const bucket = String(o.bucket ?? '').trim();
    const name = String(o.name ?? '').trim();
    const kind: RevenueKind = o.kind === 'adrev' ? 'adrev' : 'sales';
    const live = liveOf(o.live);
    // 하위호환: track 컬럼 없는(현 시트) 행은 전부 'revenue'.
    const track: RevenueTrack = o.track === 'metric' ? 'metric' : 'revenue';

    const monthCols = Object.keys(o).filter((k) => MONTH_COL_RE.test(k));
    if (monthCols.length > 0) {
      for (const col of monthCols) {
        out.push({ itemId, group, bucket, name, kind, track, month: col.slice(0, 7), target: toNum(o[col]), live });
      }
      continue;
    }

    // 하위호환: long-format (month 단일 컬럼)
    const month = String(o.month ?? '').trim().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    out.push({ itemId, group, bucket, name, kind, track, month, target: toNum(o.target), live });
  }
  return out;
}

// 목표가 정의된 월 범위를 ISO 날짜 구간으로. 달성률의 기본 조회기간이 된다.
// ⚠️ 이게 없으면 목표기간 밖 실적(예: 상반기 5·6월)이 하반기 목표 달성률 분자에 섞여
//    달성률이 부풀려진다(2026-07-27 실측: 132만/8,640만 1.53% → 실제 55만 0.64%).
export function targetMonthRange(targets: MonthlyTarget[]): { from: string; to: string } {
  const months = [...new Set(targets.map((t) => t.month))].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  if (months.length === 0) return { from: '', to: '' };
  return { from: `${months[0]}-01`, to: monthLastDayISO(months[months.length - 1]) };
}

// 월(YYYY-MM)이 ISO 날짜구간 [from..to]와 겹치는가. 빈 문자열 = 무제한.
function monthInRange(month: string, from: string, to: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(month)) return false;
  if (from && monthLastDayISO(month) < from) return false;
  if (to && `${month}-01` > to) return false;
  return true;
}

// 목표 매트릭스(MonthlyTarget[])를 항목 단위로 롤업 → OkrItem[]. 대시보드가 소비하는 항목 목록·목표.
//  - target = 그 항목의 월 목표 합. range를 주면 그 구간과 겹치는 월만 합산한다
//    (안 주면 전체 — 기간을 좁혀도 목표는 전체가 나와 분모가 안 맞던 문제 때문에 range 지원).
//  - group·bucket·name·kind·live는 항목(행) 메타 — 월마다 동일하므로 첫 등장 값 사용.
//  - 첫 등장 순서 보존(그룹/항목 순서의 진실 = 매트릭스 행 순서). range 밖이라 목표가 0이어도 행은 유지.
/**
 * MAU 달성률 — **마지막 완결 달 한 달만** 본다(2026-08-05 사고 교정).
 *
 * 🚨 왜 누적 합이 아닌가: 실측 사고 — 목표를 `26-07=250,000`으로 넣었더니 카드가 **264,383**을 냈다.
 * `7월 225,530 + 8월 38,853(8/1~8/4, 진행 중)`이었다. 원인 둘:
 *   ① **진행 중인 달이 합산됐다**(전역 규칙 "진행 중인 주·달은 무조건 제외" 위반)
 *   ② **MAU를 달끼리 더했다** — 유니크 지표라 같은 사람을 여러 번 센다(월 MAU 합은 아무 뜻이 없다.
 *      매출은 합이 성립하지만 MAU는 안 된다 — `METRIC_META.roll`이 MAU를 '평균'으로 두는 것과 같은 이유).
 * 그래서 정직한 비교 단위는 **그 달 MAU ÷ 그 달 목표** 하나뿐이다. 화면은 기준 달을 라벨에 박는다.
 *
 * ⚠️ 목표가 **0인 달은 후보에서 뺀다** — 0은 '아직 안 세웠다'는 뜻이고 분모로 쓰면 거짓 무한대가 된다.
 * ⚠️ 그 달 GA4 실적이 없으면 null(카드는 '목표 미설정' 자리 카드를 유지한다 — 0%로 찍지 않는다).
 */
export function mauAchievement(
  targets: MonthlyTarget[],
  monthlyMau: { month: string; mau: number }[],
  currentYm: string,
): { ym: string; actual: number; target: number } | null {
  return metricAchievement(
    targets,
    new Map(monthlyMau.map((m) => [m.month, m.mau])),
    currentYm,
    /mau/i,
  );
}

/**
 * 서브지표 달성률 일반형 — MAU·문의수 등 `track:'metric'` 목표를 **같은 규칙**으로 계산한다
 * (2026-08-05 일반화). 규칙은 위 `mauAchievement` 주석과 동일: **마지막 완결 달 한 달**,
 * 목표 0인 달 제외, 그 달 실적이 없으면 null.
 *
 * 🚨 왜 문의수도 '한 달'인가: 문의수는 이벤트 카운트라 더할 수는 있지만 **목표가 월 단위로 세워졌다** —
 * 목표기간(H2) 누적으로 비교하면 아직 오지 않은 달의 목표까지 분모에 들어가 달성률이 늘 낮게 보인다
 * (7월 하나 지난 시점에 6개월 목표 대비 = 17%). 같은 달 대 같은 달이 판단에 쓰이는 유일한 형태다.
 *
 * @param actualByMonth 'YYYY-MM' → 실적. 지표마다 소스가 다르므로(MAU=GA4 / 문의수=지표 원장 일별 합)
 *   화면이 각자 만들어 넣는다 — **단, 합산 규칙이 있는 지표는 그 공용 헬퍼를 쓸 것**
 *   (문의수는 `rollupDailyMonthly` + `monthTotalInquiries` = U사장님 + U중개사 합).
 * @param match 목표 항목 이름 매칭(`/mau/i`·`/문의/`). 이름 컨벤션은 목표 매트릭스가 정의한다.
 */
export function metricAchievement(
  targets: MonthlyTarget[],
  actualByMonth: Map<string, number>,
  currentYm: string,
  match: RegExp,
): { ym: string; actual: number; target: number } | null {
  const rows = targets.filter((t) => t.track === 'metric' && match.test(t.name));
  if (!rows.length) return null;
  const itemId = rows[0].itemId; // 매칭되는 첫 항목이 정본(같은 이름 규칙을 화면들이 공유한다)
  const done = rows
    .filter((t) => t.itemId === itemId && t.target > 0 && t.month < currentYm)
    .sort((a, b) => a.month.localeCompare(b.month));
  const last = done[done.length - 1];
  if (!last) return null;
  const actual = actualByMonth.get(last.month);
  return actual === undefined ? null : { ym: last.month, actual, target: last.target };
}

export function itemsFromTargets(
  targets: MonthlyTarget[],
  range?: { from: string; to: string },
): OkrItem[] {
  const byItem = new Map<string, OkrItem>();
  for (const t of targets) {
    const counted = range ? monthInRange(t.month, range.from, range.to) : true;
    const add = counted ? t.target : 0;
    const cur = byItem.get(t.itemId);
    if (cur) {
      cur.target += add;
    } else {
      byItem.set(t.itemId, {
        id: t.itemId, group: t.group, bucket: t.bucket, name: t.name,
        kind: t.kind, track: t.track, target: add, live: t.live,
      });
    }
  }
  return [...byItem.values()];
}

/**
 * 목표를 **고른 월들만** 합쳐 항목을 만든다(2026-09-04 지적 "목표가, 3분기면 3분기 내용이어야지
 * 하반기 전체 매출로해서 부족분을 이야기하게 돼있는데?").
 *
 * `itemsFromTargets(targets, range)`는 연속 구간(from~to)만 셀 수 있어서, 화면에서 **월을 골라 보는**
 * 표(월별 실적 현황·항목별 월간 매출 상세)의 분모를 만들 수 없었다 — 7·8월만 켜 놓아도 목표는 하반기
 * 6개월 합이 그대로 남아 달성률이 낮게, 부족분이 크게 나왔다. 월 집합을 그대로 받는 이 함수가
 * 그 표들의 분모 정본이다(불연속 선택도 정확하다).
 */
export function itemsForMonths(targets: MonthlyTarget[], months: string[]): OkrItem[] {
  const monthSet = new Set(months);
  const byItem = new Map<string, OkrItem>();
  for (const t of targets) {
    const add = monthSet.has(t.month) ? t.target : 0;
    const cur = byItem.get(t.itemId);
    if (cur) {
      cur.target += add;
    } else {
      byItem.set(t.itemId, {
        id: t.itemId, group: t.group, bucket: t.bucket, name: t.name,
        kind: t.kind, track: t.track, target: add, live: t.live,
      });
    }
  }
  return [...byItem.values()];
}

// ── 사업 스코프(고방 / U사장님) ────────────────
// 목표·실적을 두 사업으로 가르는 계산을 여기 한 곳에 모은다. 화면마다 필터를 손으로 짜다가
// 통합 대시보드에서만 빠져 U사장님 매출(H2 1억 430만)이 고방 달성률 분자에 섞였다
// — 목표 0인 usajang_ad 행이 실적만 더하고 목표는 0을 더해 121.4%가 나왔다(2026-07-28 교정).
export type RevenueScope = 'gobang' | 'uboss';

// 스코프 판정 = UBOSS_GROUP 상수 하나. track:'metric'(MAU 등 서브지표 목표)은 매출이 아니라 제외한다
// — 건수 목표(예: 220,000)가 원 단위 분모에 섞이면 달성률이 무너진다.
function inScope(it: { group: string; track: RevenueTrack }, scope: RevenueScope): boolean {
  if (it.track !== 'revenue') return false;
  return scope === 'uboss' ? it.group === UBOSS_GROUP : it.group !== UBOSS_GROUP;
}

// 스코프에 속한 항목 id 허용목록(allowlist). 매치 실패 시 포함되는 블록리스트 방식은 금지 —
// 새 그룹이 생겼을 때 조용히 양쪽에 다 잡히는 fail-open 버그가 된다.
export function scopeItemIds(targets: MonthlyTarget[], scope: RevenueScope): Set<string> {
  return new Set(itemsFromTargets(targets).filter((it) => inScope(it, scope)).map((it) => it.id));
}

// 월 목표를 임의 구간으로 환산한다 — **일할 배분**(그 달 목표 ÷ 그 달 일수 × 구간에 든 일수).
// 통합 대시보드가 '한 주'의 달성률을 낼 때 쓴다. 일~토 주는 달을 걸치므로(6.28~7.4)
// 걸친 쪽 달 목표를 일수만큼만 가져와야 분모가 맞는다.
// ⚠️ lib/report.ts의 '월 목표 ÷ 그 달 ISO 주 수'와는 다른 계산이다 — 그쪽은 월~일 기준이라
//    이 화면(일~토)과 하루씩 어긋난다. 두 계산을 합치지 말 것.
// 한 달 전체를 주면 그 달 목표 합과 정확히 같다(테스트로 고정).
function targetForRangeFlat(targets: MonthlyTarget[], scope: RevenueScope, from: string, to: string): number {
  const byMonth = new Map<string, number>();
  for (const t of targets) {
    if (!inScope(t, scope)) continue;
    if (!/^\d{4}-\d{2}$/.test(t.month)) continue;
    byMonth.set(t.month, (byMonth.get(t.month) ?? 0) + t.target);
  }
  let sum = 0;
  for (const [month, target] of byMonth) {
    if (target === 0) continue;
    const first = `${month}-01`;
    const last = monthLastDayISO(month);
    const lo = from > first ? from : first;
    const hi = to < last ? to : last;
    if (lo > hi) continue; // 이 달은 구간과 안 겹친다
    const daysInMonth = Number(last.slice(8, 10));
    const daysCovered = Math.round((Date.parse(`${hi}T00:00:00Z`) - Date.parse(`${lo}T00:00:00Z`)) / 86_400_000) + 1;
    sum += (target / daysInMonth) * daysCovered;
  }
  return sum;
}

// from~to가 걸치는 달(YYYY-MM) 목록 — 달력을 그대로 순회(목표 데이터 유무와 무관한 기하 계산).
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

// history를 주면 목표가 나중에 바뀌어도 이미 지난 기간의 분모가 조용히 안 바뀐다 — 단, **월 목표와
// 주 목표는 '고정' 기준이 다르다**(2026-09-28 사용자 지정):
//   · 그 달 전체를 묻는 호출(from=그 달 1일, to=그 달 말일)은 **그 달 1일 시점 목표에 통째로 고정**.
//     같은 달 안에서 나중에 개정이 있어도(다음 분기 목표 짜다가 이번 달 값까지 같이 덮어써도) 무시한다
//     — 월간 목표는 "그 달이 시작될 때" 확정되는 것이지, 그 달이 진행되는 동안 흔들리면 안 된다.
//   · 그 달 일부만 걸치는 호출(주간 흐름의 '한 주' 등)은 그 안에서 실제로 개정이 있었다면 그대로
//     반영한다 — 그 주 중에 다음 분기 목표를 짜다가 이번 달 값이 바뀌었다면, 주간 숫자는 바뀔 수 있다.
// ⚠️ 2026-09-28: 9월 고방 목표가 9/22에 큰 폭으로 낮아지면서, history 없이 라이브 목표만 읽던 예전
//    로직은 9/22 이전 주(이미 끝난 실적)의 달성률까지 조용히 재계산해 337.7% 같은 착시를 냈다
//    (원래 9월 목표 1,345만 → 9/22 이후 86만). history를 안 주면(기존 호출부·테스트) 예전과 100%
//    동일하게 동작한다 — 이 매개변수는 additive.
export function targetForRange(
  targets: MonthlyTarget[],
  scope: RevenueScope,
  from: string,
  to: string,
  history: TargetHistoryEntry[] = [],
): number {
  if (!from || !to || from > to) return 0;
  if (!history.length) return targetForRangeFlat(targets, scope, from, to);

  let sum = 0;
  for (const month of monthsBetween(from, to)) {
    const first = `${month}-01`;
    const last = monthLastDayISO(month);
    const lo = from > first ? from : first;
    const hi = to < last ? to : last;
    if (lo > hi) continue; // 이 달은 구간과 안 겹친다

    if (lo === first && hi === last) {
      // 그 달 전체 — 그 달 1일 시점 목표로 고정(같은 달 안의 이후 개정은 무시).
      sum += targetForRangeFlat(targetsAsOf(history, targets, first), scope, first, last);
      continue;
    }

    // 그 달 일부(주간 흐름 등) — 그 조각 안에 개정일이 있으면 조각을 더 쪼개 반영한다.
    const boundaries = [...new Set(history.map((h) => h.revisedAt))].filter((d) => d > lo && d <= hi).sort();
    const cuts = [lo, ...boundaries, addDaysISO(hi, 1)];
    for (let i = 0; i < cuts.length - 1; i++) {
      const segFrom = cuts[i];
      const segTo = addDaysISO(cuts[i + 1], -1);
      if (segFrom > segTo) continue;
      sum += targetForRangeFlat(targetsAsOf(history, targets, segFrom), scope, segFrom, segTo);
    }
  }
  return sum;
}

// 스코프별 실적/목표/달성률.
//  - month 생략 = 목표가 정의된 전체 기간(예: 2026-H2 누적)
//  - month 'YYYY-MM' = 그 달 목표 대비(월 단위 페이스 확인용)
// 실적은 항상 분모와 같은 기간으로 제한한다 — 안 하면 목표기간 밖 매출이 분자에 섞인다.
export function scopeAchievement(
  txns: RevenueTxn[],
  targets: MonthlyTarget[],
  scope: RevenueScope,
  month?: string,
): { revenue: number; target: number; achievement: number | null } {
  const range =
    month && /^\d{4}-\d{2}$/.test(month)
      ? { from: `${month}-01`, to: monthLastDayISO(month) }
      : targetMonthRange(targets);
  const items = itemsFromTargets(targets, range).filter((it) => inScope(it, scope));
  const t = totals(buildRows(items, aggregateTxns(txns), range.from, range.to));
  return { revenue: t.revenue, target: t.target, achievement: t.achievement };
}

// 목표가 정의된 월 목록(오름차순). range를 주면 그 구간과 겹치는 월만 — 월별 누적표의 컬럼 목록.
export function targetMonthsIn(targets: MonthlyTarget[], range?: { from: string; to: string }): string[] {
  const months = [...new Set(targets.map((t) => t.month))].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  if (!range) return months;
  return months.filter((m) => monthInRange(m, range.from, range.to));
}

// ── 월별 누적표(조회 전용) ────────────────
// OKR 목표 매트릭스와 같은 "항목 × 월" 격자에 실적을 채운 형태. 매출 대시보드 상단이 소비한다.
// byMonth = 그 월 실적(원), actual = months 구간 실적 합, target = OkrItem.target(같은 구간 목표 합).
// ⚠️ actual을 '전체 실적'으로 두면 목표기간 밖 매출이 분자에 섞여 달성률이 부풀려진다(2026-07-27 회귀).
export type LedgerRow = OkrItem & {
  byMonth: Record<string, number>;
  actual: number;
  achievement: number | null;
};

export function monthlyLedger(items: OkrItem[], txns: RevenueTxn[], months: string[]): LedgerRow[] {
  const monthSet = new Set(months);
  const byItem = new Map<string, Record<string, number>>();
  for (const t of txns) {
    const m = (t.date ?? '').slice(0, 7);
    if (!t.itemId || !monthSet.has(m)) continue;
    const row = byItem.get(t.itemId) ?? {};
    row[m] = (row[m] ?? 0) + (t.amount || 0);
    byItem.set(t.itemId, row);
  }
  return items.map((it) => {
    const byMonth = byItem.get(it.id) ?? {};
    const actual = months.reduce((s, m) => s + (byMonth[m] ?? 0), 0);
    return { ...it, byMonth, actual, achievement: it.target > 0 ? actual / it.target : null };
  });
}

// 활성 기간 라벨 — targets에 존재하는 월 범위에서 유도(하드코딩 없음). 기간 셀렉터(S3) 전까지 표시용.
export function activePeriodLabel(targets: MonthlyTarget[]): string {
  const months = [...new Set(targets.map((t) => t.month))].sort();
  if (months.length === 0) return '목표 미설정';
  return months.length === 1 ? months[0] : `${months[0]} ~ ${months[months.length - 1]}`;
}

// ── 목표 매트릭스 편집(S3) ────────────────
// 편집 화면(목표)이 소비하는 매트릭스 형태 + 개정(target-revise) 계약.

// 항목 1행 + 월별 목표(원). 행 순서 = 첫 등장 순서(매트릭스 행 순서의 진실).
export type TargetMatrixRow = {
  itemId: string;
  group: string;
  bucket: string;
  name: string;
  kind: RevenueKind;
  track: RevenueTrack;
  live: boolean;
  byMonth: Record<string, number>; // 'YYYY-MM' → 목표(원 또는 건수)
};

// MonthlyTarget[] → 편집 매트릭스(정렬된 월 목록 + 항목 행). buildRows와 별개(편집 전용 뷰).
export function targetMatrix(targets: MonthlyTarget[]): { months: string[]; rows: TargetMatrixRow[] } {
  const months = [...new Set(targets.map((t) => t.month))].sort();
  const byItem = new Map<string, TargetMatrixRow>();
  for (const t of targets) {
    let row = byItem.get(t.itemId);
    if (!row) {
      row = { itemId: t.itemId, group: t.group, bucket: t.bucket, name: t.name, kind: t.kind, track: t.track, live: t.live, byMonth: {} };
      byItem.set(t.itemId, row);
    }
    row.byMonth[t.month] = t.target;
  }
  return { months, rows: [...byItem.values()] };
}

// 개정 1건(항목×월). GAS target-revise 페이로드 = 이 rows + months.
export type TargetRevisionRow = {
  itemId: string;
  group: string;
  bucket: string;
  name: string;
  kind: RevenueKind;
  track: RevenueTrack;
  live: boolean;
  targets: Record<string, number>; // 'YYYY-MM' → 목표(원 또는 건수). months 전체를 포함.
};

export type TargetRevision = {
  revisedAt?: string; // 'YYYY-MM-DD'
  note?: string;
  period?: string; // 표시용 기간 식별자(예: '2026-H2')
  months: string[]; // 이 개정이 덮는 월 컬럼(정렬)
  rows: TargetRevisionRow[];
};

// 개정(row×month) → MonthlyTarget[] (로컬 반영·롤업 재사용). months 순서 보존.
export function targetsFromRevision(rev: TargetRevision): MonthlyTarget[] {
  const out: MonthlyTarget[] = [];
  for (const r of rev.rows) {
    for (const month of rev.months) {
      out.push({
        itemId: r.itemId, group: r.group, bucket: r.bucket, name: r.name,
        kind: r.kind, track: r.track || 'revenue', month, target: toNum(r.targets?.[month]), live: r.live,
      });
    }
  }
  return out;
}

// 개정 이력 1건 — 일자·사유(누가 없으니) + `targetForRange`가 점검 시점 목표를 복원할 재료
// (months·snapshot). GAS가 개정마다 항목×월 전체를 이미 찍어 두므로(gas/Code.gs targetRevise_),
// 여기서 버리지만 않으면 새 백엔드 작업 없이 point-in-time 목표를 복원할 수 있다.
export type TargetHistoryEntry = {
  revisedAt: string;
  note?: string;
  /** 이 개정이 덮은 월 컬럼(정렬) — snapshot과 짝. 구버전 로그(스냅샷 도입 전)엔 없을 수 있다. */
  months?: string[];
  /** 개정 당시 항목×월 매트릭스 전체(= 그 순간부터 유효했던 목표). targetsAsOf가 읽는다. */
  snapshot?: TargetRevisionRow[];
};

// GAS '목표_이력' 탭 rows → TargetHistoryEntry[] (revised_at 내림차순, 1행=1개정).
export function parseTargetHistory(rows: unknown[]): TargetHistoryEntry[] {
  const out: TargetHistoryEntry[] = [];
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const revisedAt = String(o.revised_at ?? '').trim();
    if (!revisedAt) continue;
    const monthsRaw = String(o.months ?? '').trim();
    const months = monthsRaw ? monthsRaw.split(',').map((m) => m.trim()).filter(Boolean) : undefined;
    let snapshot: TargetRevisionRow[] | undefined;
    if (typeof o.snapshot === 'string' && o.snapshot.trim()) {
      try {
        const parsed = JSON.parse(o.snapshot);
        if (Array.isArray(parsed)) snapshot = parsed as TargetRevisionRow[];
      } catch {
        snapshot = undefined; // 손상된 스냅샷은 무시 — targetsAsOf가 라이브 값으로 폴백
      }
    }
    out.push({ revisedAt, note: String(o.note ?? '').trim() || undefined, months, snapshot });
  }
  return out.sort((a, b) => b.revisedAt.localeCompare(a.revisedAt));
}

// 리비전 스냅샷에서 특정 날짜에 유효했던 목표 매트릭스를 복원한다 — `targetForRange`가 이미 지난
// 기간의 분모를 그 기간이 시작될 때 값으로 고정할 때 쓴다. history가 비어있거나(픽스처·구버전 로그)
// date가 최신 개정 이후면 라이브 targets를 그대로 쓴다(그게 곧 최신 스냅샷과 같아야 정상이다).
export function targetsAsOf(history: TargetHistoryEntry[], liveTargets: MonthlyTarget[], date: string): MonthlyTarget[] {
  const snaps = history
    .filter((h) => Array.isArray(h.months) && h.months.length > 0 && Array.isArray(h.snapshot))
    .sort((a, b) => a.revisedAt.localeCompare(b.revisedAt));
  if (!snaps.length) return liveTargets;
  const latest = snaps[snaps.length - 1];
  if (date >= latest.revisedAt) return liveTargets;
  let effective = snaps[0]; // date가 첫 기록보다도 이전이면 가장 오래된 스냅샷이 최선의 근사치
  for (const s of snaps) {
    if (s.revisedAt <= date) effective = s;
    else break;
  }
  return targetsFromRevision({ months: effective.months as string[], rows: effective.snapshot as TargetRevisionRow[] });
}

export type ItemAchievement = { itemId: string; name: string; group: string; actual: number; target: number; rate: number | null };

// ── 기간 롤업(월/분기/연) ────────────────
export type PeriodLevel = 'month' | 'quarter' | 'year';

// 월(YYYY-MM) → 분기 식별자 'YYYY-Qn'.
export function quarterOf(month: string): string {
  const [y, m] = month.split('-');
  const q = Math.ceil(Number(m) / 3);
  return `${y}-Q${q}`;
}

// 월(YYYY-MM) → 연도 식별자 'YYYY'.
export function yearOf(month: string): string {
  return month.slice(0, 4);
}

// 월(YYYY-MM) → 분기 키 'YYYY-Qn' — quarterOf와 동일 값(표시 전용 분기합계 컬럼용 별칭).
export function quarterKeyOf(month: string): string {
  return quarterOf(month);
}

// 분기 키('YYYY-Qn') → 표시 라벨('YYYY N분기').
export function quarterLabelOf(key: string): string {
  const [y, q] = key.split('-Q');
  return `${y} ${q}분기`;
}

// 분기 키 → 열 헤더용 짧은 라벨('N분기'). 월 열 6개 옆에 '2026 3분기'를 그대로 쓰면 열이 벌어진다.
export function quarterShortLabelOf(key: string): string {
  return `${key.split('-Q')[1]}분기`;
}

// 항목×월 격자의 열 시퀀스 — 월 열 사이 분기 경계마다 분기합계 열을 끼운다(표시 전용).
// 목표 매트릭스(OKR)와 매출 대시보드가 같은 격자를 그리도록 계산을 여기 한 곳에 둔다.
export type ColSpec = { type: 'month'; month: string } | { type: 'qsub'; key: string };

export function monthColumnSpecs(months: string[]): ColSpec[] {
  const specs: ColSpec[] = [];
  months.forEach((m, i) => {
    specs.push({ type: 'month', month: m });
    const q = quarterKeyOf(m);
    const next = months[i + 1] ? quarterKeyOf(months[i + 1]) : null;
    if (next !== q) specs.push({ type: 'qsub', key: q });
  });
  return specs;
}

// 월을 level 기준 기간 식별자로 변환. month는 그대로 통과.
export function periodOf(month: string, level: PeriodLevel): string {
  if (level === 'month') return month;
  if (level === 'quarter') return quarterOf(month);
  return yearOf(month);
}

// period(월/분기/연 식별자)가 포괄하는 'YYYY-MM' 목록(오름차순).
export function monthsIn(level: PeriodLevel, period: string): string[] {
  if (level === 'month') return [period];
  if (level === 'year') {
    return Array.from({ length: 12 }, (_, i) => `${period}-${String(i + 1).padStart(2, '0')}`);
  }
  const [y, qPart] = period.split('-Q');
  const startMonth = (Number(qPart) - 1) * 3 + 1;
  return Array.from({ length: 3 }, (_, i) => `${y}-${String(startMonth + i).padStart(2, '0')}`);
}

// monthlyAchievement의 일반화: 기간(월/분기/연) 내 월들에 대해 itemId별 target 합산 vs 실적 합산.
// 빈 월(그 기간 안이지만 target 행이 없는 월)이 있어도 크래시 없이 나머지 월만 합산.
export function achievementByPeriod(
  txns: RevenueTxn[],
  targets: MonthlyTarget[],
  level: PeriodLevel,
  period: string,
): ItemAchievement[] {
  const months = new Set(monthsIn(level, period));
  const targetByItem = new Map<string, { name: string; group: string; target: number }>();
  for (const t of targets) {
    if (!months.has(t.month)) continue;
    const cur = targetByItem.get(t.itemId) ?? { name: t.name, group: t.group, target: 0 };
    cur.target += t.target;
    targetByItem.set(t.itemId, cur);
  }
  const actualByItem = new Map<string, number>();
  for (const t of txns) {
    const m = (t.date ?? '').slice(0, 7);
    if (!months.has(m) || !t.itemId) continue;
    actualByItem.set(t.itemId, (actualByItem.get(t.itemId) ?? 0) + (t.amount || 0));
  }
  return [...targetByItem.entries()].map(([itemId, v]) => {
    const actual = actualByItem.get(itemId) ?? 0;
    return { itemId, name: v.name, group: v.group, actual, target: v.target, rate: v.target > 0 ? actual / v.target : null };
  });
}

// 하위호환 래퍼 — 기존 호출부·테스트 유지용. 실제 로직은 achievementByPeriod로 위임.
export function monthlyAchievement(txns: RevenueTxn[], targets: MonthlyTarget[], month: string): ItemAchievement[] {
  return achievementByPeriod(txns, targets, 'month', month);
}

// 주(일요일) 시작일 ISO — 주 경계 = 일~토.
export function isoWeekStart(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 일=0 … 토=6
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export type WeekPoint = { week: string; revenue: number; units: number | null };

export function weeklyByItem(txns: RevenueTxn[], itemId: string, month?: string): WeekPoint[] {
  const acc = new Map<string, { revenue: number; units: number; hasUnits: boolean }>();
  for (const t of txns) {
    if (t.itemId !== itemId) continue;
    if (month && (t.date ?? '').slice(0, 7) !== month) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date ?? '')) continue;
    const wk = isoWeekStart(t.date);
    const cur = acc.get(wk) ?? { revenue: 0, units: 0, hasUnits: false };
    cur.revenue += t.amount || 0;
    if (t.units != null) { cur.units += t.units; cur.hasUnits = true; }
    acc.set(wk, cur);
  }
  return [...acc.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([week, v]) => ({ week, revenue: v.revenue, units: v.hasUnits ? v.units : null }));
}

// 기존 id 목록에서 다음 'T###' 발번.
export function nextTxnId(existing: string[]): string {
  let max = 0;
  for (const e of existing) {
    const m = /^T(\d+)$/.exec(String(e ?? '').trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'T' + String(max + 1).padStart(3, '0');
}

// ── 거래 입력 검증 · 저장행 빌드 (raw 화면 → GAS 쓰기) ──────────────
export type TxnInput = {
  id?: string;
  date?: string;
  itemId?: string;
  memo?: string;
  units?: number | string | null;
  amount?: number | string;
};

export function validateTxn(input: TxnInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date ?? '').trim())) {
    errors.push('거래일을 YYYY-MM-DD 형식으로 입력하세요.');
  }
  if (!String(input.itemId ?? '').trim()) errors.push('항목을 선택하세요.');
  // 금액 0 허용(2026-08-03) — 주간 매출 입력에서 "그 주 이 항목은 0원"을 원장에 **명시적으로**
  // 기록한다. 기록이 없는 것(아직 안 봤다)과 0원으로 확인한 것은 다른 상태라, 0원 행이 있어야
  // 주간 입력의 '미입력' 배지가 닫힌다(lib/weekly.ts `WeekEntryRow.entries`).
  // 대신 공란·음수·숫자 아님은 막는다 — 공란이 조용히 0원 행이 되면 실수를 확인으로 착각한다.
  const amountRaw = String(input.amount ?? '').replace(/[,\s₩]/g, '');
  if (amountRaw === '' || !Number.isFinite(Number(amountRaw)) || Number(amountRaw) < 0) {
    errors.push('금액은 0 이상의 숫자로 입력하세요.');
  }
  const unitsRaw = String(input.units ?? '').trim();
  if (unitsRaw !== '' && (!/^\d+$/.test(unitsRaw) || Number(unitsRaw) < 0)) {
    errors.push('건수는 0 이상의 정수이거나 공란이어야 합니다.');
  }
  return { ok: errors.length === 0, errors };
}

// 폼 입력 → GAS upsert로 보낼 '원장' 행 객체(TXN_HEADERS 키). id 자동 발번, updated_at 세팅.
export function buildUpsertTxn(
  input: TxnInput,
  existingIds: string[],
  today: string,
): Record<string, string> {
  const id = String(input.id ?? '').trim() || nextTxnId(existingIds);
  const unitsRaw = String(input.units ?? '').trim();
  return {
    id,
    date: String(input.date ?? '').trim().slice(0, 10),
    item_id: String(input.itemId ?? '').trim(),
    memo: String(input.memo ?? '').trim(),
    units: unitsRaw === '' ? '' : String(Number(unitsRaw)),
    amount: String(toNum(input.amount)),
    updated_at: today,
  };
}
