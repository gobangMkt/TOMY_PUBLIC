# 구글 검색 기본기: 크롤링, 색인, 게재

> 마케팅팀장 지식. 글이 검색에 나오기까지 3단계와 각 단계에서 막히는 이유를 짚을 때, SEO가 무엇을 약속하지 않는지 설명할 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 세 단계와 각 단계의 실패 원인

| 단계 | 하는 일 | 실패 원인(공식 명시) | 대응 파일 |
|---|---|---|---|
| 크롤링 | 링크·사이트맵으로 URL 발견, 페이지를 내려받고 Chrome으로 렌더링 | 서버 문제, 네트워크 문제, robots.txt 규칙, 로그인 필요 | google-crawl-technical.md |
| 색인 | title, alt, 이미지, 본문을 분석, 비슷한 페이지를 클러스터링해 대표 선정, 언어·국가·사용성 신호 수집 | 콘텐츠 품질 저하, robots meta의 색인 차단, 디자인상 색인 어려움 | google-index-status.md, google-canonical-duplicates.md |
| 게재 | 검색어에 가장 관련 있고 품질 좋은 결과 반환 | 검색어와 무관한 콘텐츠, 낮은 품질, robots meta의 게재 차단 | google-helpful-content-spam.md |

근거: /how-search-works.

## 2. 핵심 규칙

- 발견된 모든 페이지가 크롤링되지 않는다. 크롤링된 모든 페이지가 색인되지 않는다. 색인된 모든 페이지가 상위에 나오지 않는다. 기술 요건과 정책을 지켜도 같다 (/how-search-works, /essentials).
- 구글은 돈을 받고 크롤링 빈도나 순위를 올려주지 않는다. 광고를 집행해도 자연 검색 게재에 영향이 없다 (/how-search-works, /do-i-need-seo).
- 순위는 프로그램이 결정한다. 관련성은 위치·언어·기기 등으로 달라지고, 같은 검색어도 사용자마다 결과가 다를 수 있다.
- 검색어에 따라 노출 기능(지역 결과, 이미지 결과 등)도 달라진다.
- 색인된 뒤에도 검색에서 안 보이면: 검색어와 무관, 저품질, 게재 차단 중 하나.
- 새 URL은 이미 아는 페이지의 링크를 따라가거나 사이트맵으로 발견한다. 카테고리 같은 허브 페이지에서 새 글로 링크를 걸면 발견된다. 허브·목록 페이지의 내부 링크가 새 글의 입구다 (/how-search-works).
- 서버가 HTTP 500 계열을 보내면 구글은 속도를 늦춘다.
- 자바스크립트로 만든 콘텐츠는 렌더링 후에야 보인다. 구글은 최신 Chrome으로 렌더링하지만, 모든 크롤러가 그렇지는 않다 (google-crawl-technical.md).

## 2-1. 기술 최소 요건

- Googlebot 접근 가능, HTTP 200, 색인 가능한 콘텐츠 + 스팸 정책 비위반. 대부분 사이트는 별도로 신경 쓰지 않아도 충족한다 (/essentials, /essentials/technical).
- 검색 Essentials 3구성: 기술 요건, 스팸 정책, 핵심 권장사항(도움이 되는 콘텐츠, 눈에 띄는 위치의 검색어, 크롤링 가능한 링크, 사이트 홍보).
- 노출은 어떤 경우에도 무료다.

## 3. SEO 기본 권장 (콘텐츠 사이트에 해당하는 것만)

- 색인 확인은 site: 검색, Search Console URL 검사. 안 나오면 기술 요건 먼저 점검 (/seo-starter-guide).
- URL: 읽을 수 있는 단어, 의미 없는 임의 ID만의 URL 지양. 하이픈 단어 구분. 주제별 디렉터리 그룹화는 크롤링 빈도 조절을 도우며 대형일수록 중요.
- 제목 링크: title 요소를 중심으로 여러 출처로 생성. 명확·간결, 내용을 정확히, 페이지마다 다르게. CMS는 글 제목이 보통 title로 반영된다.
- 스니펫: 기본은 본문에서 생성. 메타 설명이 쓰일 때도 있다. 메타 설명이 없을 때의 동작은 공식 문서에 명시가 없다. 따라서 본문 앞부분을 명확히 쓰는 것이 스니펫 관리의 기본이다 (/seo-starter-guide, /special-tags).
- 링크: 앵커 텍스트는 도착 페이지를 설명. "여기를 클릭" 지양. 외부 링크는 신뢰 출처로, 못 믿으면 nofollow, 협찬은 sponsored, 사용자 링크는 ugc.
- 이미지: 본문 가까이 두고 설명적 alt. 동영상은 독립 페이지에 삽입.
- 홍보: 입소문·커뮤니티가 가장 지속적이나 시간이 걸린다. 과도한 홍보는 조작으로 간주될 수 있다.
- 사이트 재구성: 기존 사이트를 한꺼번에 뒤엎을 필요 없다.

## 4. 근거 없는 통념 (공식 부정)

- 메타 keywords 태그: 구글 검색이 쓰지 않는다. 색인·순위에 영향 없음.
- 키워드 반복: 오히려 스팸 정책 위반.
- 도메인·URL의 키워드, TLD: 순위에 거의 영향 없음.
- 글 길이, 제목 태그(h1 등) 개수·순서: 순위 기준 아님.
- 하위 도메인 vs 하위 디렉터리: 비즈니스 관점에서 선택.
- 중복 콘텐츠 페널티: 직접 제재 없음, 비효율만.
- E-E-A-T: 순위 요인 아님.
- HTML lang 속성: 언어는 페이지 텍스트로 감지. rel next/prev: 색인에 영향 없음 (/special-tags).

## 5. 생성형 AI 검색 시대 (구글 입장)

- AI 기능에 노출되는 조건: 색인되어 있고 기술 요건 충족. 기존 SEO 권장사항이 그대로 중요하다.
- 쿼리 팬아웃: 한 질문을 여러 하위 검색어로 확장해 찾는다. 질문의 하위 주제를 다루는 깊이 있는 글이 유리한 방향이라는 설명이다. 단 하위 검색어마다 페이지를 찍어내는 것은 스팸.
- 이미지·동영상은 노출 기회를 넓힌다.
- 성과는 Search Console의 생성형 AI 실적 보고서로 본다 (/ai-optimization-guide).
- "구글 내부 지표를 쓴다"는 서드파티 도구는 믿지 않는다 (/third-party-seo).

## 6. 구글 비공개 또는 문서에 없는 것

- 크롤링→색인까지 걸리는 정확한 시간 (며칠~몇 주 안내만 있음).
- 중복 판정 유사도 임계값, 표준 선택 신호 가중치.
- 메타 설명이 없을 때 스니펫을 만드는 구체 규칙.
- 색인 안 된 글을 몇 주 기다렸다가 개입하라는 기준 수치.

## 출처 문서

- Google 검색 작동 방식: https://developers.google.com/search/docs/fundamentals/how-search-works
- 검색 Essentials: https://developers.google.com/search/docs/essentials
- 기술 요구사항: https://developers.google.com/search/docs/essentials/technical
- SEO 기본 가이드: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- SEO가 필요한가: https://developers.google.com/search/docs/fundamentals/do-i-need-seo
- 시작하기: https://developers.google.com/search/docs/fundamentals/get-started
- 개발자 시작하기: https://developers.google.com/search/docs/fundamentals/get-started-developers
- 서드파티 SEO 조언: https://developers.google.com/search/docs/fundamentals/third-party-seo
- 생성형 AI 시대 최적화 가이드: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- 지원되는 메타 태그: https://developers.google.com/search/docs/crawling-indexing/special-tags
