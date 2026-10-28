'use client';

// 대시보드 공용 추세 차트(단일 계열) — 막대/라인.
// 이 파일이 생긴 이유: 통합·고방 대시보드가 각자 손으로 그린 SVG를 갖고 있어(약 150줄 × 2벌)
// 마우스를 올려도 수치가 안 보였다. recharts는 이미 트래픽 대시보드에서 쓰는 의존성이라
// 새 패키지 없이 툴팁·격자·축을 얻고, 차트 정의를 한 벌로 합친다.
// 색은 디자인시스템 상속 — 민트 채움 전용(무지개 금지).
//
// 🚨 **`<Line>`은 항상 `isAnimationActive={false}`** — 이 파일의 `TrendDualLine`·combo-charts.tsx의
// 모든 Bar/Line엔 이미 있었는데 `TrendLine`·`TrendMultiLine`(스트림별 트래픽 등)만 빠져 있었다
// (2026-08-05 실측 사고). 리포트 HTML 저장이 화면 DOM을 그대로 캡처하는데, recharts 기본 reveal
// 애니메이션이 끝나기 전에 캡처되면 그 순간의 `stroke-dasharray`(부분 그려진 길이)가 **그대로
// 굳어 파일에 박힌다** — 실측: "스트림별 트래픽"에서 세 계열 모두 dasharray가 "125px 411px"
// 근처(전체 길이의 23%만 그려진 상태)로 저장돼 차트가 1/4 지점에서 잘린 것처럼 보였다. 애니메이션을
// 끄면 처음부터 완성된 경로만 그려지므로 언제 캡처해도 항상 완전한 선이다(추세선은 원래도
// `trendLineProps`에 꺼져 있어 안 잘렸다 — 그래서 사고 스크린샷에서 점선만 끝까지 그려져 있었다).

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Platform } from '@/lib/metrics';
import { linearTrend } from '@/lib/inquiries';
import { useSeriesToggle } from '@/components/charts/use-series-toggle';

export const MINT = '#25b9b9'; // primary-fill (채움/막대/라인)
export const MINT_DARK = '#0f766e';
export const GREEN = '#1baa5a'; // success (SNS 등 보조 계열)
export const AMBER = '#f2971c'; // accent (조회=민트와 짝을 이루는 문의 계열)

// 스트림(web/android/ios) 고정 색 — 민트 명암 변주. 지표 대시보드·트래픽 리포트와 같은 값이어야
// 같은 스트림이 화면마다 다른 색으로 보이지 않는다(정본 1벌).
export const PLATFORM_COLOR: Record<Platform, string> = {
  web: '#0f766e',
  android: '#25b9b9',
  ios: '#8ad9d9',
};
// U사장님 / U중개사 채널 색 — 두 서비스가 한 화면 안 여러 조각(문의 출처 도넛 · 채널별 조회·문의·
// 문의율 추이)에서 같은 색으로 읽히게 정본 1벌만 둔다. 명암 변주(진한 청록 / 연한 민트)라
// "어느 선이 누구냐"를 한 번만 익히면 된다.
export const CHANNEL_COLOR = { usajang: '#0f766e', ujunggae: '#4dc2c2' } as const;

// 계열 수가 데이터에 따라 달라지는 축(GA4 소스/매체 등)의 색 — 민트 명암 변주 12단(무지개 금지).
// 정본 1벌: 트래픽 대시보드의 채널 추이·주간 흐름·리포트의 채널별 트래픽이 같은 램프를 쓴다.
export const MINT_RAMP = [
  '#0d5f5a', '#0f766e', '#12897f', '#159a92', '#25b9b9', '#43c4c1',
  '#5fcfcf', '#7cd8d8', '#98e0e0', '#b3e8e8', '#c9efef', '#dcf5f5',
];

// 램프 끝 3단(#c9efef 이하)은 흰 카드 위에서 선이 거의 안 보인다 — 계열 색으로는 쓰지 않는다
// (도넛·막대처럼 면으로 칠할 때만 유효한 밝기다).
const RAMP_LEGIBLE = MINT_RAMP.length - 3;

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * 계열 `i`(전체 `total`개)의 색 — 읽히는 구간(진한 쪽 9단)을 **하나의 그라데이션으로 보고** 고르게
 * 샘플링한다. 램프 칸을 반올림해 집으면 계열이 9개를 넘는 순간 두 계열이 **같은 색**이 되고(10개
 * 요청, 2026-09-14), 끝까지 벌리면 마지막 선이 흰 배경에 묻힌다. 칸 사이 값은 선형 보간한다 —
 * 색 정의는 여전히 `MINT_RAMP` 한 벌뿐이다.
 */
export const mintRampAt = (i: number, total: number) => {
  if (total <= 1) return MINT_RAMP[0];
  const x = (i * (RAMP_LEGIBLE - 1)) / (total - 1);
  const lo = Math.floor(x);
  const hi = Math.min(lo + 1, RAMP_LEGIBLE - 1);
  const t = x - lo;
  const [a, b] = [hexToRgb(MINT_RAMP[lo]), hexToRgb(MINT_RAMP[hi])];
  return rgbToHex(a.map((v, c) => v + (b[c] - v) * t));
};

/** 채널(소스/매체) 계열 정의 — 채널 목록이 데이터마다 달라 색을 고정할 수 없다(순위 순으로 램프 배정). */
export const channelSeriesDefs = (channels: string[]): MultiSeriesDef[] =>
  channels.map((c, i) => ({ key: c, name: c, color: mintRampAt(i, channels.length) }));
const GRID = '#eceff2';
const AXIS = '#6d7379';

export const chartTooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e6eb',
} as const;

// key = 정렬·식별용 원본값(YYYY-MM 등), label = 축에 찍는 글자.
export type TrendPoint = { key: string; label: string; value: number };

type CommonProps = {
  data: TrendPoint[];
  valueName: string; // 툴팁 계열 이름 (예: '매출', 'MAU')
  fmt: (n: number) => string; // 툴팁·축 표기 (fmtMan / fmtInt 등)
  height?: number;
  color?: string;
  emptyText?: string;
};

function Empty({ height, text }: { height: number; text: string }) {
  return (
    <div className="grid place-items-center text-sm text-ink-mute" style={{ height }}>
      {text}
    </div>
  );
}

// 툴팁 라벨 = 그 점의 label(축 글자와 동일). recharts는 dataKey='label'을 x축으로 쓰므로 그대로 나온다.
const axisTick = { fontSize: 12, fill: AXIS } as const;

export function TrendBars({
  data,
  valueName,
  fmt,
  height = 190,
  color = MINT,
  emptyText = '데이터 없음',
}: CommonProps) {
  if (!data.length) return <Empty height={height} text={emptyText} />;
  return (
    <div role="img" aria-label={`${valueName} 추이`} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => fmt(v)} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            cursor={{ fill: '#f5f6f7' }}
            formatter={(v: number) => [fmt(v), valueName]}
          />
          <Bar dataKey="value" name={valueName} fill={color} radius={[3, 3, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLine({
  data,
  valueName,
  fmt,
  height = 210,
  color = MINT,
  emptyText = '데이터 없음',
  trend = TREND_DEFAULT,
}: CommonProps & { trend?: boolean }) {
  // 추세선 컬럼(`value__t`)을 붙인다 — 훅 순서 고정을 위해 빈 데이터 체크보다 위에서 부른다.
  const rows = useMemo(() => withTrend(data as unknown as Record<string, unknown>[], [{ key: 'value' }], trend), [data, trend]);
  if (!data.length) return <Empty height={height} text={emptyText} />;
  return (
    <div role="img" aria-label={`${valueName} 추이`} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => fmt(v)} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [fmt(v), valueName]} />
          <Line
            type="linear"
            dataKey="value"
            name={valueName}
            stroke={color}
            strokeWidth={2.5}
            isAnimationActive={false}
            dot={dotFor(rows.length, 3)}
            activeDot={{ r: 5 }}
          />
          {/* ⚠️ 계열은 차트의 직접 자식이어야 한다(래퍼·Fragment 금지 — 조용히 사라진다). */}
          {trend && <Line dataKey={TREND_KEY('value')} name={`${valueName} 추세`} {...trendProps(color)} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 2계열 이중축 라인 ──────────────────────────────────
// 단위는 같지만 자릿수가 벌어지는 두 계열(조회 28만 vs 문의 9천 = 30배)용. 한 축에 겹치면
// 작은 계열이 바닥에 눌려 추세가 안 보인다. ⚠️ 축은 좌/우 2개까지 — 같은 orientation Y축을
// 2개 이상 두면 recharts가 같은 자리에 겹쳐 그린다(3축 배치 금지, CLAUDE.md §지표 화면).
export function TrendDualLine({
  data,
  left,
  right,
  fmt,
  ariaLabel,
  height = 200,
  emptyText = '데이터 없음',
  trend = TREND_DEFAULT,
}: {
  // null = 그 구간에 계열이 없음(선이 끊긴다). 0으로 채우면 급락으로 오독된다.
  data: Array<{ key: string; label: string } & Record<string, string | number | null>>;
  left: MultiSeriesDef;
  right: MultiSeriesDef;
  fmt: (n: number) => string;
  ariaLabel: string;
  height?: number;
  emptyText?: string;
  trend?: boolean; // 계열별 추세선(각자 축의 성긴 점선). 기본 켜짐.
}) {
  // 범례 클릭으로 계열 껐다 켜기(공용 훅). 빈 데이터일 때도 훅 순서가 바뀌지 않게 조건문보다 위에서 부른다.
  const toggle = useSeriesToggle();
  const rows = useMemo(() => withTrend(data, [left, right], trend), [data, left, right, trend]);
  if (!data.length) return <Empty height={height} text={emptyText} />;
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis
            yAxisId="left"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => fmt(v)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => fmt(v)}
          />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, n) => [fmt(v), String(n)]} />
          <Legend {...toggle.legendProps} />
          {[
            { axis: 'left', s: left },
            { axis: 'right', s: right },
          ].map(({ axis, s }) => (
            <Line
              key={s.key}
              hide={toggle.isHidden(s.key)}
              yAxisId={axis}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2.25}
              isAnimationActive={false}
              dot={dotFor(rows.length, 2.5)}
              activeDot={{ r: 4 }}
            />
          ))}
          {/* 계열별 추세선 — 원계열을 끄면 함께 꺼진다. 범례·툴팁 제외(trendProps). */}
          {trend &&
            [
              { axis: 'left', s: left },
              { axis: 'right', s: right },
            ].map(({ axis, s }) => (
              <Line
                key={TREND_KEY(s.key)}
                hide={toggle.isHidden(s.key)}
                yAxisId={axis}
                dataKey={TREND_KEY(s.key)}
                name={`${s.name} 추세`}
                {...trendProps(s.color)}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 다계열 라인 ────────────────────────────────────────
// 계열을 한 축에 겹쳐 그린다. 스케일이 비슷한 같은 단위 계열(스트림별 MAU 등)에만 쓸 것 —
// 100배 이상 벌어지는 계열 묶음은 weekly-trend-combo.tsx의 '높이 층' 방식이 정답이다.
export type MultiSeriesDef = { key: string; name: string; color: string };

// 점이 이보다 많으면 마커(dot)를 지운다 — 일 버킷(84점)에서 점이 겹쳐 선이 두꺼운 띠로 뭉친다.
// activeDot은 남기므로 호버하면 그 점은 보인다(combo-charts의 '60개 초과 시 막대→선'과 같은 결).
export const DENSE_POINTS = 45;

// ── 점선 어휘 (2026-08-04 신설) ────────────────────────────────────────────────
// 🚨 이 프로젝트의 점선은 **두 종류**인데 지금까지 둘 다 `5 4`/`5 3` 대시라 한눈에 안 갈렸다
// (지적: "추세선이랑 일반차트랑 구분이 좀 더 잘 보이게 변경해. 가령 점선 꺾은선에도 dot을 넣는다던지").
//   ① **실측 파생 계열**(문의율·객단가·비율 등) = 그 구간에 진짜 관측값이 있다
//      → 촘촘한 대시(`DERIVED_DASH`) + **점 마커**(배경색 테두리를 둘러 선 위에 도드라진다).
//   ② **추세선**(최소제곱) = 관측된 적 없는 계산선
//      → 성긴 원형 점선(`TREND_DASH` + round cap) + **마커 없음** + 흐림.
// 점의 유무가 "이 선에 실제 값이 있느냐"를 말한다 — 계열색이 같아도 형태로 갈린다.
// 화면에서 dash 값을 손으로 적지 말 것(그렇게 해서 같은 뜻의 점선이 5곳에서 3가지 값이 됐다).
export const DERIVED_DASH = '6 3';
export const TREND_DASH = '1 6';

/**
 * 실선 계열의 점 마커. `dense`(점이 너무 많음)면 지운다 — 겹쳐서 선이 두꺼운 띠로 뭉친다.
 * ⚠️ 여기에 배경색 테두리를 두르지 말 것 — 주 26점처럼 촘촘한 선에서는 흰 링이 선을 갉아
 * **실선이 점선처럼 끊겨 보인다**(2026-08-04 실측: 스트림별 트래픽이 통째로 점선으로 보였다).
 * 링은 이미 끊겨 있는 파생 점선(`derivedDot`) 전용이다.
 */
export const seriesDot = (dense: boolean, r = 2.5) => (dense ? (false as const) : ({ r } as const));

/**
 * 파생 점선(문의율·객단가 등)의 점 마커 — **속 빈 구슬**(배경색 채움 + 계열색 테두리)이다.
 * 꽉 찬 점을 계열색으로 찍으면 같은 색 대시와 뭉쳐 그냥 두꺼운 대시로 보인다(실측) → 속을 비워
 * 대시 위에 얹힌 마커로 읽히게 한다. 이 점이 "이 선에는 실제 관측값이 있다"는 신호이고,
 * 마커가 없는 성긴 점선이 추세선이다.
 */
export const derivedDot = (dense: boolean, color: string, r = 3) =>
  dense ? (false as const) : ({ r, fill: 'var(--color-surface)', stroke: color, strokeWidth: 1.6 } as const);

/** 점 개수로 판정하는 축약형(기존 호출부 유지) — `n`은 데이터 포인트 수. */
const dotFor = (n: number, r: number) => seriesDot(n > DENSE_POINTS, r);

// 추세선을 범례·툴팁에서 빼는 이유: 계열 수가 두 배로 불어나 범례가 원계열을 켜고 끄는 스위치가
// 아니게 되고, 툴팁엔 실제로 관측되지 않은 값이 섞인다. 데이터 컬럼은 `<key>__t`.
export const TREND_KEY = (key: string) => `${key}__t`;

/** 추세선 공용 props — 이 한 벌만 쓴다(trend-charts·combo-charts·conversion-trend·weekly-trend-combo). */
export const trendLineProps = (color: string) => ({
  type: 'linear' as const,
  stroke: color,
  strokeWidth: 1.75,
  strokeDasharray: TREND_DASH,
  strokeLinecap: 'round' as const, // 성긴 대시를 둥근 점으로 — '계산된 보조선'이라는 신호
  strokeOpacity: 0.5,
  dot: false as const,
  activeDot: false as const,
  legendType: 'none' as const,
  tooltipType: 'none' as const,
  isAnimationActive: false,
});
const trendProps = trendLineProps;

/**
 * 🚨 **꺾은선에는 항상 추세선을 함께 그린다**(2026-08-04 사용자 규칙 "꺾은선 차트 보여줄 때는 항상
 * 추세선도 함께 표현"). 그래서 공용 차트들의 `trend` 기본값은 **true**다 — 화면마다 켜는 방식이면
 * 새 차트를 만들 때마다 조용히 빠진다(실제로 `TrendLine`·`TrendDualLine`엔 옵션조차 없었고,
 * `TrendMultiLine`·`ConversionTrend`·`WeeklyTrendCombo`는 켠 화면과 안 켠 화면이 갈려 있었다).
 * 막대에는 적용하지 않는다(모수를 선으로 그리는 차트는 그때 선 규칙을 따른다).
 */
export const TREND_DEFAULT = true;

// 계열마다 최소제곱 추세값 컬럼을 붙인다(원 데이터는 건드리지 않는다).
export function withTrend<T extends Record<string, unknown>>(
  data: T[],
  series: { key: string }[],
  on: boolean = TREND_DEFAULT,
) {
  if (!on) return data;
  const cols = series.map((s) => [
    TREND_KEY(s.key),
    linearTrend(data.map((d) => (typeof d[s.key] === 'number' ? (d[s.key] as number) : null))),
  ] as const);
  return data.map((row, i) => {
    const out: Record<string, unknown> = { ...row };
    for (const [k, vals] of cols) out[k] = vals[i];
    return out as T;
  });
}

// ── 계열 클릭 강조 (2026-09-08 트래픽 대시보드에서 확정한 어휘 → 2026-09-14 공용화) ──────────
//
// 🚨 **다계열 꺾은선은 클릭 강조가 기본이다.** 계열이 여러 개면 "이 선 하나만 자세히" 보고 싶은
// 순간이 반드시 오는데, 범례 토글(껐다 켜기)은 나머지를 지워 버려 비교가 끊긴다. 클릭 강조는
// 고른 계열을 앰버로 올리고 나머지는 옅게 남겨(0.35) 비교를 유지한다.
//   · 클릭 = 그 계열만 강조 / 같은 계열 재클릭·빈 자리 클릭 = 해제
//   · 툴팁 = 값 내림차순 + **마우스가 올라간 계열**만 굵게(클릭 포커스와 다른 축이다)
// 트래픽 대시보드(metrics-dashboard)에 로컬로 있던 구현을 여기로 올렸다 — 두 벌이면 강조 색·
// 흐림 정도·툴팁 정렬이 화면마다 갈린다(공용 조각 규칙, global-rules-charts.md).

/** Recharts 툴팁 payload 중 우리가 쓰는 필드. */
type TooltipEntry = { dataKey?: string | number; name?: string; value?: number | string; color?: string };

/**
 * 다계열 툴팁 — 값 큰 순으로 정렬하고 `hoverKey` 계열만 굵게 쓴다.
 * ⚠️ 커스텀 content를 쓰면 recharts의 `itemSorter`·`tooltipType:'none'`이 **무시된다** → 추세선
 *    (`<key>__t`)과 클릭 히트용 투명 선을 여기서 직접 걸러야 한다(투명 선은 color가 문자열
 *    'transparent'로 잡힌다 — 안 거르면 계열마다 툴팁 행이 두 줄씩 찍힌다).
 */
export function TrendTooltip({
  active,
  payload,
  label,
  hoverKey,
  fmt,
  labelSuffix = '',
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  hoverKey: string | null;
  fmt: (n: number) => string;
  labelSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const real = payload.filter((p) => !String(p.dataKey ?? '').endsWith('__t') && p.color !== 'transparent');
  const sorted = [...real].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  return (
    <div style={{ ...chartTooltipStyle, background: 'var(--color-surface)' }} className="px-3 py-2 shadow-sm">
      <div className="mb-1 font-medium text-ink-soft">{`${label ?? ''}${labelSuffix}`}</div>
      <div className="space-y-0.5">
        {sorted.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? '');
          const on = hoverKey !== null && key === hoverKey;
          return (
            <div key={key} className="flex items-center justify-between gap-3" style={{ fontWeight: on ? 700 : 400 }}>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: entry.color }}
                  aria-hidden
                />
                <span style={{ color: on ? entry.color : undefined }}>{entry.name}</span>
              </span>
              <span style={{ color: on ? entry.color : undefined }}>{fmt(Number(entry.value) || 0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type LegendEntry = { dataKey?: unknown; value?: unknown };
const stopAndToggle = (k: string, set: (fn: (prev: string | null) => string | null) => void) =>
  (...args: unknown[]) => {
    // recharts는 마지막 인자로 DOM 이벤트를 준다 — 차트 배경 onClick(해제)까지 타지 않게 막는다.
    const event = args[args.length - 1] as { stopPropagation?: () => void } | undefined;
    event?.stopPropagation?.();
    set((prev) => (prev === k ? null : k));
  };

/** 클릭 강조 상태 한 벌 — 계열이 2개 이상인 꺾은선은 이 훅만 쓴다(화면에서 다시 짜지 말 것). */
export function useSeriesFocus() {
  const [focusKey, setFocusKey] = useState<string | null>(null);
  // 툴팁 굵게 전용 — 클릭 포커스와 별개다. 아래 히트 선의 enter/leave가 갱신한다.
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const isDim = (key: string) => focusKey !== null && focusKey !== key;
  /** 강조 색은 앰버(design-system.md §차트 색 매핑의 '차트 클릭' 색) — 굵기로 강조하지 않는다. */
  const strokeOf = (key: string, color: string) => (focusKey === key ? AMBER : color);
  const opacityOf = (key: string) => (isDim(key) ? 0.35 : 1);

  /** 포커스된 계열을 배열 맨 뒤로 — SVG상 맨 위에 그려져 겹친 선에 안 가린다. */
  const order = <T,>(items: T[], keyOf: (item: T) => string) => {
    if (!focusKey || !items.some((it) => keyOf(it) === focusKey)) return items;
    return [...items.filter((it) => keyOf(it) !== focusKey), ...items.filter((it) => keyOf(it) === focusKey)];
  };

  /** 차트 빈 자리 클릭 = 해제. */
  const chartProps = { onClick: () => setFocusKey(null) };

  /**
   * 클릭 판정 전용 투명 선(굵기 14) — 실선(2px)은 마우스로 정확히 맞히기 어려워 "클릭이 안 먹는다"가
   * 된다. 범례·툴팁엔 안 뜨고, 같은 선의 enter/leave로 hoverKey를 갱신한다.
   */
  const hitProps = (key: string) => ({
    type: 'linear' as const,
    dataKey: key,
    stroke: 'transparent',
    strokeWidth: 14,
    dot: false as const,
    activeDot: false as const,
    legendType: 'none' as const,
    tooltipType: 'none' as const,
    isAnimationActive: false,
    cursor: 'pointer',
    onMouseEnter: () => setHoverKey(key),
    onMouseLeave: () => setHoverKey((prev) => (prev === key ? null : prev)),
    onClick: stopAndToggle(key, setFocusKey),
  });

  /** 실선 계열에 얹는 조각(클릭 자체는 히트 선이 받지만 선을 바로 눌러도 되게 둔다). */
  const seriesProps = (key: string) => ({ cursor: 'pointer', onClick: stopAndToggle(key, setFocusKey) });

  /** 범례 — 껐다 켜기(useSeriesToggle) 위에 흐림·굵게만 얹는다. */
  const legendProps = (base: ReturnType<typeof useSeriesToggle>['legendProps']) => ({
    ...base,
    formatter: (value: string, entry?: LegendEntry) => {
      const key = String(entry?.dataKey ?? entry?.value ?? value);
      const dimmed = focusKey !== null && focusKey !== key;
      const focused = focusKey !== null && focusKey === key;
      return (
        <span style={{ opacity: dimmed ? 0.35 : 1, fontWeight: focused ? 700 : undefined }}>
          {base.formatter(value, entry)}
        </span>
      );
    },
  });

  return { focusKey, hoverKey, isDim, strokeOf, opacityOf, order, chartProps, hitProps, seriesProps, legendProps };
}

export function TrendMultiLine({
  data,
  series,
  fmt,
  ariaLabel,
  height = 200,
  emptyText = '데이터 없음',
  trend = TREND_DEFAULT,
  labelSuffix = '',
  yDomain,
  denseDots = false,
}: {
  // null = 그 구간에 계열이 없음(선이 끊긴다). 0으로 채우면 급락으로 오독된다.
  data: Array<{ key: string; label: string } & Record<string, string | number | null>>;
  series: MultiSeriesDef[];
  fmt: (n: number) => string;
  ariaLabel: string;
  height?: number;
  emptyText?: string;
  trend?: boolean; // 계열별 추세선(점선) 겹치기
  labelSuffix?: string; // 툴팁 제목 접미사(예: ' 주')
  // 세로축 범위를 직접 준다. 평점처럼 0부터 시작하면 안 되는(1~5점 척도) 지표용 — 안 주면 Recharts 기본(0부터).
  yDomain?: [number, number];
  // 점이 많아도(DENSE_POINTS 초과) 작은 점을 남긴다. 몇 년치를 한 번에 보는 앱 대시보드용(2026-10-18 토미 지시).
  denseDots?: boolean;
}) {
  // 범례 클릭으로 계열 껐다 켜기 + 선 클릭으로 한 계열 강조(공용 훅 2벌) —
  // 조건문보다 위에서 부른다(훅 순서 고정).
  const toggle = useSeriesToggle();
  const focus = useSeriesFocus();
  const rows = useMemo(() => withTrend(data, series, trend), [data, series, trend]);
  // 포커스된 계열을 맨 뒤로 — 겹친 선 위에 그려진다.
  const ordered = focus.order(series, (s) => s.key);
  if (!data.length) return <Empty height={height} text={emptyText} />;
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} {...focus.chartProps}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={yDomain}
            allowDataOverflow={!!yDomain}
            tickFormatter={(v: number) => fmt(v)}
          />
          {/* 값 내림차순 + 마우스가 올라간 계열 굵게(공용 TrendTooltip) */}
          <Tooltip content={<TrendTooltip hoverKey={focus.hoverKey} fmt={fmt} labelSuffix={labelSuffix} />} />
          <Legend {...focus.legendProps(toggle.legendProps)} />
          {ordered.map((s) => (
            <Line
              key={s.key}
              hide={toggle.isHidden(s.key)}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={focus.strokeOf(s.key, s.color)}
              strokeWidth={2}
              strokeOpacity={focus.opacityOf(s.key)}
              isAnimationActive={false}
              dot={
                focus.isDim(s.key)
                  ? false
                  : denseDots && rows.length > DENSE_POINTS
                    ? { r: 1.4 }
                    : dotFor(rows.length, 2.5)
              }
              activeDot={{ r: 4.5 }}
              {...focus.seriesProps(s.key)}
            />
          ))}
          {/* ⚠️ 계열은 차트의 직접 자식이어야 한다 — 배열을 나란히 두는 건 안전하다(래퍼 금지). */}
          {trend &&
            ordered.map((s) => (
              <Line
                key={TREND_KEY(s.key)}
                hide={toggle.isHidden(s.key)}
                dataKey={TREND_KEY(s.key)}
                name={`${s.name} 추세`}
                {...trendProps(focus.strokeOf(s.key, s.color))}
                strokeOpacity={0.5 * focus.opacityOf(s.key)}
              />
            ))}
          {/* 클릭 히트 영역(투명·굵은 선) — 범례·툴팁엔 안 뜬다. */}
          {ordered.map((s) => (
            <Line key={`${s.key}__hit`} hide={toggle.isHidden(s.key)} {...focus.hitProps(s.key)} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
