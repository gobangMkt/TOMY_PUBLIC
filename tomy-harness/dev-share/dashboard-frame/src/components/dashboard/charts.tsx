'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AdBannerRow, GroupRow, Metric, Dimension } from '@/lib/ad-banner';
import {
  groupByDate,
  compareByDimension,
  withChartCtr,
  CTR_MIN_VIEWS,
  DIMENSIONS,
} from '@/lib/ad-banner';
import { fmtInt, fmtPct } from '@/lib/format';
import MetricToggle, { type MetricItem } from '@/components/dashboard/metric-toggle';
import Segmented from '@/components/ui/segmented';
import InfoTip from '@/components/ui/info-tip';
import { TREND_KEY, trendLineProps, withTrend } from '@/components/charts/trend-charts';

// design-system.md 색 매핑 + 재생(plays) 보조 스틸블루(민트/앰버/ink와 충돌 없는 4번째 계열).
const C = {
  views: '#25b9b9', // 민트 채움
  clicks: '#f2971c', // 앰버
  plays: '#3f7cac', // 스틸블루 (재생)
  ctr: '#8a9199', // 중성 슬레이트 (보조 참조선 — 막대 위에서 물러나도록 톤다운)
  grid: '#eceff2', // 저대비 그리드
  axis: '#6d7379',
};

// 지표별 표시 속성. bar=좌축 막대, line=우축(비율) 선.
// 소재비교(compare-view.tsx)도 같은 지표 정의를 쓴다 — 화면마다 라벨·색을 복제하면 갈린다.
export const METRICS: Record<Metric, { label: string; color: string; kind: 'bar' | 'line' }> = {
  views: { label: '조회', color: C.views, kind: 'bar' },
  clicks: { label: '클릭', color: C.clicks, kind: 'bar' },
  plays: { label: '재생', color: C.plays, kind: 'bar' },
  ctr: { label: '클릭률', color: C.ctr, kind: 'line' },
};
export const ALL_METRICS: Metric[] = ['views', 'clicks', 'plays', 'ctr'];
export const METRIC_ITEMS: MetricItem[] = ALL_METRICS.map((m) => ({
  value: m,
  label: METRICS[m].label,
  color: METRICS[m].color,
  kind: METRICS[m].kind,
}));

const DIMENSION_OPTS: { value: Dimension; label: string }[] = (
  Object.keys(DIMENSIONS) as Dimension[]
).map((d) => ({ value: d, label: DIMENSIONS[d].label }));

// 소재비교(compare-view.tsx)가 같은 카드 껍데기를 재사용한다.
export function ChartCard({
  title,
  note,
  hint,
  ariaLabel,
  children,
  toolbar,
  footer,
}: {
  title: string;
  note?: string; // 제목 옆 꼬리표(무엇이 빠졌는지 등). 정의·이유는 hint로.
  hint?: string;
  ariaLabel: string;
  children: React.ReactNode;
  toolbar?: React.ReactNode; // 우측 상단(기준축 등)
  footer?: React.ReactNode; // 차트 하단(지표 선택 범례)
}) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink-soft">
          {title}
          {note && <span className="text-xs font-normal text-ink-mute">{note}</span>}
          {hint && <InfoTip text={hint} />}
        </h3>
        {toolbar}
      </div>
      {/* 두 카드 높이는 같게 둔다(나란한 그리드) — 비교 차트가 기울인 x축에 74px를 쓰므로 그만큼 키웠다. */}
      <div role="img" aria-label={ariaLabel} className="h-[292px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
      {footer && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1 border-t border-hairline pt-3">
          {footer}
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e6eb',
} as const;

function fmtTooltip(value: number, name: string) {
  if (name === 'CTR' || name === '클릭률') return [fmtPct(value), name];
  return [fmtInt(value), name];
}

// 선택된 지표만 렌더. 조회·클릭·재생=좌축(또는 line 모드에서 좌축 꺾은선), 클릭률=우축 선. 축은 필요한 것만 표시.
// width/height는 ResponsiveContainer가 직속 자식에 주입 → 그대로 ComposedChart로 전달해야 함.
// 차트가 받는 행 — CTR만 null을 허용한다(표본이 얇은 구간, `withChartCtr`).
type ChartRow = Omit<GroupRow, 'ctr'> & { ctr: number | null };

// 🚨 조회는 클릭·재생보다 자릿수가 훨씬 커(2026-09-01 요청 "조회가 너무 압도적이라 나머지가
// 묻힘") 같은 축에 두면 두 지표가 바닥에 눌린다 — 조회가 함께 선택돼 있으면 클릭·재생은 그
// 둘만의 규모로 다시 스케일한 별도(숨긴) 축을 쓴다. 화면(`Charts`·`CompareView`)이 이 조건으로
// note·hint를 함께 붙인다 — 값을 조용히 바꾸면 "조회보다 클릭이 커 보인다"로 오독한다.
export function hasSplitAxis(selected: Metric[]): boolean {
  return selected.includes('views') && (selected.includes('clicks') || selected.includes('plays'));
}
export const SPLIT_AXIS_NOTE = '클릭·재생 별도 축';
// bar 모드(차원·소재 비교)는 그 보조 축이 오른쪽에 **실제 숫자로 보인다**(2026-09-01 요청
// "우측은 조회·클릭·재생 맞춤 숫자표") — line 모드(날짜별 추이)는 여전히 숨긴 채 툴팁으로만 읽는다.
export function splitAxisHint(barMode: boolean): string {
  return barMode
    ? '조회는 왼쪽 축, 클릭·재생은 오른쪽 축을 따로 쓴다 — 조회보다 숫자가 훨씬 작아 같은 축이면 ' +
      '막대가 안 보인다. 왼쪽·오른쪽 숫자를 서로 비교하지 말 것(서로 다른 축이다).'
    : '조회는 클릭·재생보다 숫자가 훨씬 커 같은 축에 두면 두 계열이 바닥에 눌려 안 보인다 — ' +
      '클릭·재생은 그 둘만의 규모로 다시 스케일한 별도 축을 쓴다. 조회와 선 높이를 직접 비교하지 말 것 — ' +
      '정확한 값은 점에 마우스를 올려 확인한다.';
}

// 🚨 bar 모드는 클릭률도 막대로 그린다(2026-09-01 요청 "CTR도 막대바"). %는 조회·클릭·재생과
// 자릿수 단위 자체가 달라(0~수%대 vs 수천~수십만) 같은 축을 쓰면 막대가 보이지 않는다 → 다른
// 지표가 하나라도 있으면 클릭률은 자기 값 범위로 스케일한 숨긴 축을 쓴다(값은 툴팁으로 읽는다).
// line 모드(날짜별 추이)는 클릭률이 그대로 %축 선이라 해당 없다.
export function hasCtrOwnAxis(selected: Metric[]): boolean {
  return (
    selected.includes('ctr') &&
    (selected.includes('views') || selected.includes('clicks') || selected.includes('plays'))
  );
}
export const CTR_AXIS_NOTE = '클릭률 별도 축';
export const CTR_AXIS_HINT =
  '클릭률은 %라 조회·클릭·재생과 자릿수 단위 자체가 달라 같은 축에 두면 막대가 안 보인다 — ' +
  '클릭률은 그 값 범위로 다시 스케일한 별도 축을 쓴다. 막대 높이를 다른 지표와 비교하지 말 것 — ' +
  '정확한 값은 막대에 마우스를 올려 확인한다.';

// 소재비교(compare-view.tsx)가 같은 조회·클릭·재생·클릭률 콤보 차트를 재사용한다.
export function MetricChart({
  data,
  selected,
  interval,
  angledLabels,
  variant = 'bar',
  width,
  height,
}: {
  data: ChartRow[];
  selected: Metric[];
  interval?: number;
  angledLabels?: boolean; // 차원 비교(긴 라벨)에서만 켠다. 날짜 축은 짧아 눕혀도 겹치지 않는다.
  // 'bar' = 조회·클릭·재생 막대(차원·소재 비교) / 'line' = 조회·클릭·재생도 꺾은선(날짜별 추이,
  // 2026-09-01 요청 "날짜별추이는 모두 꺾은선으로"). 클릭률은 어느 모드에서도 항상 선이다.
  variant?: 'bar' | 'line';
  width?: number;
  height?: number;
}) {
  const hasViews = selected.includes('views');
  const hasClicks = selected.includes('clicks');
  const hasPlays = selected.includes('plays');
  const hasCount = hasViews || hasClicks || hasPlays;
  const hasCtr = selected.includes('ctr');
  const splitAxis = hasSplitAxis(selected);
  const barMode = variant === 'bar';
  // 조회가 없으면 클릭·재생은 서로 자릿수가 비슷해 왼쪽 축을 그대로 같이 쓴다. bar 모드는 그
  // 보조 축을 오른쪽에 실제 숫자로 보여준다("우측은 조회·클릭·재생 맞춤 숫자표") — line 모드
  // (날짜별 추이)는 기존대로 숨긴 채 툴팁으로만 읽는다.
  const clicksPlaysAxisId = splitAxis ? (barMode ? 'right' : 'countAux') : 'left';
  // bar 모드는 클릭률도 막대로 그린다. 그 자리는 조회·클릭·재생이 이미 왼쪽·오른쪽 숫자축을
  // 쓰므로 %는 별도(대개 숨긴) 축을 쓴다 — 다른 지표가 하나도 없어 클릭률 혼자면 그 자체로
  // 보통 축(%)을 쓴다. line 모드는 기존대로 클릭률만 %축 선이라 항상 'right'.
  const ctrAxisId = !barMode ? 'right' : hasCount ? 'ctrAux' : 'left';
  const pctTick = (v: number) => `${(v * 100).toFixed(1)}%`;

  // 꺾은선엔 추세선을 항상 함께 그린다(공용 규칙 = trend-charts §TREND_DEFAULT, 예외 없음) —
  // 막대에는 적용하지 않는다(trend-charts.tsx). line 모드에서만 4개 지표 전부 추세선을 더한다.
  const trendKeys: { key: string }[] = [];
  if (variant === 'line') {
    if (hasCtr) trendKeys.push({ key: 'ctr' });
    if (hasViews) trendKeys.push({ key: 'views' });
    if (hasClicks) trendKeys.push({ key: 'clicks' });
    if (hasPlays) trendKeys.push({ key: 'plays' });
  }
  const rows = withTrend(data as unknown as Record<string, unknown>[], trendKeys);
  // 카테고리가 많을수록 칸이 좁아 라벨도 짧게 — 길면 옆 라벨의 꼬리와 겹쳐 읽힌다.
  const labelMax = data.length > 10 ? 14 : 18;

  // bar/line 공통 계열 렌더 — 조회·클릭·재생 3개가 variant에 따라 Bar 또는 Line으로 바뀐다.
  const seriesEl = (key: 'views' | 'clicks' | 'plays', yAxisId: string) => {
    const m = METRICS[key];
    if (variant === 'line') {
      return (
        <Line
          key={key}
          yAxisId={yAxisId}
          type="linear"
          dataKey={key}
          name={m.label}
          stroke={m.color}
          strokeWidth={2.25}
          isAnimationActive={false}
          dot={{ r: 2.5 }}
          activeDot={{ r: 4 }}
        />
      );
    }
    return (
      <Bar key={key} yAxisId={yAxisId} dataKey={key} name={m.label} fill={m.color} radius={[3, 3, 0, 0]} />
    );
  };

  return (
    <ComposedChart
      data={rows}
      width={width}
      height={height}
      // 기울인 라벨은 tick 왼쪽 아래로 뻗는다 → 첫 카테고리가 잘리지 않게 왼쪽 여백을 준다.
      margin={{ top: 8, right: 8, left: angledLabels ? 16 : 0, bottom: 0 }}
    >
      <CartesianGrid stroke={C.grid} vertical={false} />
      <XAxis
        dataKey="key"
        tick={{ fontSize: angledLabels ? 10 : 11, fill: C.axis }}
        tickLine={false}
        interval={interval}
        {...(angledLabels
          ? {
              angle: -45,
              textAnchor: 'end' as const,
              height: 74,
              tickMargin: 4,
              tickFormatter: (v: unknown) => shortLabel(v, labelMax),
            }
          : {})}
      />
      {hasCount && (
        // domain 0 고정 — 조회·클릭·재생은 음수가 없는 값인데, 꺾은선 모드는 추세선(최소제곱)이
        // 낀다. 변동이 큰 초반 구간에서 추세선이 0 밑으로 계산되면(recharts는 `allowDataOverflow`
        // 없이는 domain을 무시하고 그 값까지 축을 늘린다) 실제 계열이 바닥 아래로 처진 것처럼
        // 보인다(2026-09-01 실측) → 0에서 자르고 `allowDataOverflow`로 그 이하는 그리지 않는다.
        <YAxis
          yAxisId="left"
          domain={[0, 'auto']}
          allowDataOverflow
          tick={{ fontSize: 11, fill: C.axis }}
          tickLine={false}
          axisLine={false}
        />
      )}
      {/* 조회와 자릿수가 갈리는 클릭·재생 전용 보조 축 — bar 모드는 오른쪽에 실제 숫자로,
          line 모드는 값은 툴팁으로 읽으므로 눈금을 숨긴다. */}
      {splitAxis &&
        (barMode ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 'auto']}
            allowDataOverflow
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={false}
          />
        ) : (
          <YAxis yAxisId="countAux" hide domain={[0, 'auto']} allowDataOverflow />
        ))}
      {hasCtr &&
        (!barMode ? (
          <YAxis
            yAxisId="right"
            orientation={hasCount ? 'right' : 'left'}
            domain={[0, 'auto']}
            allowDataOverflow
            tickFormatter={pctTick}
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={false}
          />
        ) : hasCount ? (
          // 클릭률 전용 숨긴 축 — 조회(left)·클릭·재생(right)이 이미 숫자축을 쓰고 있어 %를
          // 또 보이는 축으로 얹으면 넷째 축이 생긴다. 값은 막대에 마우스를 올려 확인한다.
          <YAxis yAxisId="ctrAux" hide domain={[0, 'auto']} allowDataOverflow />
        ) : (
          <YAxis
            yAxisId="left"
            orientation="left"
            domain={[0, 'auto']}
            allowDataOverflow
            tickFormatter={pctTick}
            tick={{ fontSize: 11, fill: C.axis }}
            tickLine={false}
            axisLine={false}
          />
        ))}
      <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltip} cursor={{ fill: '#f5f6f7' }} />
      {hasViews && seriesEl('views', 'left')}
      {hasClicks && seriesEl('clicks', clicksPlaysAxisId)}
      {hasPlays && seriesEl('plays', clicksPlaysAxisId)}
      {hasCtr &&
        (barMode ? (
          <Bar yAxisId={ctrAxisId} dataKey="ctr" name={METRICS.ctr.label} fill={C.ctr} radius={[3, 3, 0, 0]} />
        ) : (
          <Line
            yAxisId={ctrAxisId}
            type="linear"
            dataKey="ctr"
            name={METRICS.ctr.label}
            stroke={C.ctr}
            strokeWidth={2.25}
            isAnimationActive={false}
            dot={{ r: 2.5 }}
            activeDot={{ r: 4 }}
          />
        ))}
      {/* ⚠️ 계열은 차트의 직접 자식 — 조건식으로만 분기한다(래퍼로 묶으면 조용히 사라진다). */}
      {variant === 'line' && hasCtr && (
        <Line
          yAxisId={ctrAxisId}
          dataKey={TREND_KEY('ctr')}
          name={`${METRICS.ctr.label} 추세`}
          {...trendLineProps(C.ctr)}
        />
      )}
      {variant === 'line' && hasViews && (
        <Line yAxisId="left" dataKey={TREND_KEY('views')} name={`${METRICS.views.label} 추세`} {...trendLineProps(C.views)} />
      )}
      {variant === 'line' && hasClicks && (
        <Line
          yAxisId={clicksPlaysAxisId}
          dataKey={TREND_KEY('clicks')}
          name={`${METRICS.clicks.label} 추세`}
          {...trendLineProps(C.clicks)}
        />
      )}
      {variant === 'line' && hasPlays && (
        <Line
          yAxisId={clicksPlaysAxisId}
          dataKey={TREND_KEY('plays')}
          name={`${METRICS.plays.label} 추세`}
          {...trendLineProps(C.plays)}
        />
      )}
    </ComposedChart>
  );
}

// 차원 비교 차트의 x축 라벨은 길다(`contents_contents_bottom_1000` 28자). 그대로 뉘면 7개만 돼도
// 서로 겹쳐 글자가 뭉개진다 → 45°로 세우고 길이를 자른다(45°면 라벨 간 세로 간격 = 카테고리 폭의
// 0.71배라 배너 14개(폭 26px)에서도 18px가 벌어져 11px 글자가 붙지 않는다).
// ⚠️ 자를 땐 **앞을** 버린다. 배너 ID는 `{영역}_{노출면}_{번호}` 꼴이라 뒤쪽이 유일 식별자다
// (뒤를 자르면 home_main_middle_999·1001·558이 전부 `home_main_middl…`로 같아진다).
function shortLabel(v: unknown, max: number): string {
  const s = String(v ?? '');
  return s.length > max ? `…${s.slice(s.length - max + 1)}` : s;
}

// 지표 순서 고정(조회→클릭→재생→클릭률)으로 정렬해 축·계열 순서를 안정화.
// 소재비교도 같은 순서를 쓴다(화면마다 순서가 다르면 같은 지표를 다시 찾아야 한다).
export const orderMetrics = (xs: Metric[]): Metric[] => ALL_METRICS.filter((m) => xs.includes(m));

export default function Charts({ rows }: { rows: AdBannerRow[] }) {
  const [trendMetrics, setTrendMetrics] = useState<Metric[]>(ALL_METRICS);
  const [compareMetrics, setCompareMetrics] = useState<Metric[]>(ALL_METRICS);
  const [compareDim, setCompareDim] = useState<Dimension>('placement');

  // 표본이 얇은 구간의 CTR은 빼고 그린다 — 그 값 하나가 우축 전체를 늘려 나머지를 뭉갠다.
  const byDate = useMemo(() => withChartCtr(groupByDate(rows)), [rows]);
  // rows는 이미 상단 필터가 적용된 상태 → 선택한 기준 차원으로 쪼개 비교.
  const compareData = useMemo(
    () => withChartCtr(compareByDimension(rows, compareDim, [], false)),
    [rows, compareDim],
  );

  // 뺐다는 사실은 화면이 스스로 말한다(조용히 빠지면 "그 구간은 클릭이 없었다"로 읽힌다).
  const thinNote = (n: number, unit: string) => (n > 0 ? `클릭률 ${n}${unit} 제외` : undefined);
  const thinHint = (unit: string) =>
    `노출 ${fmtInt(CTR_MIN_VIEWS)}회 미만 ${unit}은 클릭률 선에서 뺀다 — 노출 1회에 클릭 1회면 100%가 되어` +
    ` 그 점 하나가 우축을 수십 배로 늘리고 나머지 클릭률이 바닥에 눌린다. 조회·클릭 막대와 아래 표·KPI는 그대로다.`;

  const trendSel = orderMetrics(trendMetrics);
  const compareSel = orderMetrics(compareMetrics);

  // note·hint 여러 조각을 하나로 합친다(빈 조각은 버린다) — 클릭률 제외 안내 + 조회/클릭·재생
  // 축 분리 안내가 동시에 뜰 수 있다.
  const joinNote = (...xs: (string | undefined)[]) => xs.filter(Boolean).join(' · ') || undefined;
  const joinHint = (...xs: (string | undefined)[]) => xs.filter(Boolean).join('\n\n') || undefined;

  const toolbar = (value: Metric[], onChange: (v: Metric[]) => void, aria: string) => (
    <MetricToggle items={METRIC_ITEMS} value={value} onChange={onChange} ariaLabel={aria} />
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard
        title="날짜별 추이"
        // 뺀 게 없으면 꼬리표도 ⓘ도 달지 않는다 — 늘 붙어 있으면 무슨 일이 생긴 신호로 안 읽힌다.
        note={joinNote(
          trendSel.includes('ctr') ? thinNote(byDate.thinCount, '일') : undefined,
          hasSplitAxis(trendSel) ? SPLIT_AXIS_NOTE : undefined,
        )}
        hint={joinHint(
          trendSel.includes('ctr') && byDate.thinCount > 0 ? thinHint('날') : undefined,
          hasSplitAxis(trendSel) ? splitAxisHint(false) : undefined,
        )}
        ariaLabel="날짜별 조회·클릭·재생·클릭률 추이 차트(꺾은선)"
        footer={toolbar(trendMetrics, setTrendMetrics, '추이 지표')}
      >
        <MetricChart data={byDate.rows} selected={trendSel} variant="line" />
      </ChartCard>

      <ChartCard
        title={`${DIMENSIONS[compareDim].label}별 비교`}
        note={joinNote(
          compareSel.includes('ctr')
            ? thinNote(compareData.thinCount, `개 ${DIMENSIONS[compareDim].label}`)
            : undefined,
          hasSplitAxis(compareSel) ? SPLIT_AXIS_NOTE : undefined,
          hasCtrOwnAxis(compareSel) ? CTR_AXIS_NOTE : undefined,
        )}
        hint={joinHint(
          compareSel.includes('ctr') && compareData.thinCount > 0
            ? thinHint(DIMENSIONS[compareDim].label)
            : undefined,
          hasSplitAxis(compareSel) ? splitAxisHint(true) : undefined,
          hasCtrOwnAxis(compareSel) ? CTR_AXIS_HINT : undefined,
        )}
        ariaLabel={`${DIMENSIONS[compareDim].label}별 조회·클릭·재생·클릭률 비교 차트`}
        toolbar={
          <Segmented
            options={DIMENSION_OPTS}
            value={compareDim}
            onChange={setCompareDim}
            ariaLabel="비교 기준 차원"
          />
        }
        footer={toolbar(compareMetrics, setCompareMetrics, '비교 지표')}
      >
        <MetricChart data={compareData.rows} selected={compareSel} interval={0} angledLabels />
      </ChartCard>
    </div>
  );
}
