# 구글 Search Console 실적 보고서 읽기

> 마케팅팀장 지식. Search Console 수치를 해석하거나 GA와 비교하거나 기간을 비교할 때 쓴다. 출처: 구글 검색 센터 및 Search Console 도움말(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 지표 정의
- 클릭수: 구글 검색 결과에서 사이트로 들어온 횟수. 노출수: 결과에 표시된 횟수. CTR: 클릭수 나누기 노출수 (Search Console 도움말 7576553).
- 평균 게재순위: 해당 URL 또는 그룹의 평균. 검색어별로 "내 링크의 최상위 순위"를 잡고 그 값들을 평균한다. 예: 검색어1 최상위 2위, 검색어2 3위면 2.5 (answer 7042828).
- 노출이 없는 검색은 순위가 기록되지 않는다.

## 2. 집계 한계 (수치가 안 맞을 때)
| 상황 | 원인 | 할 일 |
|---|---|---|
| 차트 합계와 표 합계가 다름 | 차트는 속성 기준, 표는 측정기준에 따라 속성별(검색어, 국가, 기기, 날짜) 또는 페이지별 집계 | 같은 기준끼리만 비교 |
| 같은 검색어에 내 결과가 2개 노출 | 차트 노출수는 1회로 계산 | 노출수 해석에 반영 |
| 목록의 검색어로 검색해도 내 사이트가 안 보임 | 결과가 시간, 위치, 기기, 최근 기록에 따라 달라짐 | 수동 검색은 증거로 쓰지 않음 |
| 최근 며칠 수치가 낮음 | 예비 데이터는 몇 시간 뒤 바뀔 수 있고 그래프에 점선으로 표시됨 | 점선 구간은 판단 보류 |
- 데이터 지연 일수, 익명 쿼리 처리, 행 수 한도, 16개월 한도의 공식 근거 문서는 이번에 읽은 범위에 없다(트래픽 급락 문서에서 16개월은 확인). 나머지는 "미확인"으로 둔다.

## 3. 기간 비교 규칙
- 기본 28일, 급락 진단은 16개월 범위로 시즌성 확인 후 최근 3개월 대 직전 3개월, 또는 전년 동기 (debugging-search-traffic-drops).
- 코어 업데이트 판정은 종료 후 최소 1주 지난 시점에 "직전 1주 대 이후 1주" (core-updates).
- 16개월보다 긴 비교가 필요하면 API 또는 일괄 내보내기로 미리 적재해야 한다.
- 검색 유형(웹, 이미지, 동영상, 뉴스, 디스커버)을 분리해서 본다. 디스커버는 최소 노출 한도에 도달해야 보고서에 표시된다 (google-discover).
- AI 개요, AI 모드 노출은 "웹" 검색 유형에 포함되어 총계에 들어간다(2025-06-16 반영). 따로 떼어보는 필터는 이번 문서에서 확인되지 않았다 (ai-features).

## 4. 버블 차트 분석 (검색어 단위 우선순위)
Y축 평균 순위(역방향), X축 CTR, 크기 클릭수, 색 기기. 사분면별 대응 (bubble-chart-analysis):
| 사분면 | 해석 | 할 일 |
|---|---|---|
| 상위 순위, 높은 CTR | 잘 작동 | 거의 손대지 않음 |
| 낮은 순위, 높은 CTR | 관련성 높아 보임 | 최우선 보강. 순위 상승 효과가 큼 |
| 낮은 순위, 낮은 CTR | 큰 풍선이면 이미 노출 중 | 관련 검색어면 쉬운 개선, 무관하면 무시 |
| 상위 순위, 낮은 CTR | CTR 낮은 이유 점검 | 아래 3가지 확인 |
- 4사분면 점검: 경쟁자가 리치 결과로 클릭을 가져감, 무관한 검색어에 노출됨, 검색 결과 안에서 정보가 해결됨(영업시간 등). 웹 방문이 목표면 제목과 설명을 손본다.
- 사분면 경계는 사이트별 분포에 따라 달라 절대 기준이 아니다. 기기 차이는 기본 분석에 반영되지 않으니 따로 본다.
- 특정 검색어 개선 절차: 차트에서 검색어 선정, 쿼리 필터로 그 검색어에 노출되는 모든 URL 확인, 제목, heading 구조, alt를 구체적으로 다듬기.

## 5. GA와 Search Console 비교
- 신뢰 기준: 검색 실적은 Search Console, 사이트 내 행동은 GA (google-analytics-search-console).
- 숫자가 다른 이유: 클릭과 세션의 정의, GA 태그 누락, 쿠키 동의 거부, 시간대(Search Console은 태평양시), 표준 URL만 집계, 비HTML 파일(PDF), 봇 트래픽.
- 규칙: 합계를 맞추려 하지 말고 추세가 같은지만 본다. 추세가 크게 다를 때만 원인을 판다. 이 대시보드는 변화를 빨리 포착하는 용도이고 원인 확정 도구가 아니다.
- 세션은 안정적인데 자연 검색 비율만 변하면 다른 채널 증감을 본다. 참여율이 떨어지면 검색 의도 불일치를 점검한다.

## 6. 점검 주기와 알림
- 매일 볼 필요 없음. 새 문제가 감지되면 메일 알림. 월 1회 또는 콘텐츠 대량 변경 시 점검 권장 (search-console-start).
- 직접 조치 보고서에 조치가 있으면 사이트 일부 또는 전체가 검색에서 빠질 수 있다.
- 삭제 도구는 승인돼도 효과가 약 6개월만 지속된다. 영구 삭제가 목적이면 noindex나 실제 삭제로 마무리한다.

## 7. Trends와 site: 사용 한계
- Trends는 무작위 샘플 기반이므로 절대 수치가 아니라 추세와 비교용. 인기만 보고 주제를 고르지 말고 사이트와 맞는지 먼저 확인, Search Console로 교차 검증 (trends-start).
- site: 결과는 불완전하고 순위가 무작위에 가깝다. 색인 수 집계에 쓰지 않는다 (search-operators).

## 출처 문서
- Search Console 시작하기: https://developers.google.com/search/docs/monitor-debug/search-console-start?hl=ko
- 버블 차트 분석: https://developers.google.com/search/docs/monitor-debug/bubble-chart-analysis?hl=ko
- Search Console와 GA 데이터 활용: https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console?hl=ko
- Google 트렌드 활용: https://developers.google.com/search/docs/monitor-debug/trends-start?hl=ko
- 실적 보고서 도움말(데이터 필터링): https://support.google.com/webmasters/answer/7576553?hl=ko
- 실적 보고서 도움말(평균 게재순위): https://support.google.com/webmasters/answer/7042828?hl=ko
- 트래픽 감소 디버그: https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops?hl=ko
