# 구글 구조화 데이터 기본 (콘텐츠 사이트용)

> 마케팅팀장 지식. 구조화 데이터를 넣을지, 어떤 유형이 콘텐츠 사이트에 의미 있는지, JSON-LD를 직접 못 넣는 환경에서 어떻게 할지 판단할 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 기본 규칙
- 마크업은 페이지에 실제로 보이는 콘텐츠를 설명해야 한다. 보이지 않는 정보, 구조화 데이터만 있는 빈 페이지는 금지 (intro-structured-data, sd-policies).
- 필수 속성을 모두 채우고 일반 가이드라인을 지켜야 리치 결과 자격이 생긴다. 올바르게 달아도 표시는 보장되지 않는다.
- 불완전하거나 부정확한 속성을 많이 채우는 것보다 적더라도 정확하고 완전한 것이 낫다.
- 형식: JSON-LD 권장, 마이크로데이터와 RDFa도 동등하게 처리된다.
- 가이드라인 위반 시 직접 조치로 해당 페이지가 리치 결과 자격을 잃는다. 웹 검색 순위에는 영향이 없다고 명시돼 있다 (sd-policies). Article 문서는 "구조화 데이터가 무시되지만 페이지는 계속 나타날 수 있다"고 쓴다.
- 효과 측정: 적용 페이지와 미적용 페이지를 전후 비교하고, 시기 영향이 적은 꾸준한 페이지를 비교군으로 쓴다. 몇 달 치 데이터 필요 (intro-structured-data).

## 2. CMS 제약 사이트: JSON-LD를 본문에 못 넣을 때
- 구글은 CMS에서는 검색엔진 설정 페이지나 플러그인을 쓰라고 안내한다 (intro-structured-data).
- 대안 경로 3가지가 공식 문서에 있다 (generate-structured-data-with-javascript): Google 태그 관리자(맞춤 HTML 태그), 맞춤 JavaScript로 head에 ld+json script 삽입, 서버 렌더링.
- GTM 사용 시 페이지 값을 복사해 넣지 말고 변수로 페이지에서 추출한다. 복사하면 본문과 어긋난다.
- 구글은 렌더링 후 DOM의 JS 생성 구조화 데이터를 처리할 수 있다. 검증은 리치 결과 테스트의 URL 입력 방식(코드 붙여넣기 방식은 비권장).
- 다만 이 사이트의 CMS가 GTM 또는 스크립트 삽입을 허용하는지는 별도 확인 사항이다.
- 못 넣는 경우의 날짜 처리는 본문에 라벨 붙은 가시 날짜를 쓴다 (google-ranking-systems-updates.md 5절).

## 3. 콘텐츠 사이트에 의미 있는 유형
- Article, NewsArticle, BlogPosting (article)
  - 필수 속성 없음. 해당하는 권장 속성을 가능한 한 채운다.
  - author: 모든 저자를 별도 객체로, name에는 이름만(직함, 소개 문구, 출판사명 금지). url 또는 sameAs로 저자를 고유 식별.
  - datePublished 최초 게시, dateModified 최근 수정. ISO 8601, 시간대 포함 권장. 가시 날짜와 일치.
  - headline은 간결하게(잘릴 수 있음). image는 로고, 캡션 이미지를 피하고 16x9, 4x3, 1x1 고해상도를 여러 개, 너비 곱 높이 최소 50,000픽셀.
  - 여러 쪽으로 나뉜 글은 canonical을 개별 쪽 또는 전체 보기 쪽으로 둔다. 1쪽만 가리키면 안 된다.
- BreadcrumbList (breadcrumb)
  - 데스크톱에서만 사용 가능. ListItem 2개 이상. URL 구조 그대로가 아니라 사용자가 실제 거치는 경로를 쓴다.
  - 본문 HTML 빵부스러기는 구조화 데이터가 아니다.
- 프로필 페이지: 특정 인물 중심 페이지(저자 소개 등). Article의 author.url에 내부 프로필을 쓸 때 사용 권장 (article).
- WebSite: 사이트 이름 신호 (google-title-snippet-appearance.md 3절).
- Q&A, 토론 포럼: 사용자 생성 콘텐츠용이라 편집 콘텐츠 사이트에는 해당 낮음.

## 4. 중요한 현황 변경
- FAQ 리치 결과: 2026년 5월 7일부터 검색에 더 이상 표시되지 않고 문서도 삭제됐다 (구글 검색 센터 업데이트 기록). FAQ 마크업 추가는 노출 목적으로는 의미 없다.
- 2025년에 과정 정보, 예상 급여, 학습 동영상, 특별 공지, 차량 등록정보, ClaimReview 등이 지원 중단 예고 또는 삭제됐다. 우리 사이트와 무관.
- 구조화 데이터 지원 목록(검색 갤러리)은 현재 25개 기능이며 FAQ는 없다.

## 5. AI 기능과의 관계
- 생성형 AI 검색을 위한 추가 구조화 데이터나 특별한 schema.org 마크업은 필요 없다. 리치 결과를 위한 용도로 SEO 전략의 일부로는 계속 권장 (ai-optimization-guide).

## 출처 문서
- 구조화된 데이터 작동 방식: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=ko
- 구조화된 데이터 일반 가이드라인: https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=ko
- Article: https://developers.google.com/search/docs/appearance/structured-data/article?hl=ko
- 탐색경로: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb?hl=ko
- 검색 갤러리: https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=ko
- JavaScript로 구조화된 데이터 생성: https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript?hl=ko
- 생성형 AI 검색 최적화: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=ko
- 문서 업데이트 기록(FAQ 지원 중단 등, faqpage URL이 이 페이지로 연결됨): https://developers.google.com/search/docs/appearance/structured-data/faqpage?hl=ko
