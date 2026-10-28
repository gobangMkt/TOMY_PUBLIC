import WeeklyView from '@/components/gobang/weekly-view';

// 통합 축(2026-07-31 신설) — '월간 흐름'의 주 단위 짝. 매주 해야 하는 u-ceo [전주 불러오기]
// 동기화를 다른 화면(U사장님 지표)까지 가지 않고 이 탭 하나에서 끝내려는 목적.
export default function OverviewWeeklyPage() {
  return <WeeklyView />;
}
