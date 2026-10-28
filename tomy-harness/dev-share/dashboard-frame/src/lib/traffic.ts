// 트래픽 원장 — GA4 스냅샷 적재/조회 로직 (순수 함수, 서버·클라 공용).
//
// 왜 원장에 쌓는가(2026-07-29 결정, docs/superpowers/specs/2026-07-29-전사지표-정본재편-design.md):
//  1) GA4 무료 등급 보존이 14개월이라 **적재하지 않으면 과거가 사라진다**(22~24년이 이미 그렇게 사라졌다).
//  2) 전년동월 대비(YoY)는 24개월이 필요한데 API로는 12개월밖에 못 본다 → 적재가 YoY의 전제조건.
//
// ⚠️ GA4 유니크 지표(activeUsers)는 **쪼갠 합 ≠ 총계**다. 여기서도 총계·스트림·소스매체를 절대 합산하지
//    않는다(각 탭을 조회 단위 그대로 저장하고, 화면도 그 단위로만 읽는다).
import type { MetricRecord, Platform } from './metrics';

export type SourceMediumRow = {
  date: string; // YYYY-MM-DD
  stream: Platform | string;
  source_medium: string;
  active: number;
  sessions: number;
  new: number;
};

export type MonthlySourceMediumRow = {
  ym: string; // YYYY-MM
  source_medium: string;
  active: number;
  sessions: number;
  new: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// GA4 원값 표기 (2026-08-05 사용자 요청 "페이드 → 메타 이런 식으로 하지 말고 정확하게 GA4 어떤 값인지
// 적어" + "값이 어떤 값이며 GA4에서 해당 값 보려면 어떻게 하는지")
//
// 화면에 쓰는 이름(`메타`·`리퍼럴`·`MAU`)은 우리가 붙인 것이고 GA4에는 없다. 운영자가 GA4를 열어
// 대조하려면 **GA4에 실제로 적혀 있는 지표·차원 이름과 그 화면 경로**가 필요하다 → 문구를 한 곳에 두고
// 두 월간흐름 화면이 같은 문자열을 쓴다(화면마다 다르게 적으면 어느 쪽이 맞는지 또 물어야 한다).
// ⚠️ 정본은 여기다 — 화면·훅에 복제하지 말 것.
// ─────────────────────────────────────────────────────────────────────────────

export const GA4_METRIC = '활성 사용자(activeUsers)';
export const GA4_CHANNEL_DIMENSION = '세션 소스/매체(sessionSourceMedium)';
/** MAU 확인 경로 — 달력 월 유니크라 `yearMonth` 차원으로 직접 조회한 값이다(일별 합산으로 못 만든다). */
export const GA4_MAU_PATH =
  'GA4 확인 경로 — 보고서 > 보고서 개요(또는 수명 주기 > 참여도 > 개요) → 기간을 그 달 1일~말일로 맞추고 ‘활성 사용자’를 본다. ⚠️ GA4 기본 ‘지난 28일’은 달력 월이 아니라 값이 다르고, ‘활성 사용자’와 ‘총 사용자’도 다른 지표다.';
/** 채널 값 확인 경로 — 우리 적재와 같은 조회 단위(yearMonth × sessionSourceMedium). */
export const GA4_CHANNEL_PATH =
  'GA4 확인 경로 — 보고서 > 수명 주기 > 획득 > 트래픽 획득 → 표 첫 열을 ‘세션 소스/매체’로 바꾸고 기간을 그 달 1일~말일로 맞춘 뒤 ‘활성 사용자’ 열을 본다.';

export type ChannelGroup = 'Owned' | 'Paid' | 'Organic' | 'Direct' | '미분류';
export type ChannelMapRow = { source_medium: string; group: string; label?: string };

// 상위 N 밖의 소스/매체를 접어 담는 이름. 5시트가 사람 손으로 referral 수식에 몰아넣던 것과 같은 역할.
export const OTHER_SOURCE = '기타';
export const TOP_SOURCE_DEFAULT = 20;

// 매핑에 없는 소스/매체는 실제 구분에 섞지 않고 '미분류'로 남긴다.
// (모르는 값을 Organic 같은 실제 그룹에 기본 배정하면 fail-open이 되어 조용히 잘못된 구분 합계가 된다 —
//  매출 스코프에서 같은 실수를 두 번 했다. 미분류로 보이면 운영자가 채널_매핑 탭에 한 줄 추가한다.)
export const UNMAPPED: ChannelGroup = '미분류';

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** MetricRecord[](GA4 정규화 결과) → 일별 소스/매체 원장 행. 지표 3종을 한 행으로 접는다. */
export function toSourceMediumRows(recs: MetricRecord[]): SourceMediumRow[] {
  const map = new Map<string, SourceMediumRow>();
  for (const r of recs) {
    if (!r.platform || !r.channel) continue;
    if (r.metric === 'returningUsers') continue; // 신규/재방문은 별 탭(합산하면 중복)
    const key = `${r.date}|${r.platform}|${r.channel}`;
    const row = map.get(key) ?? {
      date: r.date, stream: r.platform, source_medium: r.channel, active: 0, sessions: 0, new: 0,
    };
    if (r.metric === 'activeUsers') row.active += r.value;
    if (r.metric === 'sessions') row.sessions += r.value;
    if (r.metric === 'newUsers') row.new += r.value;
    map.set(key, row);
  }
  return [...map.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || String(a.stream).localeCompare(String(b.stream)),
  );
}

/**
 * 상위 N개 소스/매체만 남기고 나머지를 '기타'로 접는다.
 * 상위 판정은 **배치 전체의 active 합** 기준 — 날짜마다 다른 이름이 남으면 시계열 비교가 깨진다.
 * 일별 원장이 연 10만 행대로 부푸는 것을 막는 유일한 장치(월별 탭은 접지 않는다).
 */
export function foldTopSourceMedium(rows: SourceMediumRow[], topN = TOP_SOURCE_DEFAULT): SourceMediumRow[] {
  const total = new Map<string, number>();
  for (const r of rows) total.set(r.source_medium, (total.get(r.source_medium) ?? 0) + r.active);
  const keep = new Set(
    [...total.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, topN)
      .map(([k]) => k),
  );

  const out = new Map<string, SourceMediumRow>();
  for (const r of rows) {
    const name = keep.has(r.source_medium) ? r.source_medium : OTHER_SOURCE;
    const key = `${r.date}|${r.stream}|${name}`;
    const cur = out.get(key) ?? { ...r, source_medium: name, active: 0, sessions: 0, new: 0 };
    cur.active += r.active;
    cur.sessions += r.sessions;
    cur.new += r.new;
    out.set(key, cur);
  }
  return [...out.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      String(a.stream).localeCompare(String(b.stream)) ||
      a.source_medium.localeCompare(b.source_medium),
  );
}

/** 채널_매핑 탭 행 → 조회 맵. 대소문자·공백 차이를 흡수한다. */
export function buildChannelMap(rows: ChannelMapRow[]): Map<string, { group: ChannelGroup; label: string }> {
  const map = new Map<string, { group: ChannelGroup; label: string }>();
  for (const r of rows) {
    const key = String(r.source_medium ?? '').trim().toLowerCase();
    if (!key) continue;
    const group = String(r.group ?? '').trim();
    const known: ChannelGroup[] = ['Owned', 'Paid', 'Organic', 'Direct'];
    map.set(key, {
      group: (known.find((g) => g.toLowerCase() === group.toLowerCase()) ?? UNMAPPED) as ChannelGroup,
      label: String(r.label ?? '').trim() || String(r.source_medium ?? '').trim(),
    });
  }
  return map;
}

export function groupOf(
  sourceMedium: string,
  map: Map<string, { group: ChannelGroup; label: string }>,
): { group: ChannelGroup; label: string } {
  return (
    map.get(String(sourceMedium ?? '').trim().toLowerCase()) ?? { group: UNMAPPED, label: sourceMedium }
  );
}

export type ChannelMonthRow = { ym: string; group: ChannelGroup; channel: string; active: number };

/** `월_채널_legacy` 탭 한 행 — 1시트 채널 히스토리(GA4 적재 전 구간). */
export type LegacyChannelRow = {
  ym: string;
  group: string;
  channel: string;
  active?: string | number;
  source?: string;
  memo?: string;
};

/**
 * 1시트 채널 히스토리 + GA4 유래 채널 집계 병합 — **겹치는 달은 GA4가 이긴다**.
 *
 * 왜 GA4 우선인가: legacy는 사람이 옮겨 적은 값이고 GA4는 원천 집계다(`buildMonthlyMatrix`가
 * 조회·문의에 일별 원장을 legacy보다 앞세우는 것과 같은 규칙). 달 단위로 통째로 가른다 —
 * 같은 달 안에서 채널별로 섞으면 그 달 그룹 합계가 두 출처의 혼합이 되어 어느 쪽도 아닌 값이 된다.
 */
export function mergeChannelRows(ga4: ChannelMonthRow[], legacy: LegacyChannelRow[]): ChannelMonthRow[] {
  const ga4Months = new Set(ga4.map((r) => r.ym));
  const known: ChannelGroup[] = ['Owned', 'Paid', 'Organic', 'Direct'];
  // ⚠️ **키(ym|group|channel)로 dedupe한다 — 뒤에 온 행이 이긴다.** legacy는 두 출처를 이어 붙여
  // 들어온다(repo 백필 상수 + 시트 `월_채널_legacy`). dedupe 없이 그냥 넘기면 `buildMarketingMonthTable`이
  // 같은 키를 **더해** 그 달 채널값이 두 배가 된다(합산이 그 함수의 정상 동작이라 조용히 틀린다).
  const byKey = new Map<string, ChannelMonthRow>();
  for (const r of legacy) {
    const ym = String(r.ym ?? '').trim();
    if (!/^\d{4}-\d{2}$/.test(ym) || ga4Months.has(ym)) continue;
    const gRaw = String(r.group ?? '').trim();
    const group = known.find((g) => g.toLowerCase() === gRaw.toLowerCase());
    const channel = String(r.channel ?? '').trim();
    // ⚠️ 매핑 불가 group·빈 채널은 버린다(미분류로 넣으면 없던 '미분류' 계열이 과거에만 생긴다).
    if (!group || !channel) continue;
    byKey.set(`${ym}|${group}|${channel}`, { ym, group, channel, active: num(r.active) });
  }
  return [...byKey.values(), ...ga4].sort(
    (a, b) =>
      a.ym.localeCompare(b.ym) || groupRank(a.group) - groupRank(b.group) || a.channel.localeCompare(b.channel),
  );
}

/**
 * 구분별 '무엇이 포함되는지' 목록 — 화면 툴팁 정본(2026-08-05 사용자 요청 "각 유입 툴팁에 뭐뭐가
 * 포함된 항목인지 말하고"). **`채널_매핑` 탭에서 유도한다** — 화면에 채널 이름을 손으로 적으면
 * 운영자가 매핑을 고친 뒤에도 툴팁만 옛 목록을 말한다(그게 이 프로젝트에서 반복된 사고 유형이다).
 * 소스/매체가 많은 채널(리퍼럴 57개)은 화면이 개수만 쓰도록 배열째 넘긴다.
 *
 * ⚠️ **소스/매체는 시트에 적힌 문자열 그대로 낸다 — `buildChannelMap`의 (소문자화된) 키를 쓰지 않는다**
 * (2026-08-05 요청 "정확하게 GA4 어떤 값인지 적어"). 이 목록은 운영자가 GA4 화면에서 그 행을 찾아
 * 대조하는 데 쓰이므로, 대소문자를 우리가 바꿔 버리면 "GA4에 그렇게 적혀 있다"는 말이 거짓이 된다.
 * (조회용 매칭은 그대로 대소문자 무관 — 그건 `buildChannelMap`의 일이다.)
 */
export function groupCompositionOf(
  mapping: ChannelMapRow[],
): { group: ChannelGroup; channels: { label: string; sourceMediums: string[] }[] }[] {
  const byGroup = new Map<ChannelGroup, Map<string, string[]>>();
  const known: ChannelGroup[] = ['Owned', 'Paid', 'Organic', 'Direct'];
  const seen = new Set<string>();
  for (const r of mapping) {
    const sourceMedium = String(r.source_medium ?? '').trim();
    if (!sourceMedium) continue;
    // 같은 소스/매체가 두 줄이면 뒤엣것은 버린다(buildChannelMap이 Map이라 마지막 줄이 이기는 것과
    // 결과가 어긋나지 않게 — 여기선 목록이라 그냥 더하면 같은 값이 두 번 나열된다).
    const dedupeKey = sourceMedium.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const gRaw = String(r.group ?? '').trim();
    const group = known.find((g) => g.toLowerCase() === gRaw.toLowerCase());
    if (!group) continue; // 미분류는 내지 않는다
    const label = String(r.label ?? '').trim() || sourceMedium;
    const channels = byGroup.get(group) ?? new Map<string, string[]>();
    channels.set(label, [...(channels.get(label) ?? []), sourceMedium]);
    byGroup.set(group, channels);
  }
  return GROUP_ORDER.filter((g) => g !== UNMAPPED && byGroup.has(g)).map((group) => ({
    group,
    channels: [...byGroup.get(group)!.entries()]
      // 소스/매체가 많은 채널을 앞에 — 툴팁을 잘라 쓸 때 큰 것부터 남는다.
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([label, sourceMediums]) => ({ label, sourceMediums: sourceMediums.sort() })),
  }));
}

// 표·차트에 나오는 구분 순서 고정. 5시트의 OM/PM/OR/DR 순서를 계승하고 미분류를 맨 뒤에 둔다
// (localeCompare에 맡기면 한글 '미분류'가 라틴 그룹 사이로 끼어들어 화면 순서가 흔들린다).
export const GROUP_ORDER: ChannelGroup[] = ['Owned', 'Paid', 'Organic', 'Direct', UNMAPPED];
const groupRank = (g: ChannelGroup): number => {
  const i = GROUP_ORDER.indexOf(g);
  return i < 0 ? GROUP_ORDER.length : i;
};

export type ChannelGroupPoint = {
  ym: string;
  Owned: number | null;
  Paid: number | null;
  Organic: number | null;
  Direct: number | null;
};

/**
 * `monthlyChannelUsers()` 결과를 구분 4개(Owned/Paid/Organic/Direct)만 월별로 합산 — 장기 추이 차트용.
 * ⚠️ **'MAU'가 아니라 '유입 사용자수'다** — GA4 activeUsers를 채널별로 쪼갠 값의 합이라, 한 유저가
 * 여러 채널을 거치면 중복 계상돼 총 MAU(유니크)와 다르다(monthlyChannelUsers 상단 경고와 같은 함정).
 * 화면 라벨에 'MAU'를 쓰지 말 것. `미분류`는 이 4분류 전용 차트에 넣지 않는다.
 */
/**
 * ⚠️ **그 그룹의 행이 그 달에 하나도 없으면 null이다 — 0이 아니다**(2026-08-04 실측 버그: 시트
 * `채널_매핑`에 Owned 매핑이 아직 한 줄도 없어 Owned 열이 모든 달 0으로 찍혔다 — 값이 있는 채널이
 * 있는데 다 더해서 0이 나온 게 아니라, 애초에 그 그룹으로 분류된 GA4 소스/매체가 없는 상태다.
 * 0으로 두면 "실적이 0이었다"로 읽히고 null이어야 "이 그룹은 아직 매핑/데이터가 없다"로 읽힌다).
 */
export function monthlyGroupTotals(rows: ChannelMonthRow[]): ChannelGroupPoint[] {
  const sums = new Map<string, { Owned: number; Paid: number; Organic: number; Direct: number }>();
  const seen = new Map<string, { Owned: boolean; Paid: boolean; Organic: boolean; Direct: boolean }>();
  for (const r of rows) {
    if (r.group !== 'Owned' && r.group !== 'Paid' && r.group !== 'Organic' && r.group !== 'Direct') continue;
    const s = sums.get(r.ym) ?? { Owned: 0, Paid: 0, Organic: 0, Direct: 0 };
    const flags = seen.get(r.ym) ?? { Owned: false, Paid: false, Organic: false, Direct: false };
    s[r.group] += r.active;
    flags[r.group] = true;
    sums.set(r.ym, s);
    seen.set(r.ym, flags);
  }
  return [...sums.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((ym) => {
      const s = sums.get(ym)!;
      const flags = seen.get(ym)!;
      return {
        ym,
        Owned: flags.Owned ? s.Owned : null,
        Paid: flags.Paid ? s.Paid : null,
        Organic: flags.Organic ? s.Organic : null,
        Direct: flags.Direct ? s.Direct : null,
      };
    });
}

export type ChannelSeriesPoint = { ym: string } & Record<string, number | string | null>;

/**
 * 그룹(Owned/Paid/Organic/Direct) 하나의 **채널별** 월 시계열 — 마케팅 월간흐름의 개별 차트 4장이 쓴다.
 * `monthlyGroupTotals()`는 그룹 총합 1개 값만 내지만, 여기는 그 그룹 안 채널(예: Owned의 네이버
 * 블로그·인스타그램·유튜브)을 각자 선으로 그리려고 채널을 열로 편다(피벗). 그 그룹에 실제로 데이터가
 * 있는 월만 포함한다 — 다른 그룹의 달 목록까지 억지로 채우면 없는 달이 0으로 보인다.
 */
export function monthlyChannelSeriesFor(
  rows: ChannelMonthRow[],
  group: ChannelGroup,
): { channels: string[]; points: ChannelSeriesPoint[] } {
  const filtered = rows.filter((r) => r.group === group);
  const channels = [...new Set(filtered.map((r) => r.channel))].sort();
  const months = [...new Set(filtered.map((r) => r.ym))].sort();
  const valueOf = new Map(filtered.map((r) => [`${r.ym}|${r.channel}`, r.active]));
  const points = months.map((ym) => {
    const point: ChannelSeriesPoint = { ym };
    for (const c of channels) point[c] = valueOf.get(`${ym}|${c}`) ?? null;
    return point;
  });
  return { channels, points };
}

/** 월별 소스/매체 원장 → 구분(Owned/Paid/Organic/Direct) × 채널 표시명 집계. */
export function monthlyChannelUsers(
  rows: MonthlySourceMediumRow[],
  map: Map<string, { group: ChannelGroup; label: string }>,
): ChannelMonthRow[] {
  const out = new Map<string, ChannelMonthRow>();
  for (const r of rows) {
    const { group, label } = groupOf(r.source_medium, map);
    const key = `${r.ym}|${group}|${label}`;
    const cur = out.get(key) ?? { ym: r.ym, group, channel: label, active: 0 };
    cur.active += num(r.active);
    out.set(key, cur);
  }
  return [...out.values()].sort(
    (a, b) =>
      a.ym.localeCompare(b.ym) || groupRank(a.group) - groupRank(b.group) || a.channel.localeCompare(b.channel),
  );
}

// ── 전월 대비 · 전년동월 대비 ──────────────────────────────────────────
// 1시트 `📌[Raw]전년대비비교` 탭이 하던 일. 값이 없으면 null(0으로 찍지 않는다 —
// '데이터 없음'과 0을 같은 모양으로 보여주면 수집 누락으로 읽힌다).

export const shiftYm = (ym: string, months: number): string => {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
};

/**
 * 조회 범위의 **첫 달이 잘려 있으면** 그 달을 버린다.
 *
 * ⚠️ 2026-07-29 실제 사고: GA4 롤업을 400일 창으로 받으니 창의 시작이 2025-06-23이었고, 그 달의
 * `yearMonth` 행은 **6/23~6/30 8일치 유니크**(98,825)였다. 키가 `ym`인 원장에 그대로 upsert되어
 * legacy 전체 달 값(300,125)을 조용히 덮었다. 반쪽 달은 완결된 달과 모양이 같아 눈으로 안 걸린다.
 * 진행 중인 **마지막 달**은 남긴다 — 매일 재수집으로 자라고, 화면이 미완결 기간을 안 그리기 때문.
 */
export const isPartialFirstMonth = (ym: string, from: string): boolean =>
  from.slice(8, 10) !== '01' && ym === from.slice(0, 7);

export function dropPartialFirstMonth<T extends { ym: string }>(rows: T[], from: string): T[] {
  return rows.filter((r) => !isPartialFirstMonth(r.ym, from));
}

export type Comparison = {
  ym: string;
  value: number;
  prevMonth: number | null;
  prevYear: number | null;
  momPct: number | null;
  yoyPct: number | null;
};

export function attachComparisons(series: { ym: string; value: number }[]): Comparison[] {
  const by = new Map(series.map((s) => [s.ym, num(s.value)]));
  const pct = (cur: number, base: number | null): number | null =>
    base === null || base === 0 ? null : cur / base - 1;
  return [...series]
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((s) => {
      const prevMonth = by.has(shiftYm(s.ym, -1)) ? by.get(shiftYm(s.ym, -1))! : null;
      const prevYear = by.has(shiftYm(s.ym, -12)) ? by.get(shiftYm(s.ym, -12))! : null;
      return {
        ym: s.ym,
        value: num(s.value),
        prevMonth,
        prevYear,
        momPct: pct(num(s.value), prevMonth),
        yoyPct: pct(num(s.value), prevYear),
      };
    });
}

// ── 광고비 파생지표 ───────────────────────────────────────────────────
// ⚠️ **CPC·CTR·CPM은 만들 수 없다** — 노출수·클릭수는 광고 플랫폼에만 있고 GA4엔 없다.
//    5시트 `[🧡Paid] 주간 마케팅성과`가 갖고 있던 지표이며, 그 시트를 대체하지 못하는 부분이다.
//    여기서 만들 수 있는 것은 분모가 우리 데이터인 두 개뿐이다.

export type AdSpendRow = { ym: string; media: string; amount: number };

export const sumSpend = (rows: AdSpendRow[], ym: string): number =>
  rows.reduce((s, r) => (r.ym === ym ? s + num(r.amount) : s), 0);

/**
 * 광고비 ÷ 분모(모수). 분모 0이면 null.
 * 사용자당 비용(Paid 활성 사용자)·문의당 비용(지표 원장 문의수) 둘 다 같은 나눗셈이라
 * 이 한 함수를 쓴다(channels.ts가 perUser·perInquiry 둘 다에 재사용).
 */
export const costPerUser = (spend: number, count: number): number | null =>
  count > 0 ? spend / count : null;

// ── 적재 배치 만들기 ──────────────────────────────────────────────────
export type LedgerBatch = { tab: string; rows: Record<string, string | number>[] };

const stamp = (source: string, updatedAt: string) => ({ source, updated_at: updatedAt });

export function buildBatches(input: {
  updatedAt: string; // 호출자가 넘긴다(순수 함수 유지 — 내부에서 Date를 읽지 않는다)
  dailyTotals?: { date: string; active: number; new: number; sessions: number }[];
  // ⚠️ 일별 × 스트림은 여기 없다. `activeUsers`는 유니크라 소스/매체 행을 스트림별로 합치면
  //    중복 계상이 되어 틀린 값이 나온다 → 필요해지면 `date × streamName` **별도 조회**를 추가할 것.
  //    (시트의 `일_스트림` 탭은 그래서 비어 있다 — 화면에서 아직 쓰지 않는다.)
  sourceMedium?: SourceMediumRow[];
  monthlySourceMedium?: MonthlySourceMediumRow[];
  weeklyWau?: { week_start: string; yearweek: string; active: number }[];
  weeklyWauStream?: { week_start: string; yearweek: string; stream: string; active: number }[];
  monthlyMau?: { ym: string; active: number }[];
  monthlyMauStream?: { ym: string; stream: string; active: number }[];
  newVsReturning?: { date: string; stream: string; new_vs_returning: string; active: number }[];
  topN?: number;
}): LedgerBatch[] {
  const s = stamp('ga4', input.updatedAt);
  const batches: LedgerBatch[] = [];
  const push = (tab: string, rows: Record<string, string | number>[] | undefined) => {
    if (rows && rows.length) batches.push({ tab, rows });
  };

  push('일_총계', input.dailyTotals?.map((r) => ({ ...r, ...s })));
  push(
    '일_소스매체',
    input.sourceMedium && foldTopSourceMedium(input.sourceMedium, input.topN).map((r) => ({ ...r, ...s })),
  );
  push('월_소스매체', input.monthlySourceMedium?.map((r) => ({ ...r, ...s })));
  push('주_WAU', input.weeklyWau?.map((r) => ({ ...r, ...s })));
  push('주_WAU_스트림', input.weeklyWauStream?.map((r) => ({ ...r, ...s })));
  push('월_MAU', input.monthlyMau?.map((r) => ({ ...r, ...s })));
  push('월_MAU_스트림', input.monthlyMauStream?.map((r) => ({ ...r, ...s })));
  push('일_신규재방문', input.newVsReturning?.map((r) => ({ ...r, ...s })));
  return batches;
}
