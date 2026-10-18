# 구글 글 URL 정리: 삭제, 병합, 리디렉션, 이전

> 마케팅팀장 지식. 글을 지우거나 합치거나 URL을 바꾸거나 사이트를 옮길 때 지킬 규칙이 필요할 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 글 1건별 처리 선택표

| 상황 | 처리 | 근거 |
|---|---|---|
| 글이 영구히 사라짐, 대체 글 없음 | 404 또는 410. 소프트 404(200으로 빈 페이지) 금지 | /troubleshoot-crawling-errors |
| 다른 글로 합침, 내용이 이어짐 | 대상 글로 301(또는 308) | /301-redirects |
| 글은 유지, URL만 바뀜 | 새 URL로 301 + 새 URL에 자기 참조 canonical | /site-move-with-url-changes |
| 검색에서만 빼고 싶음 | noindex(크롤링 허용 상태에서) 또는 비밀번호 보호 | /block-indexing, /remove-information |
| 급히 검색결과에서 내려야 함 | 삭제 도구(효력 약 6개월) + 영구 조치(삭제/noindex/비밀번호) 병행 | /remove-information |
| 일시적으로만 다른 곳 보여줌 | 302/307 등 임시 리디렉션 (표준화 신호로 쓰이지 않음) | /301-redirects |

## 2. 리디렉션 규칙

- 영구로 인정되는 것: 301, 308, 0초 meta refresh, JS location. 구글은 대상 URL을 표준 후보로 본다.
- 임시로 보는 것: 302, 303, 307, 0초 초과 meta refresh. 표준화 신호로 안 쓴다 (/301-redirects).
- 구현 우선순위: 서버 측 리디렉션 > meta refresh > JS 리디렉션. JS는 렌더링이 실패하면 인식 못 할 수 있다.
- 체인: 가능하면 1회로 끝낸다. 3개 이하 권장, 최대 5개 (사이트 이전 문서). 구글은 체인에서 최대 10홉까지 따라간다. 긴 체인은 크롤링에 부정적이다 (/large-site-managing-crawl-budget).
- 관련 없는 URL을 전부 홈으로 몰지 않는다. 사용자 혼란과 소프트 404 처리를 부른다. 단 여러 글을 하나로 통합했다면 통합본으로 보내는 것은 정상 (/site-move-with-url-changes).
- 301은 PageRank 손실 우려가 없다고 구글이 설명한다.
- 리디렉션 후에도 옛 URL이 한동안 검색에 보일 수 있다. 정상이며 사용자가 새 URL에 익숙해지면 사라진다 (/301-redirects).
- 리디렉션 유지 기간: 최소 1년 (사이트 이전 문서 기준). 병합한 글의 리디렉션도 같은 기준으로 최소 1년을 넘겨 유지하는 것이 안전하다. 병합 글에 대해 구글이 따로 명시한 기간은 없다.

## 3. 삭제 도구와 영구 삭제의 차이

- URL 삭제 도구는 하루 내에 검색결과에서 내리지만 효력은 약 6개월이다. 이후 다시 나타날 수 있다 (/remove-information).
- 영구히 막는 수단은 셋 중 하나: 콘텐츠 삭제/수정(가장 안전), 비밀번호 보호, noindex.
- URL의 모든 변형(대소문자, 쿼리 파라미터 붙은 URL)을 함께 처리해야 한다.
- robots.txt는 페이지 숨김 수단이 아니다. 차단된 URL은 설명 없이 URL만 노출될 수 있고, noindex도 못 읽게 된다.
- 표준화 목적으로 삭제 도구를 쓰면 모든 버전이 숨겨진다. 쓰지 않는다.

## 4. noindex 사용 시 반영 시점

- 붙인 뒤에도 검색에 남아 있으면 Googlebot이 아직 재방문 전이다. 페이지 중요도에 따라 몇 달이 걸릴 수 있다 (/block-indexing).
- 서둘러야 하면 URL 검사로 재크롤링 요청.
- noindex를 크롤링 예산 절약용으로 쓰지 않는다. 크롤링은 계속되므로 시간 낭비다 (/large-site-managing-crawl-budget). 크롤링 자체를 줄이려면 robots.txt.
- 모든 글이 아니라 글 수천 개 규모에서 소수의 글을 빼는 용도라면 noindex가 적합하다.

## 5. 대량 정리(삭제·병합) 때 지킬 점

- 순위를 올리려고 "새 사이트처럼 보이게" 대량 삭제하거나 대량 추가하지 않는다. 구글이 하지 말아야 할 관행으로 명시한다 (/creating-helpful-content).
- 오래돼 더 이상 관련 없는 글은 정리 대상이다. 주기적으로 갱신하고 쓸모없는 글은 정리하라고 권한다 (/seo-starter-guide).
- 삭제 전 각 글을 3분류: 살림(보강), 합침(301), 지움(404/410). 합칠 때 가장 강한 글을 대표로 남긴다.
- 정리 후 사이트맵에서 삭제·리디렉션된 URL을 뺀다. 사이트맵에는 표준 URL만 넣는다 (/build-sitemap).
- 내부 링크를 새 URL로 직접 고친다. 리디렉션에만 의존하지 않는다.
- 내용이 크게 안 바뀐 채 날짜만 바꿔 최신처럼 보이게 하지 않는다.

## 6. URL 자체를 바꾸는 사이트 이전 (도메인·경로 변경)

- 한 번에 한 가지만 바꾼다. 도메인 변경, CMS 교체, 레이아웃 변경을 동시에 하지 않는다.
- 순서: 새 사이트 준비·테스트, 이전 URL에서 새 URL 매핑표 작성, 서버 측 301 적용과 검증, 모니터링.
- 매핑 자료: 사이트맵, 트래픽 상위 글, 서버 로그. 이미지·CSS·JS 같은 리소스도 포함.
- 새 사이트: 각 글에 자기 참조 canonical(새 URL), 내부 링크 새 URL로, 사이트맵 새 URL로.
- 개발 중 쓴 robots.txt 전체 차단, noindex가 이전 때 남으면 새 사이트가 색인에서 빠진다. 가장 흔한 실수다.
- 주소 변경 도구: 도메인·서브도메인이 바뀔 때만 필요. HTTP에서 HTTPS, www 전환, 같은 도메인 안 경로 변경은 불필요.
- 완료 기준: 이전·새 사이트의 모든 URL을 Googlebot이 한 번 이상 방문. 순위 변동은 중간 규모 사이트에서 몇 주 이상 갈 수 있다.
- 이전 직후 서버 크롤링이 일시적으로 크게 늘 수 있으니 서버 용량 확인.
- 호스팅만 바꾸고 URL이 그대로면 별도 문서 기준: 이전 약 1주 전 DNS TTL 낮추기, 테스트 환경 noindex는 이전 전에 해제, 방화벽이 Googlebot을 막는지 확인 (/site-move-no-url-changes).

## 7. A/B 테스트와 일시중지

- A/B: Googlebot에 사용자와 다른 URL·콘텐츠를 주면 클로킹. 여러 URL 테스트는 대체 URL에 원본을 가리키는 canonical, 이동은 302, 필요한 기간만 실험 (/website-testing).
- 사이트 일시중지: 사이트를 닫지 말고 기능만 제한한다. 전체 중단은 2~3일 이내의 극단 조치로만, 1~2일이면 503 + Retry-After. 전체 robots.txt 차단, 403/404/410, robots.txt에 503은 검색에서 URL을 삭제시킨다 (/pause-online-business).

## 8. AMP를 쓰고 있다면 (현황만)

- AMP는 필수가 아니다. 구글은 AMP를 다른 페이지와 같은 기준으로 색인하며 AMP 자체의 별도 우대는 문서에 없다 (/amp).
- 제거 시: 비AMP 표준 글은 유지하고 AMP만 지울 때 rel="amphtml" 링크를 제거하고 삭제한 AMP URL을 301/302로 비AMP 글에 보낸다. 파일을 비우는 방식은 금지(빈 문서는 무효 처리되어 오래된 유효 버전이 나올 수 있음). CMS에서 AMP 기능을 끄면 모든 AMP 페이지가 사라지니 신중히 (/amp/remove-amp).

## 출처 문서

- 리디렉션 및 Google 검색: https://developers.google.com/search/docs/crawling-indexing/301-redirects
- URL이 변경되는 사이트 이동: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- 호스팅 변경: https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes
- A/B 테스트: https://developers.google.com/search/docs/crawling-indexing/website-testing
- 일시적으로 웹사이트 일시중지: https://developers.google.com/search/docs/crawling-indexing/pause-online-business
- 페이지 삭제: https://developers.google.com/search/docs/crawling-indexing/remove-information
- Google과 공유하는 정보 관리: https://developers.google.com/search/docs/crawling-indexing/control-what-you-share
- noindex: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- 크롤링 오류 해결: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
- 크롤링 예산 최적화: https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget
- 사이트맵 제작 및 제출: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- AMP 정보: https://developers.google.com/search/docs/crawling-indexing/amp
- AMP 콘텐츠 삭제: https://developers.google.com/search/docs/crawling-indexing/amp/remove-amp
- SEO 기본 가이드: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- 도움이 되는 콘텐츠 만들기: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
