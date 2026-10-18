# 노출 급락, 클릭률 저하, 색인 안 됨 진단

> 마케팅팀장 지식. 트래픽이 빠졌거나 글이 색인되지 않을 때 원인을 좁히는 순서가 필요할 때 쓴다. 출처: tbwakorea SEO 블로그(글 URL들은 하단). 회사 실측 데이터는 담지 않는다.

주의: 출처는 단일 SEO 대행사 블로그다. 구글 공식 진단 순서는 같은 폴더의 google-traffic-drop-debugging.md가 우선이고, 이 파일은 보조다.

## 1. 지표 조합으로 증상 가르기

기간: 최근 3개월 대 전년 동기. 노출과 CTR을 같이 본다. (https://seo.tbwakorea.com/blog/content-decay)

| 노출 | CTR | 해석 | 할 일 |
|---|---|---|---|
| 감소 | 감소 | 전형적 감쇠 신호 | 콘텐츠 갱신, 경쟁 글 비교 |
| 감소 | 상승 | 순위는 밀렸지만 유입 품질은 좋음, 회복 가능 | 순위 회복용 보강 |
| 유지 | 감소 | AI 개요나 리치 결과가 클릭을 가져갔을 가능성 | 제목과 스니펫 개선, AI 인용 점검 |

- 이 표는 한 글의 해석이다. 원인을 단정하는 규칙이 아니라 가설 우선순위다. 미검증.
- 네이버와 구글 어느 쪽 문제인지 가르려면 서치콘솔과 네이버 서치어드바이저를 같이 본다. (같은 글)

## 2. 급락 원인 4가지와 확인법

1. 콘텐츠 노후: "추천", "비교", "연도 포함" 류 질의는 신선도 영향이 크다. 네이버와 구글을 둘 다 운영하면 갱신이 밀려 감쇠가 빨라진다.
2. 경쟁 글 강화: 같은 키워드에서 더 나은 글이나 백링크를 가진 경쟁 글이 생겼다.
3. 검색 의도 변화: 같은 키워드의 SERP 구성이 바뀌었다. 긴 가이드에서 짧은 요약, AI 답변, 커뮤니티 후기로 이동. 지금 SERP를 직접 열어 상위 글 형식을 확인한다.
4. 내부 카니발라이제이션: 블로그, 공식 사이트, 캠페인 페이지가 같은 키워드를 두고 권위를 나눈다.
(모두 https://seo.tbwakorea.com/blog/content-decay)

- 수정 직후 급락이면 수정본과 이전 버전을 비교한다. 수정 없이 완만하게 빠졌으면 감쇠다. (같은 글)
- 유출 문서 해석상 구글이 글의 모든 버전을 보관하고 링크 분석에는 최근 20개 버전만 쓴다는 설명이 있다. 미검증이며 의사결정 근거로는 약하다. (https://seo.tbwakorea.com/blog/google-leak/)

## 3. 서서히 vs 갑자기

- 서서히: 콘텐츠 감쇠 쪽이다. 연 1회 핵심 20개 갱신, 분기 1회 전년 대비 20% 이상 감소 글 점검, 월 1회 핵심 키워드 경쟁 글 모니터링을 루틴으로 둔다. (https://seo.tbwakorea.com/blog/content-decay)
- 갑자기: 이 블로그에는 알고리즘 업데이트, 페널티 판정 순서가 없다. 블랙햇 글은 페널티 결과(순위 하락, 일시 제거, 사이트 차단)와 유형 정의만 있고 해제 방법이 없다. 급락이 갑자기 오면 먼저 5절의 기술 점검으로 가고, 그다음 google-traffic-drop-debugging.md를 따른다. (https://seo.tbwakorea.com/blog/black-hat-seo/)

## 4. 색인되지 않는 글: 진단 순서

1. 서치콘솔 상단 검사창에 URL을 넣어 색인 여부와 이슈를 본다. (https://seo.tbwakorea.com/blog/common-seo-mistakes-and-how-to-handle/)
2. 원인 4가지를 순서대로 지운다.
   - 실수로 붙은 noindex 태그: 제거.
   - 낮은 콘텐츠 품질: 품질 정책 기준으로 보강. (대량 저품질 글은 tbwa-content-audit.md 4절)
   - robots.txt 차단: 파일 점검. User-agent 아래 Disallow: / 이면 차단 상태다.
   - 중복 콘텐츠: 원본을 정해 표준 URL로 두고 나머지는 301과 canonical.
3. 새 URL이 sitemap.xml에 있는지 확인한다. 없으면 추가 후 서치콘솔에 다시 제출한다. (같은 글)
4. 색인 생성 보고서 상태 의미: 오류는 구글봇이 접근하지 못해 색인 실패, 유효(경고 있음)는 색인됐지만 주의 필요, 유효는 정상, 제외됨은 의도적 제외나 구글이 중복으로 판단한 것. (https://seo.tbwakorea.com/blog/complete-guide-to-google-search-console/)
5. 발행 글 수와 "유효" 수가 충분한 시간 후에도 다르면 "오류"와 "제외됨"을 눌러 원인을 찾는다. 새 페이지가 인식되고 색인되기까지 최대 한 달 걸릴 수 있다는 설명이 있다. 오류 페이지 유무는 매일 확인하라고 권한다. 수정 후 "수정 결과 확인" 버튼으로 재검사. (같은 글)
6. 이 글은 오류 유형별 세부 해결법을 다루지 않는다. 대량 글이 "제외됨"에 몰릴 때의 구체 기준은 이 블로그에 없다.

robots.txt와 noindex 구분:
- robots.txt는 크롤링 제한, noindex는 색인 제외다. 색인을 막으려면 noindex다. 다른 사이트 링크가 있으면 robots로 막은 URL도 색인에 남을 수 있다. (https://seo.tbwakorea.com/blog/robots-txt-complete-guide/)
- 글 밖 일반 지식으로, robots로 막으면 크롤러가 noindex 태그를 읽지 못하므로 둘을 같이 쓰지 않는다. 글도 같은 취지로 덧붙였다. (같은 글)
- robots.txt 규칙: Allow가 Disallow보다 우선, 경로는 대소문자 구분, Sitemap은 절대 URL, 루트에 robots.txt로 둔다. 상위 경로 Allow: / 를 같이 쓰면 차단 규칙이 무효가 된다. (같은 글)

## 5. 기술 점검 체크 (급락 원인 후보를 빠르게 지우기)

- 응답 코드: 서치콘솔 설정의 크롤링 통계 보고서에서 응답 코드별 현황을 본다. 500이 간헐적이면 괜찮고 장기간이면 SEO에 강한 부정 영향, 503이 지속되면 색인에서 URL이 빠질 수 있다. (https://seo.tbwakorea.com/blog/what-is-http-status-code/)
- 내부 링크가 404를 가리키면 순위에 영향을 줄 수 있으니 정리한다. (같은 글)
- 사이트맵에는 색인하려는 표준 URL만 둔다. 리다이렉트된 URL, 404 URL은 뺀다. 구글은 lastmod가 정확하지 않으면 무시하고 priority와 changefreq도 무시한다고 한다. URL 수와 용량 한도는 글에 없다. (https://seo.tbwakorea.com/blog/how-to-create-and-submit-a-sitemap/)
- 속도: 코어 웹 바이탈 기준은 tbwa-search-console-analysis.md. 로딩이 3초 지속되면 이탈 가능성이 32% 증가, 10초면 123% 증가한다는 수치가 인용돼 있다(Unbounce 인용, 재검증 안 함). (https://seo.tbwakorea.com/blog/common-seo-mistakes-and-how-to-handle/)
- 대량 페이지 구조: 구글 AI 모드 대응 글은 TTFB 500ms 미만 권장, HTTP 200, 중요 페이지에 noindex 없음, canonical 중복과 순환 없음, 핵심 본문은 텍스트로 제공을 점검 항목으로 둔다. (https://seo.tbwakorea.com/blog/google-ai-mode/)
- 중복과 얇은 글 대량 문제는 tbwa-content-audit.md 4절.

## 6. 클릭률이 떨어질 때

- 원인 가설 3개: 순위 하락, 제목이나 스니펫이 경쟁 글보다 약함, SERP 위에 AI 개요나 리치 결과가 생김.
- 순위 변화 없는데 CTR만 하락이면 제목과 메타를 먼저 고친다(규칙은 tbwa-title-snippet.md), 그다음 AI 개요 노출 여부를 직접 검색해 확인한다. 서치콘솔에서 AI 개요 클릭을 따로 보는 방법은 이 블로그에 없다. (https://seo.tbwakorea.com/blog/google-ai-overview/)
- 검색엔진이 페이지별 평균 CTR 기대치를 갖고 있고 이보다 낮으면 페이지를 부정적으로 볼 가능성이 높다는 설명이 있다. 근거 불명, 미검증. (https://seo.tbwakorea.com/blog/what-is-abtest-for-seo/)
- 순위별 CTR 수치는 출처 불명이다. 2페이지 클릭 비율 0.78%(Backlinko 인용), 상위 3개 결과가 전체 클릭의 75%, 1위가 31.7%(출처 표기 없음). 의사결정에 쓰려면 자체 서치콘솔 데이터로 대체한다. (https://seo.tbwakorea.com/blog/what-is-serp/)

## 출처 글

- 잘 나가던 콘텐츠의 검색 순위가 하락하는 이유: https://seo.tbwakorea.com/blog/content-decay
- 흔히 일어나는 SEO 실수 8가지: https://seo.tbwakorea.com/blog/common-seo-mistakes-and-how-to-handle/
- 구글 서치 콘솔 사용법: https://seo.tbwakorea.com/blog/complete-guide-to-google-search-console/
- robots.txt 총정리 가이드: https://seo.tbwakorea.com/blog/robots-txt-complete-guide/
- 사이트맵 쉽게 만들고 제출하기: https://seo.tbwakorea.com/blog/how-to-create-and-submit-a-sitemap/
- HTTP 상태 코드란?: https://seo.tbwakorea.com/blog/what-is-http-status-code/
- 블랙햇 SEO란?: https://seo.tbwakorea.com/blog/black-hat-seo/
- 구글 AI 모드에서 웹사이트 경쟁력 높이는 방법: https://seo.tbwakorea.com/blog/google-ai-mode/
- 구글 AI 오버뷰란?: https://seo.tbwakorea.com/blog/google-ai-overview/
- AB테스트란?: https://seo.tbwakorea.com/blog/what-is-abtest-for-seo/
- 구글 검색 알고리즘 유출 11가지 핵심 내용: https://seo.tbwakorea.com/blog/google-leak/
- SERP란?: https://seo.tbwakorea.com/blog/what-is-serp/
