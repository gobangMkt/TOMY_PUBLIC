# 구글 검색 트래픽 급락 진단 순서

> 마케팅팀장 지식. 노출·클릭이 떨어졌을 때 원인을 가르는 순서와 판정 기준이 필요할 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 0. 전제
- 게재순위는 고정값이 아니다. 오르내림 자체는 정상이고, 문제는 "급격하고 지속되는" 하락이다 (debugging-search-traffic-drops).
- 원인 추측 전에 아래 1~5단계로 "어디서 얼마나 빠졌는지"부터 확정한다.

## 1. 진단 순서 (위에서 아래로)
1. 기간을 최근 16개월로 늘린다. 매년 같은 달에 반복되는 감소면 시즌성이다. 16개월보다 긴 이력이 필요하면 Search Analytics API나 일괄 내보내기로 따로 쌓아야 한다 (debugging-search-traffic-drops).
2. 비교 기간을 잡는다. 최근 3개월 대 직전 3개월, 또는 전년 동기. 검색어, URL, 국가, 기기, 검색 유형 중 어느 축에서 변했는지 쪼갠다.
3. 검색 유형(웹/이미지/동영상/뉴스) 필터로 어느 유형에서 빠졌는지 확인한다. 웹에서만 빠졌는지, 전부인지에 따라 원인 후보가 달라진다.
4. 평균 게재순위보다 노출수와 클릭수를 우선 본다. 순위가 계속 급락하는 경우에만 콘텐츠 유용성 자체 평가로 넘어간다.
5. 페이지 표를 "클릭수 차이" 순으로 정렬해 손실이 큰 페이지부터 본다.
   - 사이트 전체가 빠졌으면 색인 보고서를 먼저 본다.
   - 특정 페이지군만 빠졌으면 URL 검사로 개별 점검한다.

## 2. 증상별 1차 분류
| 증상 | 판정 | 할 일 |
|---|---|---|
| 노출수와 클릭수 동반 하락 | 순위 또는 색인 문제 후보 | 3절 원인 점검으로 이동 |
| 노출수 유지, 클릭수만 하락 | 제목 링크, 스니펫, 리치 결과 매력도 문제. 경쟁 페이지가 더 눈에 띄는 표시를 얻었을 수 있음 | 제목 링크와 스니펫 점검 (google-title-snippet-appearance.md) |
| 점진적으로 서서히 감소 | 잘못 걸린 noindex 같은 페이지 단위 기술 문제 가능성 | 해당 페이지군 URL 검사 |
| 어느 날 사이트 전체가 급감 | 서버 장애, robots.txt 오류, 보안 이슈, 수동 조치 후보 | 크롤링 통계, 보안 문제, 직접 조치 보고서 확인 |

## 3. 원인별 판정과 대응
- 알고리즘 업데이트
  - 판정: 순위 업데이트 목록의 날짜와 하락 시점이 겹치는지 본다. 하락 폭이 갈림길이다. 2위에서 4위 같은 소폭은 급한 조치 불필요, 10위에서 29위 같은 대폭이면 사이트 전체를 유용성 기준으로 자체 평가한다 (debugging-search-traffic-drops, core-updates).
  - 대응: 상세는 google-ranking-systems-updates.md. 변경 후 반영에는 며칠에서 몇 달이 걸리고 개선 보장은 없다.
- 기술 문제
  - 판정: 서버 가용성, robots.txt 가져오기 실패, 404 증가를 크롤링 통계와 색인 보고서에서 감소 시점과 대조한다.
  - 대응: 사이트 전체 장애인지 페이지 단위(noindex 오배치 등)인지 구분해 고친다.
- 보안 문제
  - 판정: 악성코드, 피싱이 감지되면 구글이 경고나 중간 화면을 띄워 클릭이 줄어든다. 보안 문제 보고서에서 감지 여부를 본다.
- 스팸 문제
  - 판정: 직접 조치 보고서에 조치가 있는지, 스팸 정책에 걸릴 행위가 있는지 점검한다. 위반하면 순위 하락 또는 결과 제외가 된다.
- 계절성, 관심도 변화
  - 판정: 급락한 주요 검색어를 하나씩 필터링해 Google 트렌드와 비교한다. 웹 전체 관심도가 같이 떨어졌으면 사이트 문제가 아니다 (trends-start).
- 사이트 이전, URL 변경
  - 판정: 재크롤링과 재색인 동안 순위가 흔들린다. 중간 규모 사이트는 보통 몇 주 걸린다. 회복이 안 되면 이전 문제 해결 문서를 확인한다.
- 데이터 이상
  - 판정: Search Console 데이터 이상 안내에 처리 변경이나 로깅 오류가 공지됐는지 먼저 본다. 이 경우 실제 트래픽 변화가 아닐 수 있다.

## 4. 기회 탐색 (하락 진단의 반대편)
- 지역 인기 검색어와 현재 유입 검색어를 비교해, 유입이 없는 주제에 우리 콘텐츠가 있는지 본다. 있다면 크롤링과 색인이 되는지 확인한다 (debugging-search-traffic-drops).
- 주요 주제의 상승 관련 검색어를 찾아 콘텐츠를 미리 준비한다 (trends-start).

## 5. 하지 말 것
- 하락 원인을 확정하기 전에 제목, 본문을 일괄 수정하지 않는다. 이미 실적이 좋은 콘텐츠는 소폭 하락에 건드리지 않는다 (core-updates).
- 순위 확인을 위해 site: 검색으로 색인 수를 세지 않는다. 결과 목록이 불완전하고 집계 용도로 부적합하다 (search-operators/all-search-site). 진단은 URL 검사가 안정적이다 (search-operators).
- Search Console와 GA 수치를 억지로 맞추지 않는다 (google-search-console-reading.md).

## 출처 문서
- 검색 트래픽 감소 디버그: https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops?hl=ko
- 핵심 업데이트: https://developers.google.com/search/docs/appearance/core-updates?hl=ko
- Google 트렌드 활용: https://developers.google.com/search/docs/monitor-debug/trends-start?hl=ko
- site: 연산자: https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site?hl=ko
- 검색 연산자 개요: https://developers.google.com/search/docs/monitor-debug/search-operators?hl=ko
