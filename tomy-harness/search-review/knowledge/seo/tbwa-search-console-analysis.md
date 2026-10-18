# 서치콘솔, 키워드 데이터, 성과 지표 읽는 법

> 마케팅팀장 지식. 서치콘솔 지표 해석, 기간 비교, 키워드 리서치 도구 선택, 속도와 이탈률 기준이 필요할 때 쓴다. 출처: tbwakorea SEO 블로그(글 URL들은 하단). 회사 실측 데이터는 담지 않는다.

주의: 이 블로그는 지표별 임계값을 거의 주지 않는다. "기준값 없음"으로 표시된 항목은 글이 말하지 않은 것이다. 이상 징후 판정 수치는 대부분 자체 데이터로 정해야 한다.

## 1. 서치콘솔 성과 보고서

- 기본값: 검색 유형 웹, 최근 3개월. 유형 필터로 웹, 뉴스, 이미지, 동영상을 나눠 본다. (https://seo.tbwakorea.com/blog/complete-guide-to-google-search-console/)
- 기간 비교: "비교하기" 탭으로 두 기간을 놓고 본다. 월 1회 오가닉 점검에서 전월 대비 증감을 볼 때 쓴다. (같은 글)
- 4지표: 총 클릭수, 총 노출수, 평균 CTR, 평균 게재순위(1~10위가 첫 페이지). 지표별 기준값은 글에 없다. (같은 글)
- 전년 동기 비교는 감쇠 진단에서 노출과 CTR을 같이 본다. 해석표는 tbwa-traffic-diagnosis.md 1절. (https://seo.tbwakorea.com/blog/content-decay)
- 단점: 글의 모든 서치콘솔 설명은 기본 기능 안내다. 이상 징후를 자동 판정하는 기준은 없다.

## 2. 순위와 클릭 조합으로 키워드 판정

서치콘솔을 클릭 기준으로 정렬해 유입 키워드를 본다. (https://seo.tbwakorea.com/blog/long-tail-keywords-for-seo-improvement/)
- 노출 대비 클릭이 높으면 클릭률이 높은 키워드.
- 게재 순위는 높은데 클릭이 낮은 키워드는 이 글이 "불필요"로 판정한다. 제목과 스니펫을 고치기 전에 이 판정은 성급하다는 점에 주의(글 밖 판단). 먼저 제목과 스니펫을 고쳐 본 뒤 판단한다.
- 순위가 낮아도 노출과 클릭이 모두 높으면 가치 있는 키워드.

특정 글의 키워드 순위: 검색결과 탭, 평균 게재순위, 페이지 탭에서 글 선택, 검색어 탭에서 유입 키워드별 순위. 특정 키워드로 걸리는 페이지 확인: 신규 필터에서 검색어 입력 후 페이지 탭. 카니발라이제이션 확인에 쓸 수 있다(글에는 이 연결이 없고 조합이다). (https://seo.tbwakorea.com/blog/how-to-check-website-ranking/)
- 개인화와 지역에 따른 순위 편차는 이 글에 없다.
- 순위 확인 방법 중 Moz 도메인 권한(DA)은 구글 순위 요소가 아니라고 John Mueller가 설명했다고 전한다. 인링크 양에 따라 점수가 크게 바뀌어 신뢰도에 한계. (같은 글)

## 3. 오가닉 점검 루틴 (글의 운영 제안)

- 월 1회: 핵심 키워드 경쟁 글, 전월 대비 증감, 오류 페이지 확인. 오류 페이지 유무는 매일 보라고 하는 설명도 있다. (https://seo.tbwakorea.com/blog/complete-guide-to-google-search-console/, https://seo.tbwakorea.com/blog/content-decay)
- 분기 1회: 전년 동기 대비 20% 이상 감소 글. 연 1회: 상위 20개 글. (https://seo.tbwakorea.com/blog/content-decay)
- 온페이지 점검 순서: 서치콘솔 KPI(클릭률, 노출, 평균 순위) 확인, 스프레드시트 IMPORTXML이나 Screaming Frog로 페이지별 요소 추출, 누락 요소와 우선순위 정리, 제목 > 메타 > H태그 > URL > 내부 링크 > 이미지 > 스키마 순 점검, 이후 랜딩 후 행동 점검. 정량 기준은 없다. (https://seo.tbwakorea.com/blog/onpage-seo-guide/)

## 4. 코어 웹 바이탈과 속도

기준값(원문은 FID 기준, 현재 구글은 INP로 대체):
- LCP: 좋음 2.5초 이내, 개선 필요 2.5~4초 미만, 나쁨 4초 이상.
- FID: 100ms 미만 좋음, 300ms 이하까지 개선 필요, 초과 나쁨. 글 밖 정보로 구글이 2024년 3월 INP로 대체했고 INP는 200ms 이하가 좋음, 500ms 초과가 나쁨.
- CLS: 0.1 미만 좋음, 0.25 미만 개선 필요, 이상 나쁨.
(https://seo.tbwakorea.com/blog/core-web-vitals/)

- 필드 데이터(CrUX, 서치콘솔 일부)는 실제 사용자 값, 랩 데이터(Lighthouse)는 통제 환경 값이다. PageSpeed Insights가 둘 다 보여준다. 서치콘솔은 URL 그룹 단위로 문제 묶음을 먼저 찾고 개별 URL은 PageSpeed Insights로 진단하는 흐름이 자연스럽다고 해석한다(해석). (같은 글)
- 속도 판단 수치(출처 따라 다름): 데스크톱 3초 미만, 모바일 2초 미만이면 경쟁력(https://seo.tbwakorea.com/blog/seo-insights-6-types/). 평균 로드 시간 3초, 모바일 이상 1~2초, 2초 지연 시 이탈 최대 87%(https://seo.tbwakorea.com/blog/bounce-rate/). 3초 지속이면 이탈 가능성 32% 증가, 10초 123%(https://seo.tbwakorea.com/blog/common-seo-mistakes-and-how-to-handle/). 모두 2차 인용이라 미검증.

## 5. 이탈률, 체류, UX 지표 해석

- 이탈률 = 이탈 세션 / 전체 세션 x 100. 업종 벤치마크(Semrush 표기): 전자상거래와 소매 20~45%, 사전, 블로그, 포털 같은 정보 사이트 65~90%. (https://seo.tbwakorea.com/blog/bounce-rate/)
- 정보성 사이트는 이탈률이 높아도 콘텐츠가 충분히 해결했다는 뜻일 수 있다. "낮을수록 좋다"는 단순 판정이 맞지 않으니 사이트 유형별 기준을 정한다. 정보 콘텐츠 사이트에서는 이탈률 하나로 글을 판정하지 않는다. (같은 글)
- 이 글은 GA4의 참여율 정의 변화를 설명하지 않는다. 글의 경로 안내는 유니버설 GA 시절 메뉴(보고서, 참여도, 페이지 및 화면, 측정항목에 이탈률 추가)다.
- 체류(dwell time): 검색자가 SERP로 돌아오기 전 머문 시간. 낮으면 만족도가 낮다고 해석. 단 구글이 순위에 쓰는지는 이 블로그 글들도 입증하지 못한다. (https://seo.tbwakorea.com/blog/what-is-abtest-for-seo/, https://seo.tbwakorea.com/blog/seo-with-effective-ux-ui/)
- 유출 문서 해석: 클릭 품질 지표(goodClicks, badClicks, lastLongestClicks)가 존재한다. 구글 공식 입장은 클릭 지표를 순위에 쓰지 않는다였다. 가중치 없음. 미검증. 짧은 이탈이 아닌 충분히 머무는 클릭이 중요할 수 있다는 정도로만 쓴다. (https://seo.tbwakorea.com/blog/google-leak/)
- 이탈 개선 5가지: 로딩, 문단당 핵심 1개와 한 문장 두 줄 이내와 목차, 내부 링크, 검색의도에 맞는 키워드, CTA. (https://seo.tbwakorea.com/blog/bounce-rate/)

## 6. 키워드 데이터: 도구와 판정 기준

- 월평균 검색량 100 이상이면 의미 있는 키워드로 본다(두 글이 일치). 경쟁도 60 이하를 상위 노출 가능 수준으로 제시(카테고리별로 다를 수 있음, 산정 방식 불명). 이상적 타깃은 검색량 높고 SEO 경쟁도(해당 키워드 발행 콘텐츠 수)가 상대적으로 낮은 것. (https://seo.tbwakorea.com/blog/keyword-research-guide/, https://seo.tbwakorea.com/blog/how-to-write-seo-friendly-content/)
- 3단계: 시드 키워드 입력, 연관 키워드로 확장, 선정 기준으로 필터링. (https://seo.tbwakorea.com/blog/keyword-research-guide/)
- 도구 선택: 구글은 Ahrefs(한국어 데이터 상대적 부족), Twinword Ideas(국문 정확도가 Ahrefs보다 높다고 함), 키워드 플래너(광고 계정 필요, 범위 값). 네이버는 블랙키위(월간 검색량, 콘텐츠 발행량), 네이버 검색광고 키워드 도구, 마피아넷(광고 API 값 표시, 키워드 100개, 연관 5개 한도). 불확실하면 여러 엔진 데이터를 교차 분석. (같은 글, https://seo.tbwakorea.com/blog/mapia-net-naver/)
- 엔진 선택 규칙(글 주장): 관여도 높은 제품은 구글, 낮거나 쇼핑 바로 구매형은 네이버, 유튜브 소비형은 유튜브. 근거 데이터 없음. (https://seo.tbwakorea.com/blog/keyword-research-guide/)
- 네이버 데이터랩: 검색어 트렌드는 최대 5개 키워드, 선택 구간의 최고값이 100이고 나머지는 상대치다. 절대 검색량은 없다. 기간이 다른 두 조회의 숫자는 직접 비교하지 않는다. 같은 조건으로 상대 추이와 비중 변화를 본다. (https://seo.tbwakorea.com/blog/naver-datalab/)

## 7. 실험과 추적

- UTM 필수 항목은 URL, 캠페인 ID, 소스, 매체이고 name, term, content는 선택이다. 이 글은 소문자 규칙, 내부 링크 금지, 오가닉 분석 주의, GA4 확인 경로를 다루지 않는다. 글 안 예시가 하이픈과 밑줄을 섞어 쓰는 등 일관성이 없어 규칙으로 쓸 수 없다. (https://seo.tbwakorea.com/blog/utm-code/)
- SEO A/B 테스트 설계 7단계: 개선점, 변수 식별, 수치 가설, 목표와 기간과 표본(예시 6개월 이상, 5,000건 이상, 고정값 아님), 파생 변수, 실행, 결과 분석. 유의수준은 글에 없다. 이 방식은 현장 적용성이 약하다는 점에 주의(해석). (https://seo.tbwakorea.com/blog/what-is-abtest-for-seo/)
- 서치콘솔 응답 코드와 크롤링 통계는 설정, 크롤링 통계 보고서 열기에서 본다. (https://seo.tbwakorea.com/blog/what-is-http-status-code/)

## 출처 글

- 구글 서치 콘솔 사용법: https://seo.tbwakorea.com/blog/complete-guide-to-google-search-console/
- 잘 나가던 콘텐츠의 검색 순위가 하락하는 이유: https://seo.tbwakorea.com/blog/content-decay
- 롱테일 키워드, SEO개선을 위한 키워드 전략: https://seo.tbwakorea.com/blog/long-tail-keywords-for-seo-improvement/
- 사이트 순위 확인하는 간단한 방법 두가지: https://seo.tbwakorea.com/blog/how-to-check-website-ranking/
- 온페이지 SEO 가이드: https://seo.tbwakorea.com/blog/onpage-seo-guide/
- 코어 웹 바이탈이란?: https://seo.tbwakorea.com/blog/core-web-vitals/
- SEO 인사이트 총정리: https://seo.tbwakorea.com/blog/seo-insights-6-types/
- 이탈률이란?: https://seo.tbwakorea.com/blog/bounce-rate/
- 흔히 일어나는 SEO 실수 8가지: https://seo.tbwakorea.com/blog/common-seo-mistakes-and-how-to-handle/
- AB테스트란?: https://seo.tbwakorea.com/blog/what-is-abtest-for-seo/
- UX/UI 개선으로 SEO 친화적인 웹사이트 만들기: https://seo.tbwakorea.com/blog/seo-with-effective-ux-ui/
- 구글 검색 알고리즘 유출 11가지 핵심 내용: https://seo.tbwakorea.com/blog/google-leak/
- 지금 당장 키워드 데이터 분석을 시작해야 하는 이유: https://seo.tbwakorea.com/blog/keyword-research-guide/
- 구글 상위 노출 완벽 가이드 35가지: https://seo.tbwakorea.com/blog/how-to-write-seo-friendly-content/
- 마피아넷을 통한 네이버 키워드 검색량 조회법: https://seo.tbwakorea.com/blog/mapia-net-naver/
- 네이버 데이터랩을 통한 키워드 통계 분석: https://seo.tbwakorea.com/blog/naver-datalab/
- UTM 코드란?: https://seo.tbwakorea.com/blog/utm-code/
- HTTP 상태 코드란?: https://seo.tbwakorea.com/blog/what-is-http-status-code/
