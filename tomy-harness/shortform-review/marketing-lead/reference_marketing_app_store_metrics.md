# 앱 스토어 콘솔 지표 — Google Play Console · App Store Connect (2026-10-17 신설)

> 언제 읽나: 앱 다운로드·활성·평점을 **스토어 콘솔 숫자로** 보고·비교·추세화할 때, 두 OS 지표를 짝지을 때, 콘솔 CSV를 받아 내부 도구에 넣을 때.
> 근거: 공식 도움말만(Play Console Help · developer.apple.com, 2026-10 조회). 공식에 없는 건 `미확인`으로 둔다. 회사 실측값은 여기 적지 않는다(프로젝트 워크스페이스 소관).

## 1. 결론부터 — 두 OS를 짝지을 때

| 보고 싶은 것 | Android (Play Console) | iOS (App Store Connect) | 짝 판정 |
|---|---|---|---|
| 신규 다운로드 | 통계 › **사용자 획득 › 신규 사용자**(User acquisitions › New users) | 분석 › **최초 다운로드 수**(First Time Downloads) | ✅ 가장 가까움. 둘 다 **계정 기준 첫 설치**(Play: 그 사용자 기기 어디에도 없을 때 / Apple: Apple ID 첫 받기) |
| 재설치 포함 다운로드 | 설치 이벤트(Install events, 재설치 중복) | 전체 다운로드 수(= 최초 + 재다운로드, 업데이트 제외) | △ 재설치 처리 방식이 달라 추세 비교만 |
| 기기 기준 획득 | 기기 획득 › 신규 기기(Device acquisition › New devices) | 해당 지표 없음(설치 Installations는 옵트인 표본) | ✕ |
| 활성(일) | **일일 활성 사용자(DAU)** = 그날 앱을 연 **사용자**, 전체 모수 | **활성 기기(Active Devices)** = 선택 기간에 세션 1회+ 있던 **기기**, **옵트인 표본** | △ 단위(사용자/기기)·모수(전체/동의자)가 달라 **크기 비교 금지, 추세만** |
| 활성(주 유니크) | **없음**(WAU 미제공, MAU는 28일 롤링) | 활성 기기를 주 단위 기간으로 조회하면 주 유니크 기기 | ✕ 비대칭 — 두 OS 모두 주 유니크로 맞출 수 없음 |
| 평점(스토어 노출) | **Google Play 평점** = 최근 평점 가중 | 개요 평점(overview rating) = 마지막 리셋 이후 | △ 산식 다름(Play 최근 가중) |
| 평점(누적 평균) | 전체 기간 평균(Lifetime / CSV `Total Average Rating`) | 개요 평점이 사실상 누적(리셋 시 초기화) | ✅ 추세용 짝 |
| 평점(그날 들어온 평점의 평균) | 일일 평균 평점(`Daily Average Rating`) | **없음** | ✕ 하루 값은 표본이 작아 출렁임 — 주간 지표로 쓰지 말 것 |

- 🚨 **주간 활성 사용자를 두 OS 같은 정의로 원하면 스토어 콘솔이 아니라 GA4(Firebase) 앱 스트림 주 순사용자**가 정답이다 — 같은 정의·전체 모수·유니크. 스토어 활성은 보조 추세용.
- 🚨 **DAU 7일 합 금지**(같은 사람이 날마다 다시 세어짐). 주 값이 필요하면 **7일 평균(평균 DAU)**으로 표기.

## 2. Google Play Console

### 지표 정의 (통계 페이지)
| 지표 (한/영) | 정의 | 단위 · 합산 |
|---|---|---|
| 사용자 획득 / User acquisitions | 설치했고 그 시점 다른 기기에 없던 사용자(프리인스톨 활성·재활성 포함). 하위 = 신규 사용자 / 재사용자 | 사용자 · 일별 합산 가능(추론) |
| 기기 획득 / Device acquisition | 앱이 설치된 기기(초기화·양도 기기는 신규로 셈) | 기기 · 합산 가능(추론) |
| 설치 이벤트 / Install events | 설치 횟수, 재설치 포함(프리인스톨·재활성 제외) | 이벤트 |
| 사용자·기기 손실 | 전 기기 제거 또는 30일 넘게 미사용 | 사용자/기기 |
| 설치한 잠재고객 / Installed audience | 최근 30일 사용 기기에 앱이 있는 사용자 | 스냅샷 · 합산 금지 |
| 설치 기반 / Install base | 최근 30일 켜진 활성 기기 중 설치된 수(한글 라벨 "설치한 사용자 수"인데 정의는 기기) | 스냅샷 · 합산 금지 |
| 일일 활성 사용자 / DAU | 그날 앱을 연 사용자 | 유니크 · 합산 금지 |
| 월간 활성 사용자 / MAU | **28일 롤링** 동안 앱을 연 사용자(달력 월 아님) | 유니크 · 합산 금지 |
| 첫 실행 / First opens | 설치 후 첫 실행 기기(설치 후 180일 내) | 기기 |

- 세분도: 시간별(30일 이하)·일별·**달력 주**·달력 월·분기. 계산 = 구간별 / 30일 롤링 평균. **달력 주 시작 요일 미확인** → 일~토가 필요하면 일별로 받아 직접 묶는다.
- 시간대: 설치·평점 = **PT(태평양)**. KST 일 경계와 어긋남(주 경계 최대 하루).
- 출version 변경: 2019-07 지표 개편(구 Installs by user 등), 대시보드에 "2025-01부터 일부 레거시 지표 미지원" 안내.
- Reach and devices의 **Daily active devices**는 기기 단위 **기간 평균**(기본 28일) — 통계 DAU(사용자·일별)와 다른 값.

### 평점 (평점 및 리뷰 › 평점)
- Google Play 평점(스토어 노출, 최근 가중) · 전체 기간 평균 · 일일 평균 평점 · 전체 평점 수(5개 이상일 때).
- 기간 지난 28일~전체, 집계 일별·7일·28일(7일은 달력 주 아님). 차트 **Download CSV**. 신규 평점은 약 24시간 보류 후 반영.

### 내보내기
1. **통계 페이지 CSV**(수동, 추천): 통계 › 보고서 구성(기간) › 지표 선택 › Edit에서 "구간별"·"일별" › **보고서 내보내기** → raw data CSV. 빠른 보고서로 저장 가능.
2. **평점 CSV**: 평점 및 리뷰 › 평점 › 기간 "전체" · 집계 "일별" › Download CSV.
3. **보고서 다운로드(Cloud Storage 월별 CSV)**: `stats/installs/installs_<package>_yyyyMM_<dimension>.csv`(Date, Package Name, 차원, Current Device Installs, Installs on active devices, Daily Device Installs/Uninstalls/Upgrades, Current/Total/Daily User Installs, Daily User Uninstalls), `stats/ratings/ratings_<package>_yyyyMM_<dimension>.csv`(Date, …, **Daily Average Rating, Total Average Rating**). 3~7일 지연, **DAU/MAU 컬럼 없음**, 구 지표명이라 통계 페이지 이름과 1:1 대응 미확인.

### API
- Play Developer **Reporting API = vitals(크래시·ANR 등) 전용** — 설치·DAU·평점 없음. Android Publisher API도 통계 없음. 리뷰 API는 최근 1주 리뷰 텍스트만.
- → 자동화 경로는 **Cloud Storage 월별 CSV 읽기뿐**(DAU는 이 경로로도 못 가져옴).

## 3. App Store Connect

- **2026-03 Analytics 대개편**(지표 100+ 추가·코호트·벤치마크, 도움말 `app-store-connect-analytics/`). 메뉴: 개요·유입 경로·수익화·활용도·벤치마크·Metrics.
- 🚨 **Apple의 주 = 월~일**(Analytics Reports API weekly). 일~토는 일별을 직접 묶는다.

### 지표 정의
| 지표 (영/한) | 정의 | 옵트인 · 합산 |
|---|---|---|
| Impressions / 노출 수 | 1초+ 표시 횟수(고유 기기 버전 별도) | 불필요 · 합산 가능 |
| Product Page Views / 제품 페이지 조회 수 | 페이지 조회 횟수 | 불필요 |
| Conversion Rate / 전환율 | 전체 다운로드 ÷ 고유 기기 노출 | 비율 |
| First Time Downloads / 최초 다운로드 수 | **Apple ID 기준** 첫 받기 | 불필요 · 합산 가능 · 2일 내 완결 |
| Redownloads / 재다운로드 수 | 재다운로드(자동 업데이트·기기 복원 제외) | 불필요 |
| Total Downloads / 전체 다운로드 수 | 최초 + 재다운로드, 업데이트 제외 | 불필요 |
| Installations / 설치 | 완료 설치(재다운로드·다기기·가족 공유 포함) | **필수** |
| Sessions / 세션 | 2초+ 사용 | **필수** |
| Active Devices / 활성 기기 | **선택 기간** 세션 1회+ 기기 | **필수** · 합산 금지 |
| Active in Last 30 Days / 최근 30일 활성화 | 30일 세션 1회+ 기기 | **필수** |
| Deletions / 삭제 | 삭제 횟수(iOS 12.3+) | **필수** |
| Retention / 유지율 | 설치 코호트의 N일차 실행 비율 | **필수** |

- 표시 임계: 다운로드 5건·활성 기기 5대 미만이면 안 보임. 사용 지표는 **진단·사용 정보 공유 동의자만**(전체가 아니라 표본).
- **Sales and Trends 판매량(App Units)** = 최초 구매(업데이트·같은 계정 타 기기·재다운로드 제외). Analytics 숫자와 **안 맞는 게 정상**(시간대 PT vs UTC, 복원 처리, TestFlight 등) → 한 도구로 고정.

### 평점
- Ratings and Reviews = **현재 개요 평점 + 국가별 + 리뷰 목록만**. 🚨 **평점 이력·주별 추이·내보내기 근거 없음**(공식 문서). 리셋 시 초기화·복구 불가(리셋 날짜는 Distribution 탭).
- → **iOS 평점 시계열은 직접 매주 찍어 쌓는 수밖에 없다**(과거 소급 불가). `customerReviews` API는 개별 리뷰(별점만 남긴 평점 포함 여부 미확인).

### 내보내기
1. **Analytics › Metrics**: 지표·기간·필터 선택. 🚨 최신 UI의 **CSV 내보내기 버튼 존재 여부 미확인**(구 도움말엔 "Export as CSV", 새 도움말은 "대량은 API로"). 화면에서 직접 확인 필요.
2. **Trends › Sales and Trends Reports › Download**: 일·주·월 리포트(.gz → 탭 구분 txt), **PT 기준**, 1년 보관. 일별 리포트는 **하루 한 파일**이라 과거 소급엔 번거롭다.
3. **Analytics Reports API**(키 필요): 요청(ONGOING/ONE_TIME_SNAPSHOT) → 리포트 → 인스턴스(DAILY/WEEKLY/MONTHLY) → 세그먼트 URL. 2024-01-01부터. App Downloads(Download Type: First-time·Redownload·Manual/Auto update·Restore — **필터 없이 합치면 업데이트가 섞임**), App Sessions(`Unique Devices`), App Installs. 5 미만 행 제외, Detailed는 노이즈. 같은 Date는 **가장 최근 processingDate 인스턴스만** 사용(이중 집계 방지).

## 4. 실무 규칙 (주간 OS별 추세 보고용)
1. **다운로드 = Play 신규 사용자 ↔ Apple 최초 다운로드 수.** 둘 다 일별로 받아 일~토 7일 합.
2. **활성 = GA4 앱 스트림 주 순사용자를 정본으로**, 스토어 활성(Play DAU · Apple 활성 기기)은 일별 값의 **7일 평균**으로 추세만. Apple 활성 기기는 옵트인 표본이라 Play보다 작게 나오는 게 정상.
3. **평점 = 누적끼리.** Play는 `Total Average Rating`(또는 차트 "전체 기간 평균")의 토요일 값, Apple은 매주 같은 요일에 개요 평점을 찍는다. Play `Daily Average Rating`을 주 값으로 쓰지 않는다.
4. 시간대가 다르다(Play PT · Apple Analytics UTC · Sales and Trends PT) — 주 경계 하루 오차는 감수하고 **추세**로 읽는다.
5. 같은 지표는 **한 도구로 고정**(Apple Analytics ↔ Sales and Trends 섞지 않음).

## 출처
Play: support.google.com/googleplay/android-developer/answer/139628(en·ko) · /6135870(en·ko) · /138230(en·ko) · /9419939 · /10770882 · /9859173 · developers.google.com/play/developer/reporting/reference/rest · developers.google.com/android-publisher/reply-to-reviews
Apple: developer.apple.com/help/app-store-connect-analytics/reference/metrics-definitions(en·kr) · …/engagement/app-usage · …/acquisition/acquisition · …/overview/analytics-reports-api · developer.apple.com/documentation/analytics-reports(app-download·app-sessions·app-installs·data-completeness-corrections·privacy) · developer.apple.com/help/app-store-connect/monitor-ratings-and-reviews/view-ratings-and-reviews · …/measure-app-performance/differences-in-reporting-tools · …/reference/sales-and-trends-reports-availability · developer.apple.com/news/?id=hh6v4b55
