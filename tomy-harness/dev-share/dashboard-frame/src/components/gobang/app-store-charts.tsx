'use client';

// 통합(주간 흐름) 고방 구역의 스토어 차트 2장 — 신규 설치 · 평점(2026-10-18 토미 지시 "통합에도 앱 차트 추가").
// 값·정의는 고방 › 앱 대시보드의 같은 차트와 한 벌(`use-app-metrics` 행 · `valueOf`)이다 — 여기서 따로
// 계산하면 같은 주의 숫자가 두 화면에서 갈린다. x축은 같은 구역 다른 차트와 같은 창(chartWeeks)이다.
// 스토어 활성은 GA4 WAU와 겹치는 지표라(토미 판단) 통합에는 올리지 않는다.
// ⓘ는 정의·출처·주의만, 2개 이상이면 `hintItems`(점 마커+굵은 라벨)로 — 디자인 정본 §설명 툴팁.
import { useMemo } from 'react';
import { ChartCard } from '@/components/dashboard/scope-block';
import { TrendMultiLine, PLATFORM_COLOR, type MultiSeriesDef } from '@/components/charts/trend-charts';
import { DownloadIcon, PhoneIcon } from '@/components/icons';
import { fmtInt } from '@/lib/format';
import { weekLabel } from '@/lib/metrics';
import { ratingDomain, valueOf, type AppMetricKey, type AppWeekRow } from '@/lib/app-store-weekly';

type Series = MultiSeriesDef & { key: AppMetricKey };
// 합 = 잉크, AOS·iOS = 스트림 정본 색(앱 대시보드와 같은 값).
const TOTAL_COLOR = '#161b20';
const INSTALL_SERIES: Series[] = [
  { key: 'aos_downloads', name: 'AOS', color: PLATFORM_COLOR.android },
  { key: 'ios_downloads', name: 'iOS', color: PLATFORM_COLOR.ios },
  { key: 'downloadsTotal', name: '합', color: TOTAL_COLOR },
];
const RATING_SERIES: Series[] = [
  { key: 'aos_rating', name: 'AOS', color: PLATFORM_COLOR.android },
  { key: 'ios_rating', name: 'iOS', color: PLATFORM_COLOR.ios },
];
const NOTE = '최근 6개월 · 주별(일~토)';

type Point = { key: string; label: string } & Record<string, string | number | null>;

function usePoints(rows: AppWeekRow[], weeks: string[], series: Series[]) {
  return useMemo(() => {
    const byWeek = new Map(rows.map((r) => [r.week, r]));
    const points: Point[] = weeks.map((w) => ({
      key: w,
      label: weekLabel(w),
      ...Object.fromEntries(series.map((s) => [s.key, valueOf(byWeek.get(w), s.key)])),
    }));
    // 스토어 값이 하나도 없으면 빈 축 대신 빈 상태 문구.
    return points.some((p) => series.some((s) => p[s.key] !== null)) ? points : [];
  }, [rows, weeks, series]);
}

export function AppInstallChart({ rows, weeks }: { rows: AppWeekRow[]; weeks: string[] }) {
  const data = usePoints(rows, weeks, INSTALL_SERIES);
  return (
    <ChartCard
      icon={DownloadIcon}
      title="스토어 신규 설치"
      note={NOTE}
      hintItems={[
        { label: '정의', text: '그 주 일~토에 스토어에서 새로 설치된 수의 합. 재설치·업데이트는 빠집니다.' },
        { label: 'AOS', text: 'Play Console 사용자 획득 › 신규 사용자' },
        { label: 'iOS', text: 'App Store Connect 분석 › 최초 다운로드 수' },
        { label: '합', text: '두 OS 값이 모두 있는 주만 그립니다. 값이 없는 주는 선이 끊깁니다(0이 아님).' },
        { label: '주의', text: 'GA4의 신규 사용자와는 다른 집계라 값이 맞지 않습니다.' },
      ]}
    >
      <TrendMultiLine
        data={data}
        series={INSTALL_SERIES}
        fmt={fmtInt}
        ariaLabel="스토어 신규 설치 주별 추이"
        height={250}
        emptyText="아직 입력된 값이 없습니다."
      />
    </ChartCard>
  );
}

export function AppRatingChart({ rows, weeks }: { rows: AppWeekRow[]; weeks: string[] }) {
  const data = usePoints(rows, weeks, RATING_SERIES);
  const yDomain = useMemo(
    () => ratingDomain(data.flatMap((p) => RATING_SERIES.map((s) => p[s.key]).filter((v): v is number => typeof v === 'number'))),
    [data],
  );
  return (
    <ChartCard
      icon={PhoneIcon}
      title="스토어 평점"
      note={NOTE}
      hintItems={[
        { label: '정의', text: '스토어에 표시되는 누적 평균 평점(1~5점). 그 주 토요일 값입니다.' },
        { label: 'AOS', text: 'Play Console 평점의 전체 기간 평균' },
        { label: 'iOS', text: 'App Store Connect 개요 평점. 이력이 없어 기록한 주부터 선이 이어집니다.' },
        { label: '주의', text: '세로축은 0부터가 아니라 값 주변으로 좁혀 그렸습니다.' },
      ]}
    >
      <TrendMultiLine
        data={data}
        series={RATING_SERIES}
        fmt={(n) => n.toFixed(2)}
        ariaLabel="스토어 평점 주별 추이"
        height={250}
        yDomain={yDomain}
        emptyText="아직 입력된 값이 없습니다."
      />
    </ChartCard>
  );
}
