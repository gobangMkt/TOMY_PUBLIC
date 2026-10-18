# 구글 색인 상태 해석과 개입 시점

> 마케팅팀장 지식. 검색 데이터의 색인 지연·미색인 글을 보고 "기다릴지 / 글을 고칠지 / 기술 조치할지" 판정할 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 0. 먼저 알아둘 한계

- 구글은 어떤 페이지도 크롤링·색인·게재를 보장하지 않는다. 기술 요건과 스팸 정책을 다 지켜도 마찬가지다 (/search/docs/essentials).
- 이 파일의 공식 근거는 크롤링·색인 문서(섹션 3)까지다. Search Console 색인 보고서의 사유별 정의는 `google-index-report-reasons.md`가 맡는다. 아래 사유 매핑은 섹션 1~3 문서에서 직접 근거가 나오는 것만 적고, 근거가 없는 칸은 "구글 비공개 또는 이 범위 밖"으로 표시한다.

## 1. 색인되려면 최소로 필요한 것 (기술 요건 3가지)

- Googlebot이 접근 가능: robots.txt 차단 없음, 로그인 벽 없음, 색인 차단 장치 없음.
- HTTP 200 응답: 4xx·5xx 페이지는 색인 대상이 아니다.
- 색인 가능한 콘텐츠: 지원 파일 형식 + 스팸 정책 위반 아님 (/search/docs/essentials/technical).
- 판정: 셋 중 하나라도 어긋나면 "기술 조치" 영역. 셋 다 맞는데 안 잡히면 "발견/품질/수요" 영역.

## 2. 분석 화면 용어와 구글 영문 상태명 매핑

| 분석 화면 용어 | 구글 상태명(Search Console) | 문서에서 확인되는 의미 |
|---|---|---|
| 색인 지연(발견 단계) | 발견됨 - 현재 색인이 생성되지 않음 (Discovered - currently not indexed) | URL은 알지만 크롤링 전 단계. 근거 문서는 이 상태를 "대규모 사이트에서 URL 상당수가 이 상태일 때" 크롤링 예산 가이드를 읽으라고 안내하는 맥락으로만 언급 (/large-site-managing-crawl-budget). 정의 자체는 이 범위 밖 |
| 색인 지연(크롤링 후) | 크롤링됨 - 현재 색인이 생성되지 않음 (Crawled - currently not indexed) | 크롤링은 됐으나 색인 안 됨. 색인 단계에서 콘텐츠 품질 저하가 주요 원인 중 하나라고 명시 (/how-search-works). 세부 정의는 이 범위 밖 |
| 중복 | 중복, 제출된 URL이 표준으로 선택되지 않음 / 사용자가 선택한 표준 없음 / 구글이 선택한 표준이 다름 | 클러스터링 후 대표 URL만 색인. 대표가 아닌 URL은 대체 버전으로 취급 (/canonicalization). 상세는 google-canonical-duplicates.md |
| 소프트 404 | Soft 404 | 없는 페이지가 200을 반환하거나 본문이 비어 있음 (/troubleshoot-crawling-errors) |
| noindex | 'noindex' 태그에 의해 제외됨 | 크롤링 허용 상태에서 noindex를 읽어 제외 (/block-indexing) |
| robots 차단 | robots.txt에 의해 차단됨 | 크롤링만 막힘. URL은 외부 링크로 설명 없이 노출될 수 있음 (/robots/intro) |
| 404/서버 오류 | 찾을 수 없음(404) / 서버 오류(5xx) | 200이 아니면 색인 대상 아님 (/essentials/technical) |

## 3. 사유별 "기다림 / 글 수정 / 기술 조치" 판정표

| 상황 | 판정 | 할 일 | 근거 |
|---|---|---|---|
| 게시 후 며칠 안 지남 | 기다림 | 대부분 사이트는 새 페이지 확인에 최소 며칠, 업데이트 반영은 3일 이상 걸린다. 당일 색인은 뉴스성 콘텐츠 외 기대하지 않는다 | /troubleshoot-crawling-errors |
| 색인 대기 몇 주 이내, 기술 요건 충족 | 기다림 + 입구 점검 | 내부 링크가 있는지, 사이트맵에 들어갔는지만 확인. 변경 효과 판단은 보통 몇 주 기다린 뒤 | /seo-starter-guide |
| 재크롤링 요청함 | 기다림 | 요청은 일부 URL의 크롤링 순서만 돕고, 크롤링은 며칠~몇 주. 같은 URL을 반복 요청해도 빨라지지 않는다. 즉시 포함·최종 포함 둘 다 보장 안 됨 | /ask-google-to-recrawl |
| 크롤링 자체가 안 됨(발견 단계 정체) | 기술 조치 | 사이트맵 갱신, robots.txt 오차단 확인, 내부 링크로 도달 가능한지, 서버 응답 문제 확인 | /troubleshoot-crawling-errors |
| 크롤링됐는데 색인 안 됨 | 글 수정 우선 | 콘텐츠 가치·수요 부족이면 크롤링돼도 검색에 안 나올 수 있다. 중복·유사 여부 먼저 보고(canonical 파일), 독자 가치가 낮은 글은 보강/통합/삭제 검토 | /troubleshoot-crawling-errors, /how-search-works |
| 대표로 선택되지 않음(중복) | 기술 조치 또는 글 수정 | 정말 같은 글이면 301 통합, 비슷하지만 다른 글이면 차이를 키움 | /canonicalization-troubleshooting |
| soft 404 | 기술 조치 | 글이 없어졌으면 404/410, 이동했으면 301, 글이 살아 있는데 비어 보이면 렌더링·차단 리소스·서버 오류 확인 | /troubleshoot-crawling-errors |
| noindex/robots 의도치 않게 걸림 | 기술 조치 | 해제. 특히 robots 차단과 noindex를 같이 두면 noindex를 못 읽는다 | /block-indexing |

- 구글이 "N주 지나면 개입하라"고 정한 수치는 없다. 공식 수치는 위 표의 "며칠", "3일 이상", "몇 주"뿐이다. 그 이상의 대기 기준은 구글 비공개이며 운영 판단 영역이다.

## 4. 개입 순서 (색인 안 되는 글 1건 기준)

1. URL 검사에서 Googlebot이 받은 HTTP 상태, 렌더링 결과, noindex, 표준 URL을 본다 (/get-started, /get-started-developers).
2. 기술 요건 3가지를 통과하는지 확인한다.
3. 내부 링크가 최소 1개 있는지 확인한다. 중요한 페이지마다 다른 페이지에서 오는 링크가 있어야 한다 (/links-crawlable).
4. 사이트맵 포함 여부와 lastmod를 확인한다. 사이트맵은 힌트일 뿐 크롤링을 보장하지 않는다 (/sitemaps/build-sitemap).
5. 중복·유사 글이 있는지 본다. 있으면 통합 후보.
6. 위가 전부 정상이면 콘텐츠 가치 문제로 본다. 독자에게 고유한 정보를 더하는 방향으로 고치거나 합친다 (google-helpful-content-spam.md).
7. 수정 후 재크롤링 요청은 중요한 URL에만. 할당량이 있다.

## 5. 하지 말 것

- 변경 없는 사이트맵을 하루에 여러 번 제출하기 (/troubleshoot-crawling-errors).
- 같은 URL 재크롤링 요청 반복 (/ask-google-to-recrawl).
- 미색인 글을 robots.txt로 막아 정리하기. 색인 제외 수단이 아니다 (/robots/intro).
- 색인 안 되는 글을 수정하지 않고 날짜만 바꾸기, 새 사이트처럼 보이려고 대량 추가·삭제하기 (/creating-helpful-content).
- Googlebot 크롤링 속도를 올려 달라는 요청: 증가 요청은 불가 (/reduce-crawl-rate).

## 6. 크롤링 예산은 이 사이트 규모에서 문제인가

- 구글 기준 대략치: 고유 페이지 100만 개 이상이며 주 단위로 바뀌는 사이트, 또는 1만 개 이상이며 매일 바뀌는 사이트가 대상. 정확한 기준은 아니라고 못박음.
- 이 가이드가 필요 없는 사이트: 빠르게 바뀌는 페이지가 적거나 게시 당일 크롤링되는 사이트. 이 경우 사이트맵 최신 유지와 색인 보고서 정기 확인이면 충분 (/large-site-managing-crawl-budget).
- 적용: 글 수천 개 규모는 위 기준(1만 개)에 한참 못 미친다. 크롤링 예산이 병목이라고 먼저 의심하지 말고 글 품질·중복·내부 링크·서버 응답부터 본다. 단 "발견됨 - 현재 색인 안 됨"이 전체의 상당수를 차지하면 구글이 이 문서를 읽으라고 안내한다.
- 크롤링 용량은 서버 응답이 빠르고 안정적이면 올라가고, 느려지거나 5xx·429가 나면 내려간다. 서버 문제 개선이 예산을 자동으로 늘리진 않는다.
- 호스트 이름 단위로 예산이 따로 잡힌다 (www와 서브도메인은 별개).

## 출처 문서

- 검색 Essentials: https://developers.google.com/search/docs/essentials
- 기술 요구사항: https://developers.google.com/search/docs/essentials/technical
- Google 검색 작동 방식: https://developers.google.com/search/docs/fundamentals/how-search-works
- SEO 기본 가이드: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- 시작하기(유지관리): https://developers.google.com/search/docs/fundamentals/get-started
- 개발자 시작하기: https://developers.google.com/search/docs/fundamentals/get-started-developers
- URL 재크롤링 요청: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- 크롤링 오류 해결: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
- 크롤링 예산 최적화: https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget
- 링크 권장사항: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- noindex: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- robots.txt 소개: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- 표준화 문제 해결: https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting
- 크롤링 속도 낮추기: https://developers.google.com/crawling/docs/crawlers-fetchers/reduce-crawl-rate
