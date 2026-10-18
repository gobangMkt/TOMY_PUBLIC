# 글 단위 평가와 정리: 유지, 개선, 통합, 삭제

> 마케팅팀장 지식. 글 수백~수천 개 중 어떤 글을 손볼지, 합칠지, 지울지 가를 때 쓴다. 출처: tbwakorea SEO 블로그(글 URL들은 하단). 회사 실측 데이터는 담지 않는다.

주의: 출처는 SEO 대행사 단일 블로그다. 공식 문서보다 신뢰도가 낮고, 수치 기준을 직접 제시하는 글은 드물다. 아래 규칙 중 "미검증"은 글이 근거 없이 주장한 것이다.

## 1. 개선 대상 후보 뽑기 (콘텐츠 감쇠)

증상: 한때 잘 되던 글의 트래픽이 몇 달에 걸쳐 서서히 빠진다.

- 후보 추출 주기: 분기마다 전년 동기 대비 트래픽 20% 이상 감소한 페이지를 뽑아 분류한다. 20% 시점에 대응할지 80% 시점에 늦게 대응할지가 차이라는 것이 글의 요지다. 20%는 글의 운영 제안값이지 검증된 임계치가 아니다. (https://seo.tbwakorea.com/blog/content-decay)
- 연간 주기: 핵심 상위 20개 글은 해마다 갱신한다. 신규 발행 때마다 유사 키워드 기존 글과 카니발라이제이션을 먼저 확인한다. (같은 글)
- 도구 판정(Ahrefs 기준): Top Pages에서 트래픽 변화 "감소" 필터, 12개월 범위, 감소폭 큰 순 정렬. 키워드 난이도(KD) 40 이하 글에 집중한다. KD가 높은 글은 콘텐츠보다 링크 권위 문제일 가능성이 크다는 논리다. (같은 글)
- 변경 이력 판정: 수정 없이 떨어졌으면 전형적 감쇠, 갱신이 필요하다. 수정 직후 떨어졌으면 이전 버전과 비교해 수정이 원인인지 본다. (같은 글)
- 한계: 이 글은 갱신, 통합, 삭제 중 무엇을 고를지 가르는 명시 기준을 주지 않는다. 아래 3, 4, 5절은 다른 글 조각을 조합한 것이다.

## 2. 갱신 5단계와 하지 말 것

1. 상위 노출 글과 주제 범위를 비교해 빠진 내용을 찾는다.
2. 낡은 통계, 사례, 스크린샷을 교체한다.
3. SERP 지배 포맷이 바뀌었으면(가이드에서 커뮤니티 토론, 목록에서 영상 등) 구조를 다시 짠다.
4. 제목과 메타를 현재 의도에 맞게 고치고, 권위 높은 페이지에서 내부 링크를 건다.
5. 뉴스레터, SNS, 내부 링크 갱신으로 다시 노출시킨다. (https://seo.tbwakorea.com/blog/content-decay)

- 게시일 날짜만 바꾸는 갱신은 오히려 감쇠를 키울 수 있다. 구글이 이전 버전 대비 실질 변경을 본다는 설명이다. (같은 글)
- 갱신 판단 질문 3개: 검색자가 새 정보를 원하는가, 더 이상 필요 없는 내용이 있는가, 상위 글 대비 제목이 눈에 띄는가. 하나라도 예면 갱신 대상이다. (https://seo.tbwakorea.com/blog/how-to-increase-organic-traffic/)
- 구글이 글마다 날짜 신호를 따로 갖는다는 유출 문서 해석: 표시 날짜(bylineDate), URL이나 제목에서 뽑은 날짜(syntacticDate), 본문에서 뽑은 날짜(semanticDate). 서로 충돌하면 성과가 떨어질 수 있으니 구조화 데이터, 제목, 사이트맵의 날짜를 일관되게 둔다. 유출 문서 해석이라 미검증이다. (https://seo.tbwakorea.com/blog/google-leak/)

## 3. 같은 검색어에 글이 여러 개: 카니발라이제이션

판정(글이 제시한 방법):
- 검색창에 site:도메인 키워드를 넣고 어떤 글이 몇 위에 뜨는지 본다.
- 같은 키워드에 1위, 2위로 두 글이 뜨면 문제없다. 7위, 8위처럼 낮은 순위에 같이 뜨면 카니발라이제이션이다. 정량 지표는 순위 위치뿐이다. (https://seo.tbwakorea.com/blog/what-is-keyword-cannibalization/)
- 원인: 보조 페이지로 내부 링크가 몰림, 한 키워드에 여러 페이지를 최적화, 오래된 글을 방치해 같은 키워드 글이 쌓임. (같은 글)
- 증상 연결: 클릭률과 백링크가 글들로 쪼개져 둘 다 순위가 내려간다. 같은 SERP에서 자사 글끼리 경쟁한다. (같은 글)

처리:
- 통합: 같은 타깃 키워드 글이 둘 이상이면 하나로 합쳐 새로 발행한다. 사례로 Ahrefs가 2018년 중복된 두 글을 합친 뒤 1개월 만에 트래픽이 급증했다고 소개한다(출처 글의 사례, 미검증). (같은 글)
- 301 절차: 백링크, 참조 도메인, 권위가 가장 많은 글을 남길 글로 고른다. 나머지 내용을 그 글에 통합 갱신한다. 나머지 URL을 301로 남길 글에 연결한다. 사이트맵에서 리다이렉트된 URL을 뺀다. (같은 글)
- 이 글은 canonical과 내부 링크 조정을 해결책으로 다루지 않는다. canonical은 5절 참고.

## 4. 대량 생성, 얇은 글, AI 생성 글

- 템플릿에 데이터만 갈아 끼운 대량 페이지는 "동일 구조 + 유사 내용"으로 낮게 평가될 수 있다. 점검 항목: 페이지 간 구조와 내용 중복, 페이지별 고유 데이터(지도, 리뷰, 가격표), 검색 의도 충족, 도메인 신뢰도, 내부 링크와 스키마, 색인 상태. 색인 판단의 정량 기준은 글에 없다. (https://seo.tbwakorea.com/blog/programmatic-seo/)
- 신규 도메인이나 권위가 낮은 도메인의 대량 페이지는 색인이 안 되거나 노출되지 않을 수 있다. (같은 글, https://seo.tbwakorea.com/blog/seo-optimization-ai/)
- 지역명이나 제품명만 바꾼 중복 본문은 중복 콘텐츠로 볼 수 있고, 같은 주제여도 "해지 방법"과 "해지 불이익"은 의도가 다르니 페이지를 구분해야 한다. (https://seo.tbwakorea.com/blog/seo-optimization-ai/)
- 구글 스팸 정책(2024년 3월): AI 사용 자체는 금지가 아니다. 순위 조작 목적으로 대량 생성한, 독창성 없고 도움 안 되는 글이 확장 콘텐츠 악용이다. 판단 기준은 작성 방식이 아니라 발행된 내용의 품질이다. (https://seo.tbwakorea.com/blog/ai-blog-automation/)
- AI 글 사용 규칙: 편집과 감수를 거치고, 사실 확인을 하고, 권장 용도는 아이디어 구상과 메타 설명 초안이다. 2023년 글이라 정책이 바뀌었을 수 있다. (https://seo.tbwakorea.com/blog/chatgpt-usage-in-content-seo/)
- 사람 검수 기준: 의도 일치, 페이지별 실질 차이, 전문가 검토와 실제 경험(의료, 금융, 법률은 필수), 도메인 권위가 발행량을 감당하는지. 역할 분담은 AI가 구조와 설명문, 사람이 전략과 의도 해석과 최종 검수. (https://seo.tbwakorea.com/blog/seo-optimization-ai/)
- 짧은 글은 독창성(다른 문서와 겹치는지)으로 점수를 받는다는 유출 문서 해석(OriginalContentScore, 0~512). 미검증. (https://seo.tbwakorea.com/blog/google-leak/)
- 사이트 주제 집중도(siteFocusScore, siteRadius)가 있다는 해석: 주제에서 벗어난 페이지를 줄이는 쪽이 유리할 수 있다. 미검증. 약한 글을 지우거나 합치는 근거로 삼을 때는 보조 논거로만 쓴다. (같은 글)
- 글 비슷한 내용이 AI 구분 없이 평균적이면 신뢰를 잃는다는 주장: 관점, 맥락, 입장이 드러나야 한다. 정량 근거 없음. (https://seo.tbwakorea.com/blog/ai-%ec%bd%98%ed%85%90%ec%b8%a0-%ec%99%9c-%ec%82%ac%eb%9e%8c%eb%93%a4%ec%9d%80-%ec%9d%b4%ec%a0%9c-%ea%b0%80%ec%a7%9c-%ea%b0%99%eb%8b%a4%ea%b3%a0-%eb%8a%90%eb%81%bc%eb%8a%94%ea%b0%80/)

## 5. 삭제, 리다이렉트, canonical 선택

선택 기준 한 줄: 기존 주소를 더 안 쓸 거면 301, 여러 주소가 계속 살아 있어야 하면 canonical, 임시면 302.

- 301: 순위와 링크 점수가 새 URL로 넘어간다. 구글은 301을 대표 URL 선택의 강한 신호, 302를 약한 신호로 본다. 네이버는 웹 표준 301이 아니면 소유 확인을 보장하지 않고 임시 리다이렉트 페이지를 신뢰하기 어렵게 본다. (https://seo.tbwakorea.com/blog/redirect-for-seo/)
- 302: 링크 점수가 안 넘어간다. 오래 두면 구글이 301처럼 처리할 수 있으니 장기 사용 금지. (같은 글, https://seo.tbwakorea.com/blog/what-is-http-status-code/)
- 리다이렉트는 주제 관련성이 있어야 링크 권위가 이전된다. 관련 없는 페이지로 보내거나 체인(여러 번 연쇄)을 만들면 품질 저하, 크롤링 실패 가능. (https://seo.tbwakorea.com/blog/redirect-for-seo/)
- 존재하지 않는 URL을 전부 한 페이지로 리다이렉트하지 않는다. 없던 페이지와 있던 페이지를 구분할 수 없게 되니 404를 적절히 쓴다. (같은 글)
- 404: 구글은 404가 사이트 성과에 영향을 주지 않는다고 밝혔다. 단 내부 링크가 404를 가리키면 문제다. 삭제 글의 URL은 사이트에서 제거하고 내부 링크를 정리한다. 404와 410 중 선택 기준은 글에 없다. (https://seo.tbwakorea.com/blog/what-is-http-status-code/)
- 백링크가 걸린 삭제 글은 관련 글로 리다이렉트한다. (https://seo.tbwakorea.com/blog/how-to-increase-organic-traffic/)
- canonical 대상: 슬래시 유무, 세션 ID, 추적 파라미터, 한 글이 여러 카테고리에 게시된 경우의 중복 URL. 절대 경로로 쓰고, 한 페이지에 하나만 두고, noindex와 같이 쓰지 않는다. (https://seo.tbwakorea.com/blog/canonical-tag/)
- 슬러그를 바꾸면 기존 링크가 404가 되므로 반드시 리다이렉트를 건다. 연도 포함 슬러그(2023에서 2024)를 바꿀 때도 301로 트래픽을 유지한다. 슬러그에는 날짜를 넣지 말고 소문자만 쓴다. (https://seo.tbwakorea.com/blog/what-is-slug/, https://seo.tbwakorea.com/blog/redirect-for-seo/)
- 연결 없이 새 URL을 먼저 만들어 두 URL이 동시에 색인되면 중복으로 보고 불이익을 줄 수 있다. 새 페이지 제작과 리다이렉트 연결을 빠르게 끝낸 뒤 색인 요청한다. (https://seo.tbwakorea.com/blog/redirect-for-seo/)

## 6. 이 글들로 만든 판단 순서 (조합, 글에 없는 통합 기준 포함)

1. 감소 글 추출(20% 이상, 12개월, KD 40 이하 우선).
2. 같은 키워드에 자사 글 2개 이상 걸리는지 확인. 걸리면 통합 후 301이 먼저다.
3. 통합 대상이 아니고 의도가 바뀐 글이면 구조를 다시 짜는 갱신.
4. 의도는 맞는데 낡았으면 데이터 교체 갱신.
5. 고유 정보가 없고 백링크도 없고 다른 글과 겹치는 글만 삭제 후보. 백링크가 있으면 관련 글로 301.
6. 단계 2에서 4는 이 블로그가 직접 제시한 순서가 아니라 위 규칙을 이은 것이다. 미검증.

## 출처 글

- 잘 나가던 콘텐츠의 검색 순위가 하락하는 이유: https://seo.tbwakorea.com/blog/content-decay
- 키워드 카니발리제이션 톺아보기: https://seo.tbwakorea.com/blog/what-is-keyword-cannibalization/
- 리디렉션이란?: https://seo.tbwakorea.com/blog/redirect-for-seo/
- 캐노니컬 태그란?: https://seo.tbwakorea.com/blog/canonical-tag/
- HTTP 상태 코드란?: https://seo.tbwakorea.com/blog/what-is-http-status-code/
- 슬러그란?: https://seo.tbwakorea.com/blog/what-is-slug/
- 오가닉 트래픽을 유도하는 5가지 방법: https://seo.tbwakorea.com/blog/how-to-increase-organic-traffic/
- Programmatic SEO란?: https://seo.tbwakorea.com/blog/programmatic-seo/
- SEO 최적화, AI로 어디까지 가능할까?: https://seo.tbwakorea.com/blog/seo-optimization-ai/
- 블로그 AI 자동화, 정말 돈이 될까?: https://seo.tbwakorea.com/blog/ai-blog-automation/
- 챗GPT, 콘텐츠 상위 노출에 도움이 될까?: https://seo.tbwakorea.com/blog/chatgpt-usage-in-content-seo/
- 구글 검색 알고리즘 유출 11가지 핵심 내용: https://seo.tbwakorea.com/blog/google-leak/
- AI 콘텐츠, 왜 사람들은 이제 가짜 같다고 느끼는가: https://seo.tbwakorea.com/blog/ai-%ec%bd%98%ed%85%90%ec%b8%a0-%ec%99%9c-%ec%82%ac%eb%9e%8c%eb%93%a4%ec%9d%80-%ec%9d%b4%ec%a0%9c-%ea%b0%80%ec%a7%9c-%ea%b0%99%eb%8b%a4%ea%b3%a0-%eb%8a%90%eb%81%bc%eb%8a%94%ea%b0%80/
