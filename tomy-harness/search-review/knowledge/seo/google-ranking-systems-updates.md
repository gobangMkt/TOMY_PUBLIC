# 구글 순위 시스템, 코어 업데이트, 스팸 업데이트, 페이지 경험, 콘텐츠 날짜

> 마케팅팀장 지식. 순위 변동이 업데이트 때문인지 판정하고 대응 수위를 정할 때, 페이지 경험과 날짜 표기를 점검할 때 쓴다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 순위 시스템이 보는 것 (콘텐츠 사이트 관련분)
- 순위 시스템은 페이지 단위로 작동한다. 사이트 전반의 좋은 신호가 모든 페이지의 상위 노출을 보장하지 않고, 나쁜 신호가 모든 페이지를 내리는 것도 아니다. 예외는 삭제 요청 기반 강등과 아동 성적 학대 콘텐츠 관련 조치로, 사이트 전체에 영향을 준다 (ranking-systems-guide).
- 도움이 되는 콘텐츠 시스템은 2024년 3월 핵심 순위 시스템에 통합됐다. 별도 시스템이 아니라 핵심 평가의 일부다. Panda(2015), Penguin(2016)도 핵심에 흡수됐다 (ranking-systems-guide).
- 원본 콘텐츠 시스템: 원본을 인용만 한 글보다 원본을 위에 올린다. 중복 URL은 canonical로 기본 페이지를 알린다.
- 문구 순위: 긴 페이지 안의 섹션 단위로도 검색어 관련성을 본다. 긴 글의 한 소제목이 질문에 정확히 답하면 평가받을 수 있다.
- 신경망 매칭, RankBrain, BERT: 키워드 일치가 아니라 개념과 의도로 매칭한다. 변형 키워드마다 글을 따로 만들 이유가 없다 (ai-optimization-guide도 같은 입장).
- 사이트 다양성 시스템: 같은 검색 결과 상위에 한 사이트의 목록은 보통 2개 이하. 같은 주제 글을 여러 편 쌓아도 상위 슬롯은 제한된다. 관련성이 매우 높으면 예외.
- 중복 삭제: 추천 스니펫에 오른 페이지는 첫 페이지 일반 목록에서 반복되지 않는다 (ranking-systems-guide).
- 최신 정보 시스템: 시의성이 기대되는 검색어에서만 최근 콘텐츠를 우대한다. 시간 무관 주제에는 해당 안 된다.
- 리뷰 시스템: 전문성과 독창적 분석이 있는 추천, 비교, 순위 글을 보상한다. 적용 언어 목록에 한국어는 없다(영어, 스페인어, 독일어 등 11개). 한국어 사이트에는 "직접 적용된다고 명시되지 않음"으로 둔다 (reviews-system).

## 2. 코어 업데이트 영향 판정과 대응
증상: 순위가 특정 시점 이후 이동. 업데이트 목록의 시작일과 종료일 사이에 걸린다.
1. 검색 상태 대시보드에서 업데이트 시작일, 종료일을 확인한다. 종료 후 최소 1주를 기다린 뒤 "업데이트 직전 1주 대 종료 후 1주"를 비교한다 (core-updates).
2. 웹, 이미지, 동영상, 뉴스 탭을 분리해 어디서 빠졌는지 본다.
3. 하락 폭 판정
   - 소폭(2위에서 4위): 급한 조치 불필요. 이미 성과 좋은 콘텐츠는 건드리지 않는다.
   - 대폭(4위에서 29위): 사이트 전체를 유용성, 신뢰성, 사람 중심 기준으로 객관 평가한다. 가장 많이 빠진 페이지를 집중 점검하고, 웹에 더 도움 되는 대체 페이지가 있는지 본다. 무관한 제3자에게 평가를 부탁해도 된다.
4. 하지 말 것: 검색에 나쁘다고 짐작한 요소를 일단 지우는 빠른 해결책. 삭제는 최후 수단이고, 섹션 통째 삭제를 고려한다면 검색엔진용으로 만든 콘텐츠였다는 신호일 수 있다. 읽기, 탐색이 쉽게 다시 쓰고 구성하는 쪽을 먼저 택한다 (core-updates).
5. 회복 시점: 일부 변경은 며칠 내 반영되지만 사이트 전체 품질 재평가에는 몇 달이 걸릴 수 있다. 효과가 없으면 다음 핵심 업데이트까지 기다려야 할 수 있다. 다만 공지되지 않는 소규모 핵심 업데이트가 상시 있어서, 개선 확인을 위해 큰 업데이트를 기다릴 필요는 없다. 변화 보장은 없다 (core-updates, updates/core-updates).
- 평가 단위: "사이트 전체가 학습된다"는 표현이 나오므로, 하위 품질 글 비율이 높으면 사이트 단위로 영향이 번질 수 있다고 본다. 구체 비율은 구글 비공개.

## 3. 스팸 업데이트 영향 판정과 대응
- 스팸 감지(SpamBrain 등)는 상시 작동하고, 이를 크게 개선하는 때를 스팸 업데이트라 부른다. 코어와 달리 판정 기준은 스팸 정책 준수 여부 하나다 (spam-updates).
- 판정: 업데이트 직후 하락했고 정책 위반 소지가 있으면(대량 생성, 키워드 변형 양산 등) 위반 행위를 제거한다. 위반 시 순위 하락 또는 노출 제외.
- 회복: 자동 시스템이 준수를 학습할 때까지 몇 달. 기간 수치는 구글 비공개.
- 링크 스팸 업데이트는 예외: 스팸 링크의 효과가 제거되면 그 링크로 얻던 순위 이점은 되찾을 수 없다.
- 직접 조치(수동)와 별개다. 직접 조치는 Search Console 직접 조치 보고서에서만 확인된다 (search-console-start).

## 4. 페이지 경험
- 단일 신호가 없고 여러 신호의 종합이다. 순위에 직접 쓰이는 것으로 명시된 것은 Core Web Vitals다 (page-experience).
- 자가 점검 6문: CWV 양호, HTTPS, 모바일 표시, 광고가 핵심 콘텐츠를 방해하지 않음, 방해 전면 광고 없음, 주 콘텐츠 구분이 쉬운 디자인.
- CWV 기준: LCP 2.5초 이내, INP 200ms 미만, CLS 0.1 미만 (core-web-vitals).
- 경고: 점수가 좋다고 상위 노출이 보장되지 않고, SEO만을 위한 만점 추구는 시간 낭비일 수 있다. 페이지 경험이 평균 이하여도 가장 관련성 높은 콘텐츠는 노출된다. 유용한 콘텐츠가 많은 검색어일수록 경험 차이가 승부를 가른다 (page-experience).
- 방해 전면 광고: 페이지 전체를 덮는 팝업, 동의 목적의 별도 페이지 리디렉션은 피한다. 화면 일부만 차지하는 배너를 쓴다 (avoid-intrusive-interstitials).

## 5. 콘텐츠 날짜(게시일, 수정일)
- 구글은 한 가지가 아니라 여러 요소로 날짜를 추정한다. 날짜 표시가 검색 결과에 노출된다는 보장은 없다 (publication-dates).
- 할 일 3가지: 본문에 눈에 띄는 날짜를 라벨과 함께 쓴다("게시", "최종 업데이트"), 구조화 데이터의 datePublished, dateModified와 일치시킨다, 페이지 안의 다른 날짜 표시를 최소화한다.
- 시간과 시간대를 함께 주면 정밀해진다(시간은 선택). 미래 날짜나 행사 날짜를 서명일로 쓰지 않는다.
- 잘못된 날짜가 잡히면 페이지 내 다른 날짜 표시를 지워본다.
- 본문 갱신 없이 수정일만 올리는 행위에 대한 구글 언급은 이 문서에 없다. 판단은 "구글 비공개".
- JSON-LD를 못 넣는 환경에서는 본문 가시 날짜가 유일한 수단이다 (google-structured-data-basics.md).

## 출처 문서
- Google 검색 순위 시스템 가이드: https://developers.google.com/search/docs/appearance/ranking-systems-guide?hl=ko
- 핵심 업데이트: https://developers.google.com/search/docs/appearance/core-updates?hl=ko
- 소규모 핵심 업데이트 포함 안내: https://developers.google.com/search/updates/core-updates?hl=ko
- 스팸 업데이트: https://developers.google.com/search/docs/appearance/spam-updates?hl=ko
- 리뷰 시스템: https://developers.google.com/search/docs/appearance/reviews-system?hl=ko
- 페이지 경험: https://developers.google.com/search/docs/appearance/page-experience?hl=ko
- Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals?hl=ko
- 방해가 되는 전면 광고: https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials?hl=ko
- 서명일: https://developers.google.com/search/docs/appearance/publication-dates?hl=ko
- Search Console 시작: https://developers.google.com/search/docs/monitor-debug/search-console-start?hl=ko
