'use client';

// 소재비교 — '{차원}별 비교' 차트(대시보드)가 전체 배너를 다 보여주는 개요라면, 이 화면은 운영자가
// 고른 특정 소재(배너) 몇 개만 나란히 뜯어본다. 집계 로직은 새로 만들지 않는다 — `compareByDimension`이
// 이미 `selected: string[]`를 받아 그 값들만 뽑아준다(대시보드가 안 쓰고 있었을 뿐).

import { useMemo, useState } from 'react';
import {
  type Metric,
  type GroupRow,
  compareByDimension,
  withChartCtr,
  CTR_MIN_VIEWS,
  applyFilters,
  aggregate,
  previousRange,
  uniqueSorted,
} from '@/lib/ad-banner';
import { fmtInt, fmtPct, deltaOf } from '@/lib/format';
import { Delta } from '@/components/dashboard/delta';
import { useAdBanner } from './use-ad-banner';
import PageHeader from '@/components/page-header';
import { AdHeaderActions } from './ad-header';
import { CompareIcon } from '@/components/icons';
import DateRangePicker from './date-range-picker';
import MultiSelect from './multi-select';
import FilterResetButton from '@/components/ui/filter-reset-button';
import InfoTip from '@/components/ui/info-tip';
import MetricToggle from './metric-toggle';
import {
  ChartCard,
  MetricChart,
  METRIC_ITEMS,
  ALL_METRICS,
  orderMetrics,
  hasSplitAxis,
  splitAxisHint,
  SPLIT_AXIS_NOTE,
  hasCtrOwnAxis,
  CTR_AXIS_NOTE,
  CTR_AXIS_HINT,
} from './charts';

type Period = { from?: string; to?: string };

// 노출·클릭·재생·클릭률 셀 — 값 위에 전기간(직전 동일 길이) 대비를 작게 얹는다. 열을 늘리는 대신
// 한 칸 안에서 '지금 값 → 그때보다 얼마나'를 같이 읽게 한다(헤더는 배너·노출·클릭·클릭률·재생
// 5열로 최소 유지 — 설명은 표 제목 ⓘ 하나로 몰아넣는다).
function MetricCell({
  value,
  prev,
  fmt = fmtInt,
  deltaFmt,
}: {
  value: number | null;
  prev: number | null | undefined;
  fmt?: (n: number) => string;
  deltaFmt?: (n: number) => string;
}) {
  if (value == null) {
    return <td className="tabular px-4 py-2 text-right text-disabled">—</td>;
  }
  return (
    <td className="tabular px-4 py-2 text-right">
      <div className="font-medium text-ink">{fmt(value)}</div>
      {prev != null && (
        <div className="mt-0.5 text-xs">
          <Delta parts={deltaOf(value, prev)} fmt={deltaFmt ?? fmt} />
        </div>
      )}
    </td>
  );
}

const fmtCtrDelta = (n: number) => `${(n * 100).toFixed(1)}%p`;

export default function CompareView() {
  const { state, updatedAt, reload } = useAdBanner();
  const [selected, setSelected] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>({});
  const [metrics, setMetrics] = useState<Metric[]>(ALL_METRICS);

  const allRows = state.status === 'ready' ? state.rows : [];
  const bannerIds = useMemo(() => uniqueSorted(allRows.map((r) => r.bannerId)), [allRows]);
  const dates = useMemo(() => uniqueSorted(allRows.map((r) => r.eventDate)), [allRows]);

  const periodRows = useMemo(
    () => applyFilters(allRows, { from: period.from, to: period.to }),
    [allRows, period],
  );
  const cmp = useMemo(
    () => withChartCtr(compareByDimension(periodRows, 'bannerId', selected, false)),
    [periodRows, selected],
  );

  // 이전 동기간 대비(기간을 지정했을 때만) — 대시보드 KPI와 같은 규칙(`previousRange`).
  const prevRangeVal = useMemo(() => previousRange(period.from ?? '', period.to ?? ''), [period]);
  const prevByKey = useMemo(() => {
    if (!prevRangeVal) return new Map<string, GroupRow>();
    const prevRows = applyFilters(allRows, { from: prevRangeVal.from, to: prevRangeVal.to });
    const prevCmp = compareByDimension(prevRows, 'bannerId', selected, false);
    return new Map(prevCmp.map((r) => [r.key, r]));
  }, [allRows, prevRangeVal, selected]);

  // 하단 합계 행 — 선택한 소재 전체를 하나로 본 값(가중 CTR 포함).
  const totalRow = useMemo(
    () => aggregate(applyFilters(periodRows, { bannerIds: selected })),
    [periodRows, selected],
  );
  const prevTotalRow = useMemo(() => {
    if (!prevRangeVal) return null;
    return aggregate(
      applyFilters(allRows, { from: prevRangeVal.from, to: prevRangeVal.to, bannerIds: selected }),
    );
  }, [allRows, prevRangeVal, selected]);

  const dirty = selected.length > 0 || Boolean(period.from) || Boolean(period.to);
  const orderedMetrics = orderMetrics(metrics);

  const header = (
    <PageHeader
      icon={CompareIcon}
      title="소재비교"
      subtitle="선택한 소재(배너) 여러 개를 나란히 비교"
      actions={
        <AdHeaderActions
          source={state.status === 'ready' ? state.source : undefined}
          updatedAt={updatedAt}
          loading={state.status === 'loading'}
          onRefresh={reload}
          sheetUrl={state.status === 'ready' ? state.sheetUrl : undefined}
        />
      }
    />
  );

  if (state.status === 'loading') {
    return (
      <div className="space-y-5">
        {header}
        <div className="h-16 animate-pulse rounded-[10px] border border-border bg-hairline" />
        <div className="h-72 animate-pulse rounded-[10px] border border-border bg-hairline" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-5">
        {header}
        <div className="rounded-[10px] border border-border bg-surface p-8 text-center">
          <p className="text-sm text-alert">{state.message}</p>
          <button
            onClick={reload}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (allRows.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <div className="rounded-[10px] border border-border bg-surface p-8 text-center text-sm text-ink-mute">
          표시할 데이터가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}

      {state.source === 'fixture' && (
        <div className="rounded-lg border border-accent2/40 bg-accent2/10 px-4 py-2.5 text-sm text-ink-soft">
          샘플 데이터입니다 — <code>SHEET_ID</code> 설정 + 대상 시트를 링크공개(뷰어)로 두면 실시트로 전환됩니다.
        </div>
      )}

      <div className="rounded-[10px] border border-border bg-surface px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-2">
          <MultiSelect
            label="소재(배너) 선택"
            axis="소재"
            options={bannerIds}
            selected={selected}
            onChange={setSelected}
          />
          <DateRangePicker
            minDate={dates[0] ?? ''}
            maxDate={dates[dates.length - 1] ?? ''}
            value={{ from: period.from ?? '', to: period.to ?? '' }}
            onChange={(r) => setPeriod({ from: r.from || undefined, to: r.to || undefined })}
          />
          <FilterResetButton
            active={dirty}
            onClick={() => {
              setSelected([]);
              setPeriod({});
            }}
          />
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="rounded-[10px] border border-border bg-surface p-8 text-center text-sm text-ink-mute">
          비교할 소재(배너)를 선택하세요 — 2개 이상 고르면 나란히 비교됩니다.
        </div>
      ) : (
        <>
          <ChartCard
            title="소재별 비교"
            note={[
              orderedMetrics.includes('ctr') && cmp.thinCount > 0
                ? `클릭률 ${cmp.thinCount}개 소재 제외`
                : undefined,
              hasSplitAxis(orderedMetrics) ? SPLIT_AXIS_NOTE : undefined,
              hasCtrOwnAxis(orderedMetrics) ? CTR_AXIS_NOTE : undefined,
            ]
              .filter(Boolean)
              .join(' · ') || undefined}
            hint={[
              orderedMetrics.includes('ctr') && cmp.thinCount > 0
                ? `노출 ${fmtInt(CTR_MIN_VIEWS)}회 미만 소재는 클릭률 선에서 뺀다 — 표본이 얇으면 비율이` +
                  ` 한쪽으로 튀어 나머지 소재의 클릭률이 눌려 보인다. 조회·클릭·재생 막대와 아래 표는 그대로다.`
                : undefined,
              hasSplitAxis(orderedMetrics) ? splitAxisHint(true) : undefined,
              hasCtrOwnAxis(orderedMetrics) ? CTR_AXIS_HINT : undefined,
            ]
              .filter(Boolean)
              .join('\n\n') || undefined}
            ariaLabel="선택한 소재별 조회·클릭·재생·클릭률 비교 차트"
            footer={
              <MetricToggle
                items={METRIC_ITEMS}
                value={metrics}
                onChange={setMetrics}
                ariaLabel="비교 지표"
              />
            }
          >
            <MetricChart data={cmp.rows} selected={orderedMetrics} interval={0} angledLabels />
          </ChartCard>

          <div className="rounded-[10px] border border-border bg-surface">
            <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                소재별 원장
                <InfoTip
                  text={
                    `노출·클릭·재생은 선택한 기간 합계, 클릭률은 가중평균(노출 ${fmtInt(CTR_MIN_VIEWS)}회` +
                    ` 미만 소재는 제외)입니다. 괄호 안 증감은 기간을 지정했을 때 직전 동일 길이 기간과 비교한 값입니다.`
                  }
                />
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-ink-mute">
                    <th className="px-4 py-2 font-medium">배너</th>
                    <th className="px-4 py-2 text-right font-medium">노출</th>
                    <th className="px-4 py-2 text-right font-medium">클릭</th>
                    <th className="px-4 py-2 text-right font-medium">클릭률</th>
                    <th className="px-4 py-2 text-right font-medium">재생</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.rows.map((row) => {
                    const prev = prevByKey.get(row.key);
                    return (
                      <tr
                        key={row.key}
                        className="border-b border-hairline transition-colors last:border-0 hover:bg-hairline"
                      >
                        <td className="truncate px-4 py-2 text-ink-soft" title={row.key}>
                          {row.key}
                        </td>
                        <MetricCell value={row.views} prev={prev?.views} />
                        <MetricCell value={row.clicks} prev={prev?.clicks} />
                        <MetricCell value={row.ctr} prev={prev?.ctr} fmt={fmtPct} deltaFmt={fmtCtrDelta} />
                        <MetricCell value={row.plays} prev={prev?.plays} />
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-chrome font-medium text-ink">
                    <td className="px-4 py-2">합계</td>
                    <MetricCell value={totalRow.views} prev={prevTotalRow?.views} />
                    <MetricCell value={totalRow.clicks} prev={prevTotalRow?.clicks} />
                    <MetricCell
                      value={totalRow.ctr}
                      prev={prevTotalRow?.ctr}
                      fmt={fmtPct}
                      deltaFmt={fmtCtrDelta}
                    />
                    <MetricCell value={totalRow.plays} prev={prevTotalRow?.plays} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
