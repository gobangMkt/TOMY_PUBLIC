# SEO 지식 (인덱스)

마케팅팀장이 검색 유입(오가닉 검색)을 진단하고 글 단위로 평가·정리할 때 읽는 지식 폴더. 출처는 구글 검색 센터·Search Console 공식 문서(`google-*`)와 TBWA 코리아 SEO 블로그(`tbwa-*`)다. **구글 공식과 블로그가 충돌하면 공식이 이긴다.** 블로그 수치는 출처마다 다르고 구글 기준이 아니므로 시작값으로만 쓴다. 회사 실측 데이터는 담지 않는다.

이 폴더는 오가닉 검색 진단과 글 평가 지식이다. 상황에 맞는 파일만 읽는다.

## 상황별 라우팅

| 상황 | 읽는다 |
|---|---|
| 글이 색인되지 않음(색인 지연·제외·미확인), 기다릴지 고칠지 판정 | `google-index-status.md` + 사유별 정의는 `google-index-report-reasons.md` |
| Search Console 색인 보고서의 사유 해석, 검증 요청, URL 검사, 색인 요청 한도 | `google-index-report-reasons.md` · `google-index-report-indexed-and-tools.md` |
| 같은 검색어에 글이 여러 개 걸림(갈림), 중복·유사 글, canonical | `google-canonical-duplicates.md` |
| 글 정리(삭제·병합·URL 변경·리다이렉트), 사이트 이전 | `google-url-change-redirect.md` |
| 노출·클릭이 떨어짐, 급락 원인 진단 순서, 코어·스팸 업데이트 영향 | `google-traffic-drop-debugging.md` → `google-ranking-systems-updates.md` → `tbwa-traffic-diagnosis.md` |
| 글 단위로 유지·개선·통합·삭제를 가름, 콘텐츠 감쇠 | `tbwa-content-audit.md` (6절 판단 순서는 미검증) + `google-helpful-content-spam.md` |
| 제목·스니펫·사이트 이름을 고침, 구글이 제목을 바꾸는 규칙 | `google-title-snippet-appearance.md` + `tbwa-title-snippet.md` |
| Search Console 실적 지표를 읽고 기간 비교 | `google-search-console-reading.md` + `tbwa-search-console-analysis.md` |
| 도움이 되는 콘텐츠, 스팸 정책, 대량 저품질 글, 생성형 AI 콘텐츠 | `google-helpful-content-spam.md` |
| 크롤링 예산, 사이트맵, robots, JS 렌더링, 메타 태그 | `google-crawl-technical.md` · `google-how-search-works.md` |
| 구조화 데이터 | `google-structured-data-basics.md` |
| 구글 AI 기능(AI 개요 등)과 SEO, GEO 보완 | `google-ai-features.md` · `tbwa-geo-delta.md` (GEO 기본 규칙은 프로젝트 `docs/seo-geo.md`) |
| 네이버와 구글의 차이 | `tbwa-naver-vs-google.md` |
| 다국어 사이트 | `google-international.md` |

## 알려진 한계

- **글 평가 문턱값(몇 % 급락, 몇 회 미만)은 어느 출처에도 없다.** 우리 데이터 분포로 정한다.
- 구글이 공개하지 않은 것: 색인 지연 때 개입할 대기 일수, 서치콘솔 이상 징후 임계값, 색인 요청의 일일 한도 숫자.
- 크롤링 예산은 고유 페이지 100만 개(주 단위 변경) 또는 1만 개(매일 변경) 이상에서 문제가 된다. 글 수천 개 사이트는 해당하지 않는다.
- 문서 수집은 WebFetch 요약 방식이라 원문 수치가 완전히 보존되지 않았다. 블로그는 목록 14페이지 중 1~3페이지와 카테고리 페이지로 훑었다(전수 아님).
- 네이버 랭킹 로직은 근거가 없다.
