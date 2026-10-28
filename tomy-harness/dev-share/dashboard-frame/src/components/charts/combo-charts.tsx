'use client';

// 대시보드 콤보 차트 2종 — '막대 1개 + 그 위를 지나는 선 2개'.
// U사장님 대시보드 안에 인라인으로 있던 것을 통합 대시보드와 나눠 쓰기 위해 꺼냈다(2026-07-28).
// 화면마다 복제하면 층 배분·투명도·축 규칙이 갈린다(차트를 trend-charts.tsx로 모은 것과 같은 이유).
//
// 왜 겹치는가: 매출이 오를 때 단가가 올랐나 물량이 늘었나, 조회가 늘 때 문의율이 따라 올랐나를
// 같은 자리에서 봐야 한다. 층으로 떼어놓으면 눈이 두 번 움직인다(사용자 요청 2026-07-28).
// 겹치는 대신 ① 막대는 반투명으로 눌러 선이 위로 읽히게 하고 ② 선끼리는 서로 다른 띠(layerDomain)에
// 앉혀 구분한다. 막대는 0 기준을 유지해야(baselineDomain) 길이 비교가 성립한다.
//
// ⚠️ Recharts는 같은 orientation의 Y축 2개를 같은 자리에 겹쳐 그린다 → 축은 2개만 노출하고
//    세 번째 계열(파생지표: 문의율·객단가)은 hide 축에 태워 값은 툴팁으로 읽는다.

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { layerDomain, baselineDomain, tightDomain } from '@/lib/chart-scale';
import { fmtInt, fmtMan, fmtPct } from '@/lib/format';
import {
  MINT,
  GREEN,
  AMBER,
  TREND_KEY,
  TREND_DEFAULT,
  withTrend,
  DENSE_POINTS,
  DERIVED_DASH,
  seriesDot,
  derivedDot,
  trendLineProps,
} from '@/components/charts/trend-charts';
import { useSeriesToggle } from '@/components/charts/use-series-toggle';

const GRID = '#eceff2';
const AXIS = '#6d7379';
const TEAL = '#0f766e'; // 파생지표(문의율·객단가) — 원계열 색(민트·앰버·초록)과 구분
const BAR_TOP = 0.9; // 막대 최대 높이 비율(위쪽 10%는 선이 지나갈 자리)
const BAR_OPACITY = 0.4;
const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e6eb' } as const;

// 금액 축 눈금 — fmtMan은 0을 '—'로 쓴다(카드용). 축 밑동은 '0'이어야 눈금이 읽힌다.
const manTick = (v: number) => (v === 0 ? '0' : fmtMan(v));

// 구간이 이보다 많으면 막대를 선으로 바꾼다. 전 기간 주 버킷은 지표 원장이 186주라
// 막대 폭이 1~2px가 되어 아무것도 안 읽힌다(2026-07-28 전기간 차트 도입).
export const BAR_MAX_POINTS = 60;

const LAYER = {
  purchases: { lo: 0.55, hi: 0.95 },
  aov: { lo: 0.15, hi: 0.6 },
  inquiries: { lo: 0.5, hi: 0.92 },
  rate: { lo: 0.05, hi: 0.34 },
} as const;

function Empty({ height }: { height: number }) {
  return (
    <div className="grid place-items-center text-sm text-ink-mute" style={{ height }}>
      데이터 없음
    </div>
  );
}

// ⚠️⚠️ 계열(<Bar>/<Line>)은 **반드시 <ComposedChart>의 직접 자식**이어야 한다.
// Recharts는 자식을 타입으로 훑어 계열을 찾는다 → 자체 컴포넌트로 감싸거나 <>…</> Fragment로 묶으면
// **그 계열이 조용히 사라진다**(에러 없음, 범례에도 안 뜬다).
// 2026-07-28 실제 발생: 공용화하면서 BaseSeries/DerivedLine 래퍼로 감쌌더니 조회 막대·문의율 점선·
// 매출·판매·객단가가 전부 안 그려지고 '문의수' 선 하나만 남았다(회귀 테스트 = combo-charts.test.ts).
// 중복이 보여도 컴포넌트로 빼지 말 것 — 조건식({many ? <Line/> : <Bar/>})과 {cond && <Line/>}는 안전하다.

export type FunnelPoint = { label: string; views: number; inquiries: number; rate: number };

// 유저 퍼널 — 조회 막대(모수) + 문의 선 + 문의율 점선.
// 조회 30만·문의 1만·문의율 0.03의 스케일 차를 층으로 푼다.
// 추세선을 붙일 계열 목록 — 막대로 그려지는 모수는 뺀다(막대 위 추세선은 두 형태가 겹쳐 읽힌다).
const FUNNEL_TREND = [{ key: 'inquiries' }, { key: 'rate' }];
const VIEW_TREND = [{ key: 'views' }, ...FUNNEL_TREND];
const REV_TREND = [{ key: 'purchases' }, { key: 'aov' }];
const REV_TREND_LINE = [{ key: 'revenue' }, ...REV_TREND];

export function FunnelCombo({
  data,
  height = 320,
  ariaLabel = '조회수·문의수·문의율 추이',
  trend = TREND_DEFAULT,
}: {
  data: FunnelPoint[];
  height?: number;
  ariaLabel?: string;
  /** 계열별 추세선. 기본 켜짐(꺾은선 = 추세선 동반 규칙). */
  trend?: boolean;
}) {
  const viewsAxis = useMemo(() => baselineDomain(data.map((d) => d.views), BAR_TOP), [data]);
  const inqAxis = useMemo(
    () => layerDomain(data.map((d) => d.inquiries), LAYER.inquiries.lo, LAYER.inquiries.hi),
    [data],
  );
  const rateAxis = useMemo(() => layerDomain(data.map((d) => d.rate), LAYER.rate.lo, LAYER.rate.hi), [data]);
  const many = data.length > BAR_MAX_POINTS;
  // ⚠️ 마커(dot) 판정은 `many`(막대→선 전환, 60점)와 **다른 기준**이다 — 점이 겹치는지만 본다.
  //    섞어 쓰면 선으로 그려진 차트에서 마커가 통째로 사라진다(2026-08-04 실측).
  const dense = data.length > DENSE_POINTS;
  const toggle = useSeriesToggle(); // 범례 클릭으로 계열 껐다 켜기
  // 🚨 꺾은선에는 항상 추세선(2026-08-04 규칙, trend-charts §TREND_DEFAULT) — 문의수 선·문의율 점선은
  //    늘, 조회수는 **선으로 그려질 때만**(막대일 때 추세선을 얹으면 막대 위에 선이 겹쳐 읽힌다).
  const rows = useMemo(
    () => withTrend(data as unknown as Record<string, unknown>[], many ? VIEW_TREND : FUNNEL_TREND, trend),
    [data, many, trend],
  );

  if (data.length === 0) return <Empty height={height} />;
  return (
    <div role="img" aria-label={ariaLabel} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} minTickGap={14} />
          <YAxis
            yAxisId="views"
            domain={viewsAxis.domain}
            ticks={viewsAxis.ticks}
            tickFormatter={(v: number) => fmtInt(v)}
            tick={{ fontSize: 11, fill: MINT }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <YAxis
            yAxisId="inquiries"
            orientation="right"
            domain={inqAxis.domain}
            ticks={inqAxis.ticks}
            tickFormatter={(v: number) => fmtInt(v)}
            tick={{ fontSize: 11, fill: AMBER }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <YAxis yAxisId="rate" hide domain={rateAxis.domain} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, n: string) => [n === '문의율' ? fmtPct(v) : fmtInt(v), n]}
          />
          <Legend {...toggle.legendProps} />
          {/* 조회수 = 모수 계열. 구간이 많으면 막대 대신 선(막대 폭 1~2px 방지) */}
          {many ? (
            <Line
              hide={toggle.isHidden('views')}
              yAxisId="views"
              type="linear"
              dataKey="views"
              name="조회수"
              isAnimationActive={false}
              stroke={MINT}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ) : (
            <Bar
              hide={toggle.isHidden('views')}
              yAxisId="views"
              dataKey="views"
              name="조회수"
              fill={MINT}
              fillOpacity={BAR_OPACITY}
              maxBarSize={38}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          )}
          <Line
            hide={toggle.isHidden('inquiries')}
            yAxisId="inquiries"
            type="linear"
            dataKey="inquiries"
            name="문의수"
            isAnimationActive={false}
            stroke={AMBER}
            strokeWidth={2.25}
            dot={seriesDot(dense)}
            activeDot={{ r: 4 }}
          />
          {/* 문의율 = 파생지표. 숨긴 축(rate)에 태우고 점선으로 구분, 값은 툴팁으로 읽는다.
              점선이지만 **실측값**이라 점 마커를 남긴다 — 마커 없는 성긴 점선은 추세선 몫이다. */}
          <Line
            hide={toggle.isHidden('rate')}
            yAxisId="rate"
            type="linear"
            dataKey="rate"
            name="문의율"
            isAnimationActive={false}
            stroke={TEAL}
            strokeWidth={2}
            strokeDasharray={DERIVED_DASH}
            dot={derivedDot(dense, TEAL)}
            activeDot={{ r: 4 }}
          />
          {/* 추세선 — 원계열을 끄면 함께 꺼진다. 범례·툴팁 제외(trendLineProps). */}
          {trend && many && (
            <Line hide={toggle.isHidden('views')} yAxisId="views" dataKey={TREND_KEY('views')} name="조회수 추세" {...trendLineProps(MINT)} />
          )}
          {trend && (
            <Line hide={toggle.isHidden('inquiries')} yAxisId="inquiries" dataKey={TREND_KEY('inquiries')} name="문의수 추세" {...trendLineProps(AMBER)} />
          )}
          {trend && (
            <Line hide={toggle.isHidden('rate')} yAxisId="rate" dataKey={TREND_KEY('rate')} name="문의율 추세" {...trendLineProps(TEAL)} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export type RevenuePoint = { label: string; revenue: number; purchases: number; aov: number };

// 지점 매출 — 매출 막대 + 판매 건수 선 + 객단가 점선.
// showPurchases=false면 매출만(일 버킷처럼 판매 건수를 쪼갤 수 없을 때).
export function RevenueCombo({
  data,
  height = 320,
  ariaLabel = '매출·판매 건수·객단가 추이',
  showPurchases = true,
  trend = TREND_DEFAULT,
}: {
  data: RevenuePoint[];
  height?: number;
  ariaLabel?: string;
  showPurchases?: boolean;
  /** 계열별 추세선. 기본 켜짐(꺾은선 = 추세선 동반 규칙). */
  trend?: boolean;
}) {
  const revAxis = useMemo(() => baselineDomain(data.map((d) => d.revenue), BAR_TOP), [data]);
  const purAxis = useMemo(
    () => layerDomain(data.map((d) => d.purchases), LAYER.purchases.lo, LAYER.purchases.hi),
    [data],
  );
  const aovAxis = useMemo(() => layerDomain(data.map((d) => d.aov), LAYER.aov.lo, LAYER.aov.hi), [data]);
  const many = data.length > BAR_MAX_POINTS;
  // ⚠️ 마커(dot) 판정은 `many`(막대→선 전환, 60점)와 **다른 기준**이다 — 점이 겹치는지만 본다.
  //    섞어 쓰면 선으로 그려진 차트에서 마커가 통째로 사라진다(2026-08-04 실측).
  const dense = data.length > DENSE_POINTS;
  const toggle = useSeriesToggle(); // 범례 클릭으로 계열 껐다 켜기
  // 꺾은선 계열(판매 건수·객단가)엔 항상 추세선. 매출은 **선으로 그려질 때만**(막대일 땐 제외).
  const rows = useMemo(
    () =>
      withTrend(
        data as unknown as Record<string, unknown>[],
        (many ? REV_TREND_LINE : REV_TREND).filter((d) => showPurchases || d.key !== 'purchases'),
        trend,
      ),
    [data, many, showPurchases, trend],
  );

  if (data.length === 0) return <Empty height={height} />;
  return (
    <div role="img" aria-label={ariaLabel} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} minTickGap={14} />
          <YAxis
            yAxisId="revenue"
            domain={revAxis.domain}
            ticks={revAxis.ticks}
            tickFormatter={manTick}
            tick={{ fontSize: 11, fill: MINT }}
            tickLine={false}
            axisLine={false}
            width={58}
          />
          {showPurchases && (
            <YAxis
              yAxisId="purchases"
              orientation="right"
              domain={purAxis.domain}
              ticks={purAxis.ticks}
              tickFormatter={(v: number) => fmtInt(v)}
              tick={{ fontSize: 11, fill: GREEN }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
          )}
          <YAxis yAxisId="aov" hide domain={aovAxis.domain} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, n: string) => [n === '매출' || n === '객단가' ? fmtMan(v) : `${fmtInt(v)}건`, n]}
          />
          <Legend {...toggle.legendProps} />
          {many ? (
            <Line
              hide={toggle.isHidden('revenue')}
              yAxisId="revenue"
              type="linear"
              dataKey="revenue"
              name="매출"
              isAnimationActive={false}
              stroke={MINT}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ) : (
            <Bar
              hide={toggle.isHidden('revenue')}
              yAxisId="revenue"
              dataKey="revenue"
              name="매출"
              fill={MINT}
              fillOpacity={BAR_OPACITY}
              maxBarSize={38}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          )}
          {/* ⚠️ Fragment로 묶으면 두 계열이 사라진다 → 조건을 각 계열에 따로 붙인다 */}
          {showPurchases && (
            <Line
              hide={toggle.isHidden('purchases')}
              yAxisId="purchases"
              type="linear"
              dataKey="purchases"
              name="판매 건수"
              isAnimationActive={false}
              stroke={GREEN}
              strokeWidth={2.25}
              dot={seriesDot(dense)}
              activeDot={{ r: 4 }}
            />
          )}
          {showPurchases && (
            <Line
              hide={toggle.isHidden('aov')}
              yAxisId="aov"
              type="linear"
              dataKey="aov"
              name="객단가"
              isAnimationActive={false}
              stroke={TEAL}
              strokeWidth={2}
              strokeDasharray={DERIVED_DASH}
              dot={derivedDot(dense, TEAL)} /* 실측 파생값 → 구슬 마커를 남긴다(마커 없는 성긴 점선 = 추세선) */
              activeDot={{ r: 4 }}
            />
          )}
          {/* 추세선 — 원계열을 끄면 함께 꺼진다. 범례·툴팁 제외(trendLineProps). */}
          {trend && many && (
            <Line hide={toggle.isHidden('revenue')} yAxisId="revenue" dataKey={TREND_KEY('revenue')} name="매출 추세" {...trendLineProps(MINT)} />
          )}
          {trend && showPurchases && (
            <Line hide={toggle.isHidden('purchases')} yAxisId="purchases" dataKey={TREND_KEY('purchases')} name="판매 건수 추세" {...trendLineProps(GREEN)} />
          )}
          {trend && showPurchases && (
            <Line hide={toggle.isHidden('aov')} yAxisId="aov" dataKey={TREND_KEY('aov')} name="객단가 추세" {...trendLineProps(TEAL)} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 범용 콤보 — 막대 1개 + (선 1개) + (파생 점선 1개)
//
// 🚨 왜 생겼나(2026-08-03 월간 흐름 차트 6종 요청): FunnelCombo·RevenueCombo는 계약이 고정된 전용
// 차트다(조회/문의/문의율, 매출/판매/객단가). 새로 요청된 조합 — MAU+문의율 / 지점수+지점당 문의수 /
// 앱설치+증감률 / 파트너 신규+파트너 수+파트너 비율 — 을 그리려고 화면에 차트를 새로 짜면
// 층 배분·투명도·축 규칙이 또 갈린다. 그래서 **같은 층 규칙을 쓰는 범용 3계열 콤보** 하나를 둔다.
//
// ⚠️ 계열은 `<ComposedChart>`의 **직접 자식**이어야 한다(위 경고 참조) → 조건식으로만 분기한다.
// ⚠️ 파생 계열(비율·단가)은 숨긴 축에 태운다 — Recharts는 같은 orientation 축 2개를 겹쳐 그린다.
// ─────────────────────────────────────────────────────────────────────────────

export type ComboSeries = { key: string; name: string; color: string; fmt: (v: number) => string };
export type MetricComboPoint = { label: string } & Record<string, number | null | string>;

export function MetricCombo({
  data,
  bar,
  bar2,
  line,
  dashed,
  trend,
  asLine,
  barScale = 'linear',
  height = 260,
  ariaLabel,
}: {
  data: MetricComboPoint[];
  /** 모수 계열(막대). 구간이 많으면 자동으로 선이 된다. */
  bar: ComboSeries;
  /**
   * **`bar`와 같은 축을 나눠 쓰는** 세 번째 계열(항상 선) — 2026-08-24 신설(방문 분석 "핵심 전환
   * 데이터" 사용자 요청 "사용자추이 핵심전환추이 위에 못 덮어?? 차트지금 2개로 나눳던데" — 별도
   * 카드로 나눴던 사용자 추이를 한 차트에 겹치는 요청). `line`은 자기 전용 축(오른쪽)을 새로 그려
   * 스케일이 달라도 되지만, `bar2`는 **그 축을 새로 만들지 않고 `bar`의 왼쪽 축을 그대로 나눠 쓴다**
   * (사용자 수와 조회 수처럼 실제로 같은 자릿수인 지표에만 쓸 것 — 스케일이 다르면 한쪽이 깔린다).
   * ⚠️ 축 도메인은 `bar`·`bar2` 값의 합집합으로 잡는다(안 그러면 `bar2`가 `bar`보다 클 때 잘린다).
   */
  bar2?: ComboSeries;
  /** 같은 규모의 두 번째 계열(선, 자기 전용 오른쪽 축) — 없으면 그리지 않는다. */
  line?: ComboSeries;
  /** 파생 계열(비율·단가 등, 점선 + 숨긴 축). */
  dashed?: ComboSeries;
  /**
   * 모수 계열에 최소제곱 추세선(계열색 점선)을 얹는다 — 범례·툴팁에서 제외한다
   * (계열 스위치가 두 배로 불어나고 툴팁에 관측되지 않은 값이 섞인다. trend-charts와 같은 규칙).
   */
  trend?: boolean;
  /**
   * 모수를 **막대 대신 꺾은선**으로 그린다(2026-08-03 요청 "조회수 제외 전부 막대차트도 꺾은선 차트로
   * 변경하고 추세선 표시"). 막대는 '기간마다 담긴 양'(조회수처럼 그 달에 발생한 합)에 맞고, 스냅샷·
   * 누적·단가처럼 **이어지는 값**은 선이 흐름을 더 정직하게 말한다(막대는 0 기준 면적이 있어 스냅샷을
   * '그 달에 새로 생긴 양'으로 오독하게 만든다).
   */
  asLine?: boolean;
  /**
   * 모수 축 스케일. 기본 `linear`(0 기준 — 막대의 길이 비교가 성립한다).
   *  · `tight` = 선형 + **데이터 범위**(0 기준 포기). 지점수 5,712~5,860처럼 값이 크고 변동이 좁아
   *    0 기준 축에서 평평해 보이는 계열용. **로그보다 이쪽을 먼저 쓴다.**
   *  · `log` = 여러 자릿수를 한 축에 담을 때만(예: 100 vs 100,000). ⚠️ 좁은 범위에 걸면 눈금 간격이
   *    불균등해 **작은 변동이 과장**된다(2026-08-03 지적 "지점수는 로카리듬이 너무 과함" → tight로 교체).
   * ⚠️ 두 옵션 모두 0 기준선을 버리므로 막대(길이 비교)에는 쓰지 말 것.
   */
  barScale?: 'linear' | 'log' | 'tight';
  height?: number;
  ariaLabel: string;
}) {
  const barAxis = useMemo(() => {
    // ⚠️ `bar2`가 있으면 도메인을 **합집합**으로 잡는다 — `bar` 값만 보면 `bar2`가 더 큰 지점에서
    // 잘린다(예: 사용자가 조회보다 많은 날).
    const keys = bar2 ? [bar.key, bar2.key] : [bar.key];
    const vals = data.flatMap((d) => keys.map((k) => Number(d[k]))).filter((v) => Number.isFinite(v));
    return barScale === 'tight' ? tightDomain(vals) : baselineDomain(vals, BAR_TOP);
  }, [data, bar.key, bar2?.key, barScale]);
  const lineAxis = useMemo(
    () =>
      line
        ? layerDomain(
            data.map((d) => Number(d[line.key])).filter((v) => Number.isFinite(v)),
            LAYER.inquiries.lo,
            LAYER.inquiries.hi,
          )
        : null,
    [data, line],
  );
  // 🚨 **파생 계열의 띠 높이는 선 계열 유무가 정한다**(2026-08-03 지적 "객단가 등 같은거 변동이 잘
  // 안보이는 건 변동잘보이게하고"). 파생을 늘 하단 5~34%에 눌러 넣으면 변동폭이 화면 높이의 29%로
  // 압축돼 객단가·문의율이 거의 직선으로 보인다. 선 계열이 없는 차트(막대+점선 2계열)는 위쪽이
  // 비어 있으므로 **5~68%까지 넓혀** 같은 변동을 2배 이상 크게 그린다. 선이 있으면 그 층(50~92%)과
  // 겹치므로 원래대로 좁게 둔다.
  const dashedAxis = useMemo(
    () =>
      dashed
        ? layerDomain(
            data.map((d) => Number(d[dashed.key])).filter((v) => Number.isFinite(v)),
            LAYER.rate.lo,
            line ? LAYER.rate.hi : 0.68,
          )
        : null,
    [data, dashed, line],
  );
  // 구간이 많으면 막대 폭이 1~2px가 되어 자동으로 선이 된다. `asLine`은 그와 무관하게 항상 선.
  const many = asLine || data.length > BAR_MAX_POINTS;
  // 추세값 컬럼(`<key>__t`)을 붙인다 — 원 데이터는 건드리지 않는다.
  // 🚨 **꺾은선 계열엔 항상**(선 계열·파생 점선, 그리고 모수가 선으로 그려질 때 그 모수까지).
  //    모수가 막대인데 `trend`를 명시로 켠 차트는 그 뜻대로 막대 위 추세선을 남긴다(월간 흐름 조회수).
  const rows = useMemo(() => {
    const keys = [
      ...(trend || many ? [{ key: bar.key }] : []),
      ...(bar2 && trend ? [{ key: bar2.key }] : []), // bar2는 항상 선이라 line과 같은 추세 규칙
      ...(line ? [{ key: line.key }] : []),
      ...(dashed ? [{ key: dashed.key }] : []),
    ];
    return withTrend(data as unknown as Record<string, unknown>[], keys) as MetricComboPoint[];
  }, [data, trend, many, bar.key, bar2, line, dashed]);
  const dense = data.length > DENSE_POINTS; // 마커 판정 — `many`(막대→선)와 다른 축이다

  const toggle = useSeriesToggle();
  const fmtBy = (name: string, v: number) => {
    if (bar2 && name === bar2.name) return bar2.fmt(v);
    if (line && name === line.name) return line.fmt(v);
    if (dashed && name === dashed.name) return dashed.fmt(v);
    return bar.fmt(v);
  };

  if (data.length === 0) return <Empty height={height} />;
  return (
    <div role="img" aria-label={ariaLabel} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} minTickGap={14} />
          {barScale === 'log' ? (
            <YAxis
              yAxisId="bar"
              scale="log"
              domain={['dataMin', 'dataMax']}
              allowDataOverflow
              tickFormatter={(v: number) => bar.fmt(v)}
              tick={{ fontSize: 11, fill: bar.color }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
          ) : (
            <YAxis
              yAxisId="bar"
              domain={barAxis.domain}
              ticks={barAxis.ticks}
              tickFormatter={(v: number) => bar.fmt(v)}
              tick={{ fontSize: 11, fill: bar.color }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
          )}
          {line && lineAxis && (
            <YAxis
              yAxisId="line"
              orientation="right"
              domain={lineAxis.domain}
              ticks={lineAxis.ticks}
              tickFormatter={(v: number) => line.fmt(v)}
              tick={{ fontSize: 11, fill: line.color }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
          )}
          {dashed && dashedAxis && <YAxis yAxisId="dashed" hide domain={dashedAxis.domain} />}
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [fmtBy(n, v), n]} />
          <Legend {...toggle.legendProps} />
          {many ? (
            <Line
              hide={toggle.isHidden(bar.key)}
              yAxisId="bar"
              type="linear"
              dataKey={bar.key}
              name={bar.name}
              isAnimationActive={false}
              stroke={bar.color}
              strokeWidth={2.25}
              dot={seriesDot(dense)}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          ) : (
            <Bar
              hide={toggle.isHidden(bar.key)}
              yAxisId="bar"
              dataKey={bar.key}
              name={bar.name}
              fill={bar.color}
              fillOpacity={BAR_OPACITY}
              maxBarSize={38}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          )}
          {bar2 && (
            <Line
              hide={toggle.isHidden(bar2.key)}
              yAxisId="bar"
              type="linear"
              dataKey={bar2.key}
              name={bar2.name}
              isAnimationActive={false}
              stroke={bar2.color}
              strokeWidth={2.25}
              dot={seriesDot(dense)}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          )}
          {line && (
            <Line
              hide={toggle.isHidden(line.key)}
              yAxisId="line"
              type="linear"
              dataKey={line.key}
              name={line.name}
              isAnimationActive={false}
              stroke={line.color}
              strokeWidth={2.25}
              dot={seriesDot(dense)}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          )}
          {dashed && (
            <Line
              hide={toggle.isHidden(dashed.key)}
              yAxisId="dashed"
              type="linear"
              dataKey={dashed.key}
              name={dashed.name}
              isAnimationActive={false}
              stroke={dashed.color}
              strokeWidth={2}
              strokeDasharray={DERIVED_DASH}
              dot={derivedDot(dense, dashed.color)} /* 실측 파생값 → 구슬 마커를 남긴다(마커 없는 성긴 점선 = 추세선) */
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          )}
          {/* 모수 추세선 — 원계열을 끄면 함께 꺼진다(hide를 원계열 키로 판정). 범례·툴팁 제외.
              스타일은 공용 `trendLineProps`(성긴 원형 점선·마커 없음) — 실측 점선과 형태로 갈린다. */}
          {(trend || many) && (
            <Line
              hide={toggle.isHidden(bar.key)}
              yAxisId="bar"
              dataKey={TREND_KEY(bar.key)}
              name={`${bar.name} 추세`}
              {...trendLineProps(bar.color)}
            />
          )}
          {bar2 && trend && (
            <Line
              hide={toggle.isHidden(bar2.key)}
              yAxisId="bar"
              dataKey={TREND_KEY(bar2.key)}
              name={`${bar2.name} 추세`}
              {...trendLineProps(bar2.color)}
            />
          )}
          {line && (
            <Line
              hide={toggle.isHidden(line.key)}
              yAxisId="line"
              dataKey={TREND_KEY(line.key)}
              name={`${line.name} 추세`}
              {...trendLineProps(line.color)}
            />
          )}
          {dashed && (
            <Line
              hide={toggle.isHidden(dashed.key)}
              yAxisId="dashed"
              dataKey={TREND_KEY(dashed.key)}
              name={`${dashed.name} 추세`}
              {...trendLineProps(dashed.color)}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
