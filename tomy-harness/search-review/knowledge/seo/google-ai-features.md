# 구글 AI 기능(AI 개요, AI 모드)과 SEO, 생성형 AI 콘텐츠

> 마케팅팀장 지식. AI 개요 대응 질문, AI로 글을 만들 때의 구글 입장, "AI 최적화" 조언의 진위를 가를 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 구글이 공식으로 말한 것
- AI 개요, AI 모드에 나오기 위한 추가 요구사항은 없고 특별한 최적화도 필요 없다. 조건은 색인되어 있고 검색 기술 요구사항을 충족하는 것뿐이다 (ai-features).
- 새 AI 전용 파일, 마크업, schema.org 데이터가 필요 없다. 그래도 색인, 제공은 보장되지 않는다.
- AI 개요는 구글 시스템이 기존 검색에 도움이 된다고 판단할 때만 뜨므로 자주 뜨지 않는다.
- AI 개요가 표시된 페이지에서의 클릭은 더 품질 높은 트래픽이라고 구글은 말한다(실측 근거는 문서에 없음).
- 측정: Search Console 실적 보고서의 "웹" 유형에 포함, AI 모드 데이터는 2025-06-16부터 총계에 포함 (문서 업데이트 기록).
- 노출 제한: nosnippet, data-nosnippet, max-snippet, noindex. AI 학습, 그라운딩 제한은 Google-Extended를 참고하라고만 안내됨.

## 2. 하지 않아도 되는 일 (오해 바로잡기, ai-optimization-guide)
| 흔한 조언 | 구글 입장 |
|---|---|
| llms.txt 만들기 | 구글 검색은 사용하지 않음. 순위, 가시성 영향 없음 |
| 글을 AI가 읽기 좋게 잘게 쪼개기(청킹) | 필요 없음. 페이지 내 여러 주제를 이해함. 이상적 길이도 없음 |
| AI용으로 글 다시 쓰기, 롱테일 변형 전수 확보 | 필요 없음. 동의어와 의도를 이해함 |
| 웹 곳곳에 언급 인위적으로 만들기 | 기대만큼 효과 없음 |
| AI용 구조화 데이터 추가 | 필요 없음 |
| AEO, GEO 같은 별도 분야 | 구글 관점에서는 여전히 SEO |
| 순위 보장 AI 도구 | 어떤 서드파티도 구글 내부 순위, AI 시스템에 접근 못함. 주의 |

## 3. 구글이 권하는 것
- 직접 쓴 경험과 고유한 관점, 전문가나 경험자만 줄 수 있는 차별 정보. 기존 내용 요약이나 AI로 쉽게 만들 수 있는 내용은 피한다.
- 제목과 단락으로 구조화, 관련 이미지와 동영상 보강.
- 검색어 변형마다 페이지를 대량 생산하지 않는다. 확장된 콘텐츠 악용 스팸 정책 위반이며 페이지 수가 품질을 올리지도 않는다.
- 기술: 크롤링 허용(robots.txt, CDN 점검), 중요 콘텐츠는 텍스트로 제공, 중복 콘텐츠 축소, 모바일과 속도.
- 판단이 어려울 때 기준 질문: 방문자가 만족할 콘텐츠인가.
- 구조화 데이터는 화면 텍스트와 일치해야 한다.

## 4. 생성형 AI로 글을 만들 때 (using-gen-ai-content)
- 가치 없는 대량 페이지는 스팸 정책 위반 가능성. 검색 Essentials와 스팸 정책을 지켜야 한다.
- 게시 전에 사람이 정확성을 확인한다. 검토 범위에는 title, 설명, 구조화 데이터, alt 같은 검색에 노출되는 메타데이터까지 포함된다.
- 작성 방식 고지는 독자 신뢰에 도움이 된다(권장).
- 품질 평가자 가이드라인은 노력이 적고 독창성, 부가가치가 낮은 콘텐츠를 낮게 평가하지만, 이 가이드라인은 순위 향상 지침이 아니고 평가 결과가 순위에 직접 영향을 주지는 않는다.
- AI 사용 여부 자체를 구글이 페널티로 삼는다는 문장은 이 문서에 없다. 기준은 유용성과 스팸 정책이다.
- 2026-05-15 업데이트: 스팸 정책이 생성형 AI 답변에도 적용된다는 설명 추가.

## 5. 선호하는 출처
- 2026-05-27부터 AI 개요, AI 모드에도 제공된다. 사이트가 도구에 표시되어야 하고(도메인, 서브도메인 단위), Search Console의 생성형 AI 기능에 포함되어야 한다. 효과는 가능성이며 보장 아님 (preferred-sources).

## 출처 문서
- AI 기능과 웹사이트: https://developers.google.com/search/docs/appearance/ai-features?hl=ko
- 생성형 AI 검색 최적화하기: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=ko
- 생성형 AI 콘텐츠 가이드: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content?hl=ko
- 선호하는 출처: https://developers.google.com/search/docs/appearance/preferred-sources?hl=ko
- 문서 업데이트 기록: https://developers.google.com/search/docs/appearance/structured-data/faqpage?hl=ko
