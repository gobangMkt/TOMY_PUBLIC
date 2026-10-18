# 구글 제목 링크, 스니펫, 사이트 이름, 파비콘, 검색 결과 표시 요소

> 마케팅팀장 지식. 노출은 유지되는데 클릭이 떨어졌거나, 제목을 고칠 때, meta description을 못 넣는 환경에서 스니펫을 다룰 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 제목 링크 (검색 결과의 파란 제목)
구글은 제목 링크를 자동 결정한다. 개별 사이트의 제목을 수동으로 바꿔주지 않는다 (title-link).
- 참고 소스: title 요소, 화면에서 가장 눈에 띄는 제목, h1 등 heading, og:title, 크고 눈에 띄는 텍스트, 앵커 텍스트, 페이지를 가리키는 링크 텍스트, WebSite 구조화 데이터.
- 변경 반영: 재크롤링과 재처리가 필요해 며칠에서 몇 주.

### 구글이 title을 바꾸는 상황 (증상, 판정, 할 일)
| 증상 | 판정 | 할 일 |
|---|---|---|
| 검색 결과 제목이 내 title과 다름 | 아래 6유형 중 하나일 가능성 | 해당 유형 교정 |
| title 일부가 비었거나 사이트명만 있음 | 반쯤 빈 title | 페이지 고유 문구를 채운다 |
| 연도, 시즌 정보가 낡음 | 오래된 title | 본문 제목과 같이 갱신한다 |
| 내용과 안 맞는 title | 부정확한 title | 본문 핵심을 반영해 다시 쓴다 |
| 여러 글이 같은 title | 상용구 반복 | 글마다 고유하게 쓴다 |
| 큰 제목이 여럿이라 엉뚱한 줄이 채택됨 | 기본 제목 불명확 | 가장 큰 글자의 h1 하나를 명확히 둔다 |
| 제목과 본문의 언어나 문자가 다름 | 언어, 문자 체계 불일치 | 본문과 같은 언어, 문자로 쓴다 |
- 사이트명이 이미 결과에 표시되면 제목 링크에서 사이트명 반복은 생략될 수 있다.

### 제목 작성 원칙 (구글 명시)
- 모든 페이지에 title을 두고, 구체적이고 간결하게 쓴다. 길이 제한은 없으나 길면 잘린다.
- 키워드 나열 금지("A, a, 에이, 에 이" 식). 스팸으로 오인될 수 있다.
- 모든 페이지에 같은 상용구를 붙이지 않는다. 브랜드는 앞이나 뒤에 구분자(-, :, |)로 간결하게.
- 제목 문구가 화면에서 가장 눈에 띄는 제목과 일치할수록 안정적이다.
- 바뀐 제목이 의도와 다르면 먼저 위 유형 해당 여부를 보고, 해당이 없으면 그 검색어에 더 잘 맞는 제목인지 검토한다.
- 제목 수정 후 효과 측정은 최소 몇 주 단위로 한다. 구글은 반영 기간을 "며칠에서 몇 주"로 밝혔다.
- 한국어 사이트 특화 규칙은 문서에 없다. 글자 수 기준은 구글 비공개.

## 2. 스니펫 (제목 아래 설명문)
- 자동 생성, 수동 변경 불가. 검색어마다 같은 페이지도 다른 스니펫이 나올 수 있다 (snippet).
- meta description은 본문보다 페이지를 더 정확히 설명할 때 스니펫으로 쓰일 수 있다. 즉 필수가 아니고 후보다.
- meta description을 못 넣는 환경: 구글이 본문에서 검색어에 맞는 부분을 뽑는다. 그러므로 서두 1~2문단과 소제목 아래 첫 문장이 곧 스니펫 후보가 된다. 이는 "본문 기반 생성"이라는 공식 설명에서 이어지는 운영 해석이다.
- 제어 도구: nosnippet(전체 차단), max-snippet:숫자(길이 상한), data-nosnippet(일부 제외). 이 사이트는 meta 조작이 불가하므로 사실상 data-nosnippet 속성만 본문에서 쓸 수 있는지가 관건이다.
- meta description을 쓸 수 있다면: 페이지마다 고유, 키워드 나열 금지, 저자와 발행일 같은 핵심 정보를 모아 주기, 시간이 부족하면 홈과 인기 페이지부터.
- CMS 사용 시 HTML 대신 CMS의 검색 설정 메뉴를 먼저 확인하라고 구글이 안내한다.
- 딥 링크("자세히 알아보기"): 콘텐츠를 접힘이나 탭 뒤에 숨기지 않기, 로드 시 JS로 스크롤 조작 안 하기, 해시 프래그먼트 지우지 않기.
- 추천 스니펫: 지정 방법 없음, 최소 텍스트 길이 비공개. max-snippet을 낮춰도 계속 노출될 수 있다. nosnippet과 data-nosnippet을 같이 쓰면 nosnippet 우선 (featured-snippets).

## 3. 사이트 이름
- 홈페이지의 WebSite 구조화 데이터가 가장 강한 신호이고 og:site_name, title, heading도 참고한다. 자동 생성이며 수동 변경 불가 (site-names).
- 도메인, 서브도메인 단위만 지원. 하위 디렉터리 단위 이름은 불가.
- JSON-LD를 못 넣는 사이트: 구조화 데이터 외 신호(og:site_name, 홈 title, 홈 heading)를 이름과 일치시키는 것이 대안이다. 효과 크기는 구글 비공개.
- 반영까지 며칠에서 몇 주. 리치 결과 테스트는 사이트 이름을 검증하지 못한다(스키마 마크업 검사기 사용).
- 한국어, CJK 전용 지침은 없다. 모든 언어에서 사용 가능.

## 4. 파비콘
- 홈페이지 head에 rel="icon" 링크. 정사각형(1:1), 최소 8x8px, 48x48px 초과 권장. 형식 BMP, GIF, ICO, PNG, JPEG, PPM, TIFF (favicon-in-search).
- Googlebot-Image와 Googlebot이 파비콘 파일과 홈페이지를 크롤링할 수 있어야 한다. URL을 자주 바꾸지 않는다.
- 호스트 단위. 하위 디렉터리는 루트의 파비콘을 공유한다. 표시 보장 없음.

## 5. 그 밖의 표시 요소 (제어 수단 요약)
- 사이트링크: 자동 생성. 제목과 heading이 간결하고 관련 페이지가 논리적으로 연결되고 앵커 텍스트가 짧고 대상과 맞으면 품질이 오른다. 원치 않으면 해당 페이지 삭제 또는 noindex만 가능 (sitelinks).
- 탐색경로: BreadcrumbList 구조화 데이터로 지정. 본문 HTML 빵부스러기는 구조화 데이터가 아니다 (visual-elements-gallery, breadcrumb).
- 이미지 썸네일: 색인된 img의 src 이미지가 대상. CSS 배경 이미지는 색인 안 된다. alt는 이미지 이해의 핵심이며 키워드 나열은 스팸 (google-images).
- 디스커버: 별도 태그 불필요, 색인과 정책 충족이면 자격. 큰 이미지(너비 1,200px 이상, max-image-preview:large), 클릭베이트 금지. 트래픽은 예측 불가한 보조 채널로 본다 (google-discover).
- 선호하는 출처: 도메인, 서브도메인 단위 사이트만 대상. 사용자가 선택하면 주요 뉴스 노출 가능성이 오르지만 보장 아님 (preferred-sources).

## 출처 문서
- 제목 링크: https://developers.google.com/search/docs/appearance/title-link?hl=ko
- 스니펫: https://developers.google.com/search/docs/appearance/snippet?hl=ko
- 추천 스니펫: https://developers.google.com/search/docs/appearance/featured-snippets?hl=ko
- 사이트 이름: https://developers.google.com/search/docs/appearance/site-names?hl=ko
- 파비콘: https://developers.google.com/search/docs/appearance/favicon-in-search?hl=ko
- 사이트링크: https://developers.google.com/search/docs/appearance/sitelinks?hl=ko
- 시각적 요소 갤러리: https://developers.google.com/search/docs/appearance/visual-elements-gallery?hl=ko
- 이미지 SEO: https://developers.google.com/search/docs/appearance/google-images?hl=ko
- 디스커버: https://developers.google.com/search/docs/appearance/google-discover?hl=ko
- 선호하는 출처: https://developers.google.com/search/docs/appearance/preferred-sources?hl=ko
