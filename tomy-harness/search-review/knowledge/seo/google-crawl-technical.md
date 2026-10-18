# 구글 크롤링 기술: 사이트맵, robots.txt, URL, JS, 메타태그

> 마케팅팀장 지식. 사이트맵·robots.txt·noindex·URL 구조·JS 렌더링·메타태그 때문에 색인이 막히는지 점검하거나 개발팀에 요청할 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다. CMS 제약상 meta description과 JSON-LD를 못 넣는 사이트이므로 해당 항목은 "없어도 되는지" 위주로 적는다.

## 1. 차단 수단 3종 구분 (가장 많이 틀리는 곳)

| 목적 | 수단 | 함정 |
|---|---|---|
| 크롤링 차단 | robots.txt | 색인 차단이 아니다. 다른 곳에서 링크되면 URL만(설명 없이) 노출될 수 있다 |
| 색인 차단 | noindex (meta 또는 X-Robots-Tag) | 크롤링을 허용해야 읽힌다 |
| 접근 자체 차단 | 비밀번호, 삭제 | 가장 확실 |

- robots.txt로 막은 URL에 noindex를 붙이면 구글이 noindex를 못 읽어 검색에 남는다. 둘을 같이 쓰지 않는다 (/block-indexing, /robots-meta-tag).
- 구글은 robots.txt 안의 noindex 규칙을 지원하지 않는다.
- robots.txt로 페이지 렌더링에 필요한 CSS·JS·이미지를 막지 않는다. 장식 리소스만 막는다.
- Googlebot 스마트폰과 데스크톱은 같은 토큰이라 robots.txt로 하나만 선택해 막을 수 없다 (/googlebot).
- 두 방식이 충돌하면 더 제한적인 규칙이 적용된다 (meta robots 지시어 공통).

## 2. 사이트맵

- 필요 판단: 페이지 500개 이하이고 홈에서 시작해 내부 링크로 중요한 페이지에 다 닿으면 없어도 된다. 규모가 크거나 외부 링크가 적은 새 사이트면 도움이 된다 (/sitemaps/overview). 글 수천 개 사이트는 500개를 넘으므로 사이트맵을 쓰는 쪽이 맞다.
- 제출은 힌트다. 다운로드·크롤링·색인 어느 것도 보장하지 않는다.
- 포함 대상: 검색에 노출하려는 표준 URL만. 리디렉션되는 URL, 중복 URL, noindex URL, 노출 원치 않는 URL은 넣지 않는다.
- 한도: 파일 1개당 압축 해제 50MB 또는 URL 5만 개. 넘으면 분할하고 색인 파일로 묶는다. 색인 파일당 사이트맵 최대 5만 개, Search Console 사이트당 색인 파일 500개 (/build-sitemap, /large-sitemaps).
- URL은 절대 경로, UTF-8, 엔티티 이스케이프. 한글 URL은 퍼센트 인코딩 형태로 쓴다.
- priority와 changefreq는 구글이 무시한다. lastmod는 본문·링크 등 중요한 변경을 정확히 반영할 때만 쓰이고, 저작권 연도 변경 같은 사소한 수정으로 갱신하면 신뢰를 잃는다.
- 위치는 사이트 루트 권장. 제출은 Search Console 사이트맵 보고서(권장) 또는 robots.txt의 Sitemap 줄.
- 변경 없는 사이트맵을 하루 여러 번 제출하지 않는다. 사이트맵 전체를 즉시 크롤링한다고 기대하지 않는다 (/troubleshoot-crawling-errors).
- 이미지·동영상·뉴스 사이트맵은 해당 콘텐츠가 노출 대상일 때만 의미가 있다. 일반 글 사이트는 일반 사이트맵이면 된다.

## 3. 링크와 URL 구조

- 크롤링 가능한 링크는 href가 있는 a 요소. span+onclick, javascript: href, # 기반 라우팅은 보장 안 된다 (/links-crawlable).
- 중요한 글마다 다른 글에서 오는 내부 링크가 최소 하나 있어야 한다. 링크 개수 권장치는 없다.
- 링크 텍스트는 도착 글을 설명한다. 이미지 링크는 alt가 앵커 텍스트가 된다.
- URL은 대소문자를 구분한다. 서버가 같은 글을 대소문자 달리 서빙하면 중복이 된다. 통일한다 (/url-structure).
- 한글 등 비ASCII 문자는 링크 href에서 퍼센트 인코딩해야 한다. 단어 구분은 하이픈. 구글 예시는 잠재고객 언어(필요시 음역)를 쓰라고 한다.
- 세션 ID, 불필요한 파라미터, 정렬·필터 조합, 무한 캘린더는 URL을 폭증시킨다. robots.txt로 막거나 표준화로 정리한다. 세션 ID는 쿠키로.
- 크롤링을 막아도 되는 URL: 장바구니, 가입·구매 같은 작업 실행, 무한 공간, 프록시. 이미 크롤링된 URL을 막아도 예산이 다른 곳으로 옮겨가지 않는다 (/large-site-managing-crawl-budget).

## 4. 파일 크기와 크롤링 한도

- Googlebot은 지원 파일의 처음 2MB, PDF는 64MB까지만 가져온다(압축 해제 기준). 한도에서 멈추고 받은 부분만 색인에 보낸다. CSS·JS도 각각 2MB 한도 (/googlebot).
- 응용: 본문이 극단적으로 긴 HTML(인라인 데이터 포함)이면 2MB를 넘지 않게 한다.
- 크롤링 빈도는 서버 응답 속도·오류에 반응한다. 500, 503, 429는 속도를 늦추는 신호이며 2일 이상 지속하면 URL이 색인에서 빠질 수 있다 (/troubleshoot-crawling-errors, /reduce-crawl-rate).
- 304 Not Modified(조건부 요청) 지원은 선택 최적화.
- 크롤링 속도 인상은 요청할 수 없다. 인하는 서버 과부하 때만.
- 참고: 지원 파일 형식(HTML, PDF, 오피스 문서, hwp 포함 등)은 /indexable-file-types 참조. Content-Type 헤더로 판단한다.

## 5. JavaScript

- 200 응답 페이지는 렌더링 큐에 들어가며 렌더링 시점은 구글 리소스에 따른다. 렌더링된 HTML을 기준으로 색인한다 (/javascript-seo-basics).
- noindex가 있으면 렌더링을 건너뛸 수 있다. JS로 noindex를 제거해도 의도대로 안 될 수 있으니 원본 HTML에 noindex를 넣지 않는다.
- canonical은 HTML에 직접. JS가 바꾸면 원본과 같은 값이어야 하고 한 페이지에 하나만.
- SPA의 소프트 404: 없는 글은 404 URL로 리디렉션하거나 noindex를 JS로 추가.
- 서버 측 렌더링·사전 렌더링 권장. 동적 렌더링은 임시방편이며 장기 해결책이 아니다 (/dynamic-rendering, 최종 업데이트 2025-12-18).
- 지연 로드: 스크롤·클릭 같은 사용자 동작 없이 뷰포트 진입으로 로드되어야 한다. 무한 스크롤은 청크마다 고유·영구 URL(?page=12 같은 절대 번호)과 크롤링 가능한 링크 필요. URL 검사로 렌더링 결과 확인 (/lazy-loading).
- 프래그먼트(#) URL에 콘텐츠를 싣지 않는다. History API로 실제 경로를 쓴다.
- 오래된 JS·CSS 캐시를 피하려고 파일명에 해시를 넣는다 (/fix-search-javascript).
- 로컬 스토리지·쿠키에 의존하는 콘텐츠는 렌더링 시 보이지 않는다.

## 6. 메타태그와 head

- head에는 title, meta, link, script, style, base, noscript, template만 둔다. 다른 요소(iframe, img 등)를 만나면 구글은 head가 끝났다고 보고 그 뒤 메타데이터를 못 읽는다 (/valid-page-metadata). CMS 템플릿에 head 안 img·iframe이 섞이지 않았는지 확인.
- 지원: description, robots, googlebot, google-site-verification, charset, viewport, refresh(301 권장), rating, notranslate, nopagereadaloud (/special-tags).
- 무시: keywords, lang 속성, rel next/prev.
- meta description은 스니펫에 쓰일 수 있는 선택 요소다. 없어도 색인·순위 요건이 아니며 구글이 본문에서 스니펫을 만든다. 넣을 수 없는 CMS라면 본문 첫 문단을 요약형으로 쓴다 (/seo-starter-guide).
- robots 지시어: noindex, nofollow, none, nosnippet, max-snippet, max-image-preview, max-video-preview, notranslate, noimageindex, unavailable_after. 무시되는 것: noarchive, nocache. 충돌 시 더 제한적인 것 적용. unavailable_after 날짜 지난 뒤 크롤링 속도가 크게 줄어든다 (/robots-meta-tag).
- 모바일 전용 noindex·nofollow 금지. 구글은 모바일 콘텐츠로 색인한다. 모바일에서 줄인 본문은 색인되지 않는다. 반응형이면 기본적으로 동등 (/mobile-sites-mobile-first-indexing).
- 구조화된 데이터(JSON-LD)는 필수가 아니다. 리치 결과·정보 제공용이며 AI 검색에도 필수 아님 (/ai-optimization-guide). JSON-LD를 못 넣는 사이트는 이 부분 손실이 없다고 봐도 된다.
- 링크 rel: 광고·협찬 sponsored, 사용자 입력 ugc, 그 외 연결 원치 않을 때 nofollow. rel로는 색인을 못 막는다 (/qualify-outbound-links).

## 7. 개발팀 요청 체크 (색인 문제 시)

1. 렌더링된 HTML에 본문·내부 링크·canonical·robots 메타가 보이는가 (URL 검사).
2. 응답 코드가 200인가, 없는 글이 404/410인가.
3. robots.txt가 CSS·JS·글 경로를 막고 있지 않은가.
4. 사이트맵이 표준 URL만 담고, 50MB/5만 개 이하이며, robots.txt나 Search Console에 등록되어 있는가.
5. 서버 응답이 느리거나 5xx·429가 나지 않는가 (크롤링 통계 보고서 호스트 가용성).

## 출처 문서

- 크롤링 및 색인 생성 개요: https://developers.google.com/search/docs/crawling-indexing
- 색인 생성 가능한 파일 형식: https://developers.google.com/search/docs/crawling-indexing/indexable-file-types
- URL 구조: https://developers.google.com/search/docs/crawling-indexing/url-structure
- 링크: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- 사이트맵 알아보기: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- 사이트맵 제작 및 제출: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- 사이트맵 색인 파일: https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps
- Googlebot: https://developers.google.com/search/docs/crawling-indexing/googlebot
- 크롤링 속도 낮추기: https://developers.google.com/crawling/docs/crawlers-fetchers/reduce-crawl-rate
- 크롤링 오류 해결: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
- 크롤링 예산 최적화: https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget
- robots.txt 소개: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- 모바일 중심 색인: https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing
- JavaScript SEO 기본: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- JavaScript 문제 해결: https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript
- 지연 로드: https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading
- 동적 렌더링: https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering
- 페이지 메타데이터: https://developers.google.com/search/docs/crawling-indexing/valid-page-metadata
- 지원되는 메타 태그: https://developers.google.com/search/docs/crawling-indexing/special-tags
- 로봇 메타 태그, X-Robots-Tag: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- noindex: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- rel 속성: https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links
