# 구글 표준 URL과 중복 글 처리

> 마케팅팀장 지식. 비슷하거나 같은 글이 여러 개일 때 구글이 대표를 어떻게 고르는지, 통합을 어떻게 지시하는지 판단할 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 기본 개념

- 표준 URL = 중복 콘텐츠 중 구글이 가장 대표적이라고 고른 URL. 검색결과에는 한 버전만 나온다 (/canonicalization).
- 중복 자체는 스팸 정책 위반이 아니다. 문제는 사용자 혼란, 성과 추적 어려움, 크롤링 자원 낭비다 (/canonicalization, /seo-starter-guide).
- 중복 직접 제재(페널티)는 없다. 표절·대량 복제는 스팸 정책으로 별개 문제 (/seo-starter-guide, /spam-policies).
- 표준 페이지가 가장 자주 크롤링되고, 중복 페이지는 덜 크롤링된다. 콘텐츠·품질 평가의 주 출처도 표준 페이지다.
- 대부분 표준 페이지가 노출되지만, 사용자에게 명백히 더 맞는 중복이 있으면 그쪽이 나온다 (예: 모바일 사용자에게 모바일 페이지).

## 2. 구글이 중복으로 묶는 방식

- 색인 단계에서 페이지마다 주된 콘텐츠를 판단하고, 동일하거나 매우 유사한 페이지를 한 클러스터로 묶은 뒤 대표를 고른다 (/canonicalization, /how-search-works).
- 선택 신호로 확인되는 것: HTTP/HTTPS 중 어느 쪽, 리디렉션, 사이트맵 포함 여부, rel="canonical". 각 신호의 가중치와 유사도 임계값은 구글 비공개.
- rel="canonical"은 강제가 아니라 힌트다. 지정한 URL이 안 뽑힐 수 있다.
- 클러스터에 묶였다가 내용을 고쳐도 최대 2주까지 클러스터에 남을 수 있다. 차이가 명확하고 크면 더 빨리 분리된다 (/canonicalization-troubleshooting).
- 본문 언어가 같을 때만 중복으로 본다. 머리글·바닥글만 번역되고 본문이 같으면 중복이다.

## 3. 통합 수단과 강도

| 수단 | 강도 | 언제 | 주의 |
|---|---|---|---|
| 301/308 영구 리디렉션 | 강함 | 중복 URL을 폐기할 때. 같은 글의 URL이 여러 개일 때 | 서버 측이 가장 빠르게 반영 |
| rel="canonical" (link 요소) | 강함 | 중복 URL을 남겨둬야 할 때 | head에 넣음. HTML에만 적용. 절대 경로 권장 |
| rel="canonical" HTTP 헤더 | 강함 | PDF 등 비HTML | 웹 검색에만 지원 |
| 사이트맵 | 약함 | 표준 URL만 모아 제안 | 표준이 아닌 URL을 넣지 않는다 |

근거: /consolidate-duplicate-urls. 여러 수단을 같이 쓰면 원하는 URL이 뽑힐 가능성이 올라간다. 지정은 필수가 아니며 안 해도 구글이 스스로 고른다.

## 4. 통합 작업 규칙

할 일
- 표준 페이지에도 자기 참조 canonical을 넣는다.
- 표준 URL로 일관되게 내부 링크를 건다.
- canonical은 절대 URL로 쓴다. 상대 경로는 장기적으로 사고가 난다.
- 한 페이지에 canonical은 하나만 둔다. JS로 바꿀 때도 원본 HTML과 같은 값이어야 한다 (/javascript-seo-basics).
- HTML link와 HTTP 헤더를 섞으면 실수하기 쉽다. 하나만 고른다.
- 글 본문이 정말 같으면 canonical보다 301이 더 확실하다.

하지 말 것
- canonical 목적으로 robots.txt 사용 (내용 없이 색인될 수 있음).
- canonical 목적으로 URL 삭제 도구 사용 (모든 버전이 숨겨짐).
- 같은 페이지에 수단마다 다른 표준을 지정 (사이트맵 A, canonical B).
- noindex로 표준 선택을 막기. 표준 페이지가 통째로 검색에서 빠질 수 있다.
- URL 프래그먼트(#)를 표준으로 지정.
- 사이트맵·hreflang에 HTTP URL을 섞기. HTTPS에서 HTTP로 리디렉션하면 HTTP 선호가 강해진다.

## 5. 증상별 판정 (색인 보고서의 중복 계열 사유)

| 증상 | 해석 | 할 일 |
|---|---|---|
| 중복, 구글이 선택한 표준이 다름 | 내가 지정한 URL 대신 구글이 다른 URL을 대표로 뽑음 | URL 검사로 구글 선택 URL 확인. 그 URL이 유입에 더 낫다면 수용. 아니면 301·내부 링크·canonical·사이트맵을 같은 URL로 맞춘다 |
| 사용자가 선택한 표준 없음 | 중복 클러스터에서 canonical 지정이 없음 | 중복이 의도라면 대표 URL 지정, 같은 글이면 301 |
| 중복, 제출된 URL이 표준으로 선택되지 않음 | 사이트맵에 낸 URL이 대표가 아님 | 사이트맵에서 비표준 URL 제거 |

- 위 세 사유의 정확한 정의는 Search Console 도움말 소관이라 이 범위 밖이다. 조치 열은 /canonicalization, /consolidate-duplicate-urls, /canonicalization-troubleshooting에서 도출한 일반 규칙이다.

## 6. 문제 유형별 점검 (표준이 엉뚱하게 뽑힐 때)

- 지역·언어 변형이 있는데 hreflang이 없다: 주석을 추가.
- CMS·플러그인이 외부 URL을 가리키는 canonical이나 3xx를 잘못 넣음: 브라우저 개발자 도구로 HTML을 보고 CMS에 신고.
- 서버 설정 오류(다른 도메인에도 같은 콘텐츠, 같은 soft 404): 호스팅 업체에 문의.
- 해킹으로 교차 도메인 canonical·리디렉션이 심김: 해킹 복구 절차.
- 신디케이션(남의 사이트에 재게재): 파트너가 색인 차단하는 것이 가장 효과적. canonical은 차이가 크면 비권장.
- 남이 내 글을 복제한 사이트가 표준으로 뽑힘: 해당 호스트에 삭제 요청, 또는 DMCA로 구글에 삭제 요청.

## 7. 비슷하지만 다른 글(유사 글) 처리

- 구글은 "주된 콘텐츠가 매우 유사"한 페이지를 묶는다. 같은 키워드의 변형 글을 대량으로 만들면 묶일 위험이 크다. 변형마다 글을 찍어내는 것은 확장된 콘텐츠 악용 스팸에도 해당할 수 있다 (/ai-optimization-guide, /spam-policies).
- 글을 따로 살리려면 독자에게 다른 가치를 주도록 차이를 키운다. 같은 질문에 답하는 글이면 하나로 합친다.
- 합칠 때는 가장 강한 글을 대표로 남기고 나머지를 301로 보낸다. 보낼 때 관련 없는 글을 홈으로 몰지 않는다 (google-url-change-redirect.md).
- 정렬·필터·세션 파라미터가 만드는 URL 중복이 있으면 URL 구조 정리가 먼저다 (google-crawl-technical.md).

## 출처 문서

- URL 표준화의 정의: https://developers.google.com/search/docs/crawling-indexing/canonicalization
- rel="canonical" 등 표준 URL 지정: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- 표준화 문제 해결: https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting
- SEO 기본 가이드: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google 검색 작동 방식: https://developers.google.com/search/docs/fundamentals/how-search-works
- JavaScript SEO 기본: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- 스팸 정책: https://developers.google.com/search/docs/essentials/spam-policies
- 생성형 AI 최적화 가이드: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
