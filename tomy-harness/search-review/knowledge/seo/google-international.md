# 구글 국제, 다국어 가이드 (한국어 단일 사이트 기준)

> 마케팅팀장 지식. 한국어 단일 사이트에서 언어, 국가 타깃팅과 지역 신호를 점검할 때 쓴다. 다국어 확장(hreflang 운영)은 다루지 않는다. 출처: 구글 검색 센터 공식 문서(URL 하단). 회사 실측 데이터는 담지 않는다.

## 1. 판정
- 한국어만 제공하고 특정 국가를 따로 지정하지 않으면 다국어, 다지역 사이트에 해당하지 않는다. 구글은 검색자의 언어와 페이지 언어를 맞춘다 (managing-multi-regional-sites).
- 언어 판단은 lang 속성이나 URL이 아니라 화면에 보이는 콘텐츠로 한다. 본문과 내비게이션을 한국어로 통일하고 영문 UI가 섞이지 않게 한다.
- 한국만 명시 타깃팅하면 국내 순위는 오를 수 있고 다른 지역, 언어 실적은 내려갈 수 있다.

## 2. 지역 신호
- .kr 같은 국가 코드 도메인은 강한 한국 신호. .com, .org 같은 gTLD는 지역 URL, hreflang 등으로 따로 알려야 한다.
- .co, .io, .ai, .me, .tv 등 일부 ccTLD는 gTLD로 취급되어 한국 신호가 아니다.
- 서버 IP 위치는 확실한 신호가 아니다(CDN이면 특히). 한국 주소, 전화번호, 원화 가격, 국내 사이트의 링크는 보조 신호.
- geo.position, distribution 같은 위치 메타 태그는 구글이 무시한다.

## 3. 피할 구현
- IP나 Accept-Language로 콘텐츠를 바꾸거나 자동 리디렉션하지 않는다. Googlebot은 주로 미국에서 크롤링하고 Accept-Language를 보내지 않아 사이트를 제대로 못 볼 수 있다.
- 한글 URL은 사용 가능하나 UTF-8을 쓰고 링크 시 올바르게 이스케이프한다.
- 같은 한국어 콘텐츠가 여러 URL에 있으면 canonical로 기본 URL을 지정한다.

## 4. 이번에 읽지 않은 범위
- hreflang 세부, 다국어 URL 구조 비교 이상의 지역별 가이드는 한국어 단일 사이트에 해당하지 않아 제외했다.

## 출처 문서
- 다지역 사이트 관리: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites?hl=ko
