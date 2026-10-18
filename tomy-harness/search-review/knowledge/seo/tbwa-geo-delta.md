# GEO와 AI 검색: 기존 정리본에 더할 신규 정보

> 마케팅팀장 지식. AI 검색(구글 AI 개요, AI 모드, 네이버 AI 탭, ChatGPT 등)이 정보 사이트에 미치는 영향, 측정 방법, 글 단위 대응을 볼 때 쓴다. 출처: tbwakorea SEO 블로그(글 URL들은 하단). 회사 실측 데이터는 담지 않는다.

주의: 출처는 GEO 컨설팅을 파는 업체 블로그다. 수치 대부분은 외부 조사 인용이고, 자체 모니터링은 표본과 방법이 공개돼 있지 않다. 이미 있는 GEO 정리본과 겹치는 일반론(llms.txt, 브랜드 언급 등)은 생략했고 수치, 측정, 판정 기준만 모았다.

## 1. 제로클릭과 클릭률 수치

- 미국 구글 검색 중 클릭 없이 끝나는 비율 68%(2026년), 2024년 약 60%. SparkToro, Similarweb 조사 인용. (https://seo.tbwakorea.com/geo-consulting/zero-click)
- AI 개요가 뜨면 다른 결과 클릭률 8%, 안 뜨면 15%(Pew Research, 2025.7.22 인용). 절반 수준으로 줄어든다는 해석. 미국 데이터, 한국 데이터는 없다. (같은 글)
- 질문형 검색어는 노출은 늘어도 클릭이 거의 없는 경향이라는 업체 자체 모니터링 서술. 표본 비공개, 미검증. (같은 글)
- 정보 콘텐츠 사이트에서 노출 유지에 클릭만 감소하는 글은 AI 요약이 답을 대신하는 질문형일 가능성이 있다는 가설로 쓴다(해석).

AI 개요 노출 빈도와 인용 구조 (구글 특허 해석 기사, 시점은 2025년 초로 보임, 미검증):
- 전체 쿼리 중 AI 개요가 로드되는 비율 7% 내외(SGE 시절 84%). AI 개요가 참조한 링크 중 약 34%는 자연검색 10위 이내, 약 47%는 50위 밖. 순위가 낮아도 인용될 수 있다는 근거. (https://seo.tbwakorea.com/blog/google-ai-overview/)
- 추천 스니펫이 뜨는 질의에서 AI 개요 가능성이 높고, 사이트링크가 뜨는 질의와 로컬 팩 질의에서는 낮다. (같은 글)
- 인용 조건(특허 기반 해석): 쿼리 순위와 클릭률, 콘텐츠 신뢰성과 작성 시기, 저자와 도메인과 백링크, 사용자 상호작용(체류 시간, 스크롤). 서치콘솔에서 AI 개요 클릭을 따로 보는 방법은 글에 없다. (같은 글)
- 권고: 순위를 유지하라, 자연검색 노출용과 AI 개요 노출용 콘텐츠를 나눠 키워드 전략을 세워라, 이탈하지 않고 머물 콘텐츠를 만들어라. (같은 글)
- 위 수치는 후속 글(2026)의 수치와 시점이 달라 서로 충돌하는 것처럼 보인다. 후속 글은 구글 검색의 AI 요약 포함 비율을 약 50%(McKinsey)로 인용한다. 출처, 시점, 정의가 달라 단순 비교 불가. 출처별로 다름. (https://seo.tbwakorea.com/blog/geo-effect-and-result)

## 2. 순위가 높은데 AI에 인용되지 않는 이유

- AI는 질문을 하위 질문으로 확장(쿼리 팬아웃)하고 하위 질문별로 문서를 검토한다. 하위 질문 하나에만 답하는 페이지는 인용에서 빠질 수 있다. 인용 기준 5가지: 질문 관련성, 출처 신뢰도와 전문성, 최신성, 문서 간 정보 일관성, 품질과 정확성. (https://seo.tbwakorea.com/geo-consulting/zero-click, https://seo.tbwakorea.com/blog/query-fanout-ai-mode-google-seo/)
- 하위 질문 유형 5가지: 관련 주제, 암묵적 질문, 비교, 최신 정보, 지역과 직군 맥락. 각 글이 이 유형을 빠뜨리지 않는지 점검한다. 정량 기준(글자수, 커버율)은 글에 없다. (https://seo.tbwakorea.com/blog/query-fanout-ai-mode-google-seo/)
- 대량 양산은 인용 확률을 보장하지 않는다. 링크 권위가 높은 사이트가 Perplexity에서 한 번도 인용되지 않고 백링크 없는 작은 경쟁사가 최상위 출처가 된 사례가 인용돼 있다(Reddit 의견 1,000여 건 분석 기반, 일화 수준). (https://seo.tbwakorea.com/geo-consulting/solution)

## 3. 글 단위 대응 규칙

- 핵심 결론을 단락 첫 문장에, FAQ 구조, 비교표, 체크리스트. 수치나 정의가 들어가 단독으로도 의미가 완결되는 문장. 근거 없는 일반론은 피한다. (https://seo.tbwakorea.com/geo-consulting/zero-click)
- 질문형 소제목 + 두괄식 결론 + 근거 데이터 3요소. 개념 정의 문장, 요약 문단, 데이터 요약 단락을 인용 후보로 둔다. 가장 중요한 답변은 상단. (https://seo.tbwakorea.com/blog/query-fanout-ai-mode-google-seo/)
- 통계 수치 5~7개 포함 시 AI 인용 가능성이 20% 높고, 표, 리스트, 단문 구조에서 인용률이 최대 26.9% 증가한다는 AirOps 인용. 2차 인용이라 미검증. (https://seo.tbwakorea.com/blog/geo-effect-and-result)
- 기술 점검(구글 AI 모드 글): TTFB 500ms 미만 권장, 200 응답, 중요 페이지에 noindex 없음, canonical 중복과 순환 없음, 핵심 본문은 텍스트로 제공(이미지나 영상에 넣지 않음). 구조화 데이터는 화면에 보이는 텍스트와 일치해야 하고 Rich Results Test로 정기 검증. 저자 정보와 출처 인용을 일관되게 노출. 측정은 클릭보다 방문 후 행동(조회, 전환, 가입). (https://seo.tbwakorea.com/blog/google-ai-mode/)
- 기존 SEO 글은 폐기하지 말고 GEO용으로 확장한다. SEO 요소(질문형 제목, FAQ 스키마, 키워드, 백링크)는 이해를 돕지만 인용을 보장하지 않는다. (https://seo.tbwakorea.com/geo-consulting/zero-click, https://seo.tbwakorea.com/geo-consulting/solution)
- 인용 판정 기준 5가지(양산 비판 글): 답변 가능성, 인용 가능성(정의, 비교, 수치, 기준 포함), 근거와 출처 제시, 엔티티 명확성, 안정성(목표 질문군 전반에서 유지, 존댓말과 반말과 키워드형 표현을 바꿔 여러 번 점검). (https://seo.tbwakorea.com/geo-consulting/solution)

## 4. 측정 방법

- 지표 3가지: 브랜드 언급 여부, 언급 순위, 메시지 일치 여부. 상위 개념 AI-SOV(AI Share of Voice, 출처 averi.ai, 계산식 없음). (https://seo.tbwakorea.com/blog/geo-effect-and-result)
- 절차: ChatGPT, Perplexity, Claude, 구글 AI 개요에서 직접 확인, 탐색 > 이해 > 추천 > 비교 > 구매 단계별 질문 설계, 질문을 바꿔도 같은 출처가 반복 인용되는지 확인, 언급 여부 > 순위 > 메시지 순으로 판정. 측정 주기와 목표 수치는 글에 없다. (같은 글)
- 같은 질문을 여러 모델에 반복 입력해 등장 빈도, 인용 맥락, 연상 주제를 추적하고 경쟁 대비 비교한다. 목표 임계값 없음. (https://seo.tbwakorea.com/geo-consulting/zero-click)
- 개별 프롬프트 노출 여부가 아니라 질문군 단위 안정성으로 평가한다. 반영 시차 예: PR 기사 발행 후 Perplexity 답변 변화까지 약 1개월. 사례 하나. (https://seo.tbwakorea.com/geo-consulting/solution)
- 인용된 수치: AI 검색 성과를 체계적으로 추적하는 기업 16%, AI 유입 전환율이 오가닉의 약 23배(Ahrefs 인용), 챗GPT에서 답을 못 얻을 때 다른 생성형 AI로 이동 12.3%(오픈서베이). 모두 재검증 안 함, 정보 사이트에 곧바로 쓰지 않는다. (https://seo.tbwakorea.com/blog/geo-effect-and-result)
- 이 블로그에서 서치콘솔로 AI 노출을 가려내는 방법, 유입 분리 방법은 제시되지 않았다.

## 5. 2026 SEO 지표 관점 전환 (글의 주장)

- 평가 기준 이동: 발행량에서 검증된 신뢰와 독창적 실측, 개별 키워드에서 질문 여정을 따르는 클러스터, 백링크 수에서 편집 신뢰(링크 주체와 맥락), 링크 없는 언급도 신뢰 신호, 클릭과 순위에서 AI 가시성과 언급 비율. 정량 근거 없음, 업체 관점 서술. (https://seo.tbwakorea.com/blog/2026-seo-trend/)
- 점검 항목 5개: 브랜드 언급 점검, 토픽 클러스터 점검, 고유 데이터 보유, 스키마 준비, IndexNow 연동. (같은 글)
- 유출 문서 해석상 날짜 일관성, 저자 정보, 사이트 주제 집중이 신호일 수 있다는 점은 tbwa-content-audit.md 2, 4절. 미검증.

## 6. 검색엔진 구성 변화 (참고)

- 미국에서 구글 점유율 1월 92.67%에서 12월 89.91%로 하락, Bing 4.42%에서 5.84%로 상승(SE Ranking, GA 13,700개 이상 사이트 집계, 2024년). 한국 "기타" 항목이 7월 이후 급상승해 글로벌 2위인 빙을 제쳤고 AI 서비스가 포함됐을 것이라는 추정은 확인된 수치가 아니다. (https://seo.tbwakorea.com/blog/ai-search-and-seo/)
- AI 콘텐츠에 대한 소비자 불신 수치(가짜 콘텐츠에 속은 십대 35% 등)는 표본과 출처 링크가 없어 쓰지 않는다. (https://seo.tbwakorea.com/blog/ai-%ec%bd%98%ed%85%90%ec%b8%a0-%ec%99%9c-%ec%82%ac%eb%9e%8c%eb%93%a4%ec%9d%80-%ec%9d%b4%ec%a0%9c-%ea%b0%80%ec%a7%9c-%ea%b0%99%eb%8b%a4%ea%b3%a0-%eb%8a%90%eb%81%bc%eb%8a%94%ea%b0%80/)
- 네이버 AI 탭 상세는 tbwa-naver-vs-google.md 6절.

## 출처 글

- 제로클릭: 검색순위가 높아도 AI 인용 성과가 따라오지 않는 이유: https://seo.tbwakorea.com/geo-consulting/zero-click
- GEO 효과 정말 있을까?: https://seo.tbwakorea.com/blog/geo-effect-and-result
- GEO 솔루션의 오해: https://seo.tbwakorea.com/geo-consulting/solution
- 쿼리 팬아웃이 지배한 AI모드 검색: https://seo.tbwakorea.com/blog/query-fanout-ai-mode-google-seo/
- 구글 AI 모드에서 웹사이트 경쟁력 높이는 방법: https://seo.tbwakorea.com/blog/google-ai-mode/
- 구글 AI 오버뷰란?: https://seo.tbwakorea.com/blog/google-ai-overview/
- 2026 SEO 트렌드: https://seo.tbwakorea.com/blog/2026-seo-trend/
- AI가 뒤흔든 검색엔진 트렌드, SEO의 미래는?: https://seo.tbwakorea.com/blog/ai-search-and-seo/
- AI 콘텐츠, 왜 사람들은 이제 가짜 같다고 느끼는가: https://seo.tbwakorea.com/blog/ai-%ec%bd%98%ed%85%90%ec%b8%a0-%ec%99%9c-%ec%82%ac%eb%9e%8c%eb%93%a4%ec%9d%80-%ec%9d%b4%ec%a0%9c-%ea%b0%80%ec%a7%9c-%ea%b0%99%eb%8b%a4%ea%b3%a0-%eb%8a%90%eb%81%bc%eb%8a%94%ea%b0%80/
