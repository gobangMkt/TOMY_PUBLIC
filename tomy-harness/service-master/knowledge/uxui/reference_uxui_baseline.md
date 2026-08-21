# 출발선 — 새로 만드는 모든 화면의 기본값 (uxui)

## 이 파일이 존재하는 이유

총괄(2026-08-20): **"줍줍분양·어드민 등 굵직한 프로젝트를 완수하고 디자인 최종결론까지 냈는데, 이젠 뭘 만들든 최소 그 수준에서부터 시작이어야 하는 게 당연한 거 아니냐."**

맞다. 그동안은 "레퍼런스를 찾아보라"는 **지시**만 있었고 찾는 건 매번 새 숙제였다. 그래서 백지에서 다시 정하는 일이 반복됐다(07-17 어드민 5회 왕복, 08-19 찐정책 필터·IA 붕괴).

이 파일은 **이미 출시로 검증된 결론을 신규 기본값으로 못박은 것**이다.

> **사용법**: 새 화면·컴포넌트를 만들기 전에 이 파일부터 읽는다. 여기 있는 값은 **고민 대상이 아니라 기본값**이다. 벗어나려면 그 화면 고유의 사유가 있어야 하고, 벗어났으면 **그 자리에서 프로젝트 정본에 등록**한다.
> **출처 계층**: 규칙의 정본 = `for_Release/gobang-bunyang/docs/design-system.md` · 구현의 최신본 = `for_Release/gobang-jjinpolicy/src/components` · 데스크톱 표 중심 별계 = `for_Local/고방미디어허브/docs/design-system.md`(색·타이포는 공유 안 함, **동작→형태 어휘만** 상속).

---

## 1. 레이아웃 / 면

| 항목 | 기본값 |
|---|---|
| 기준 뷰포트 | 모바일 퍼스트 **375px** |
| 컬럼 | `mx-auto max-w-[560px] min-h-dvh` + `sm:border-x sm:border-hairline sm:shadow-frame` |
| 컬럼 밖 | `bg-canvas`(컬럼보다 짙게 → figure/ground 부양) |
| **섹션 구분** | **면분리. `border-t` 라인 금지.** 회색 배경(`paper-warm`) 위에 흰 밴드(`bg-paper`)를 쌓는다 |
| 밴드 간 gap | **12px**(`gap-3`) |
| 좌우 패딩 | `px-4` 고정 |
| 컬럼 배경 | 밴드를 쓰면 `paper-warm`, 안 쓰면 `paper` (밴드가 떠 보이려면 바닥이 회색이어야 한다) |
| 진입 카드 | 흰 카드 + radius 10 + `shadow-card` + `border-hairline` |
| 좌측 레일 | 목적지 3개 이상일 때만. 1개면 두지 않는다 |

**위계는 형태가 가른다** — 축이 다르면 담는 그릇이 달라야 한다. 홈 기준 확정형: 시간축 = 흰 밴드 위 평평한 세로 목록 / 분류축 = 회색 면 위 경계 있는 그룹 카드 + 가로 넘김. ⛔ **같은 형태를 두 겹 포개지 말 것**(슬라이드 안의 슬라이드, 2026-08-20).
**바(줄)를 새로 쌓지 않는다** — 역할이 같으면(목록을 좁히는 조건: 검색·필터·정렬) 기존 줄에. 폭이 모자라면 스크롤이 아니라 **줄만 나눈다**.

## 2. 색

| 토큰 | 값 | 용도 |
|---|---|---|
| `accent` / `accent-deep` | `#25B9B9` / `#10A6A6` | **단일 키컬러**(민트) / 테두리·체크·활성 도트 |
| `ink` / `ink-soft` / `ink-mute` / `disabled` | `#161B20` / `#555B61` / `#6D7379` / `#B1B6BC` | 본문 / 보조·보조링크 / 캡션·메타 / placeholder |
| `paper` / `paper-warm` / `canvas` | `#FFFFFF` / `#F5F6F7` / `#DFE3E8` | 면 / 면분할·칩 / 컬럼 밖 |
| `hairline` / `line` | `#ECEFF2` / `#E2E6EB` | 구분선 / 버튼·썸네일 테두리 |
| `open` / `wait`·`wait-ink` / `dday` / `caution` | `#1BAA5A` / `#F0A020`·`#B9791A` / `#FF513E` / `#D64B36` | 진행중·확정 / 예정(배경 14%+진한잉크) / **긴급도 축**(상태색과 별개) / 경고 문구 |
| `--shadow-card` / `--shadow-frame` | `0 0 10px rgb(0 0 0/.03)` / `0 1px 3px rgb(22 27 32/.05), 0 18px 50px -20px rgb(22 27 32/.18)` | |

1. **키컬러 = 내비게이터.** 민트는 ①주요 액션 ②활성·선택 상태 ③지도 마커에만. 카운트·보조 링크·랭크·정적 라벨·아이콘·마감은 전부 잉크.
2. ⛔ **카테고리별 고유색 금지.** 분류 구분은 색이 아니라 **형태**가 한다. 무지개 팔레트 = "긁어온 화면".
3. ⛔ **하드코딩 hex 금지** → `globals.css @theme` 토큰만. `text-white` 금지 → `text-paper`. (그물: `tests/design-tokens.test.ts` — **신규 프로젝트에 이 테스트를 같이 깐다**. 규칙만 있고 그물이 없으면 안 지켜진다.)
4. 판정·신뢰도 같은 새 축은 **새 색을 만들지 말고 기존 상태색을 재사용**. 반드시 **색 + 아이콘 + 텍스트 3종 페어링**(색약).
5. 두 축(예: 신청상태 / 자격판정)을 **같은 카드에 동시 렌더 금지**.

## 3. 타이포 (Pretendard Variable 단일)

스케일 **11 / 12 / 13 / 14 / 16 / 18 / 20 / 24** — ⛔ 12px 미만 금지.

| 역할 | 값 |
|---|---|
| 헤더 타이틀 | 16px bold |
| 섹션 제목 h2 | **18px extrabold** |
| 하위 묶음 h3 | **15px bold** |
| 로고 워드마크 | 20px extrabold, **잉크 단색** |
| 카드 1순위(결정 정보) | 17px extrabold |
| 카드 제목 | 14.5px semibold |
| 본문·보조 링크 | 13~14px (링크 13px semibold) |
| 캡션·메타 | 12px `ink-mute` |
| 배지 | 11px bold |

숫자는 **`tabular-nums`(`.tabular`) 필수** — 안 쓰면 카드마다 날짜·금액 폭이 흔들린다.

## 4. 컨트롤 어휘 — 동작의 종류가 형태를 정한다

| 동작 | 형태 | 규격 |
|---|---|---|
| ① 데이터를 **쓴다**(제출·발행·저장) | 키컬러 채움, 화면당 1~2개 | CTA 높이 **52px**, radius 8 |
| ② 같은 화면에서 **연다·더한다** | **테두리**(`border-line`) | |
| ③ **반복·부수**(새로고침·초기화) | **아이콘만 + `title`**, 라벨 금지 | 라벨을 붙이면 ②와 안 갈린다 |
| ④ **다른 화면으로 간다** | 텍스트 + 화살표, **테두리 금지** | `MoreLink` |
| ⑤ 조회 **조건을 고른다** | **드롭다운** (탭·세그먼트 펼치기 금지) | `SelectMenu` |
| ⑥ **상태를 보여준다** | 배지 | `StatusBadge` |
| ⑦ 제자리 **펼침** | 하단 풀블리드 텍스트 + Chevron | `MoreButton` |
| ⑧ **드릴다운**(행·타일 → 상세) | ChevronRight **16** | |

**핵심 대비: 테두리 = 여기서 처리된다 / 화살표 = 여기서 나간다.**
아이콘 역할 분리: **ChevronRight 16 = 드릴다운 / ArrowRight 15 = 전진 CTA.** 섞지 말 것.

## 5. 헤더 · 섹션 · 이동

| 요소 | 기본값 |
|---|---|
| **PageHeader** | `sticky top-0 z-20 h-12 flex items-center gap-1 border-b border-hairline bg-paper px-2`. 좌=BackButton / 제목 16px bold truncate(**`p` 태그** — 본문 h1과 충돌 방지) / 우=**전역성 컨트롤만**(로컬 기능은 콘텐츠 영역으로) |
| **SectionHeading** | `flex items-baseline gap-2 px-4 pt-5 pb-2.5`, h2 18px extrabold + `hint`(12px ink-mute) + `action` 슬롯. `level` 2/3, `tone` 점. ⛔ 로컬 h2/h3 손짜기 금지 |
| **제목 앞 점(tone)** | **상세 전용.** 밴드가 전부 '제목+본문'이라 형태로 못 가르는 화면에서 성격 표시. `accent` 점은 한 화면에 하나. 홈처럼 형태로 가를 수 있으면 쓰지 않는다 |
| **전체보기(MoreLink)** | 섹션 헤더 우측상단, 문구 **"전체보기" 고정**, 13px semibold `ink-soft` + ArrowRight 15 |
| **더보기(MoreButton)** | 리스트 하단 풀블리드, `더보기 N개`/`접기`, 13.5px semibold, Chevron 16, `py-3.5` |
| **BackButton** | ArrowLeft 20 sw1.5. `router.back()` 기본 + `fallback` 딥링크. ⛔ 하드 `href="/"` 금지 |

## 6. 카드

| 항목 | 기본값 |
|---|---|
| 구조 | **썸네일-좌 + 우측 정보** 컴팩트 로우, `flex items-stretch gap-3.5 px-4 py-4` |
| 썸네일 | **64×64**, radius 10, `border-line`, `overflow-hidden` |
| 사진 없는 서비스 | 그 슬롯을 비우지 말고 **플랫 fill 아이콘 배지 + `bg-accent/10`** (사진이 없으면 아이콘이 유일한 시각 요소다) |
| 배지 위치 | 썸네일 좌상단 모서리 붙임(안쪽만 `rounded-br-[8px]`). 법적 라벨과 상태는 **반대 코너로 분리** |
| 정보 순서 | ①그 서비스의 결정 정보 ②이름 + 우측 정보태그 ③메타 `·` 조인 12px ink-mute ④태그칩 |
| 구분 | `border-b border-hairline`, `last:border-b-0` |
| 비활성(마감) | 텍스트 `ink-mute` + 이미지 `opacity-55`. ⚠️ **행 배경을 회색으로 깔지 말 것** — 마감 비중이 높은 목록에서 밴드가 통째로 회색이 되어 면분리와 "회색=마감" 신호가 동시에 죽는다 |
| 라운딩 | 썸네일·카드 **10** / 박스·팝오버 **12** / 강조카드·시트헤더 14 / CTA 8 / 배지·칩 **4** / 필터칩 6 / 바텀시트 16 |
| 알약(`rounded-full`) | ⛔ 금지. 예외는 지도 시그니처뿐 |
| 배지 상수 | `rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold leading-none` — **전 화면 단일 상수로 export** |
| 캐러셀 | 페이지 폭 **92%**(다음 장 8% peek = 어포던스) + `snap-x snap-mandatory` + 도트(활성 `w-2.5 bg-accent-deep` / 비활성 `w-1 bg-line`) |

## 7. 아이콘 — 두 어휘를 섞지 않는다

| 쓰임 | 어휘 | 규칙 |
|---|---|---|
| **기능 크롬**(화살표·돋보기·닫기·달력) | `lucide-react` | stroke **1.5~1.8**, 무채색 |
| **화면의 얼굴**(로고·파비콘·분류 배지·진입 타일) | **자체 SVG** | viewBox `0 0 20 20` · **fill 전용(stroke 금지)** · 플랫 · 색 5종 이내 |

자체 SVG 색은 hex가 아니라 `fill-accent`·`fill-paper` 토큰 유틸(`.svg` 파일만 예외). 3층 톤 `body`/`sub`/`cut`, muted면 전부 중립. ⛔ **UI 이모지 금지.** 로고는 심볼만 키컬러, 워드마크는 잉크.

## 8. 인터랙션

| 항목 | 기본값 |
|---|---|
| 눌림 피드백 | 로우·카드 `active:bg-paper-warm` / 타일·큰 카드 `+active:scale-[0.98]` / 칩·버튼 `active:scale-95` / 링크 `active:opacity-70`. ⛔ 무반응 클릭 금지 |
| 터치 | `active:`만 (`hover:`-only 금지). 타깃 최소 **44px**(`min-h-11`) |
| 전환 | 라우트별 **`loading.tsx` 스켈레톤** 필수 — 클릭 즉시 뼈대→콘텐츠 |
| 뒤로가기 | `router.back()` + `fallback` |
| 모션 | **150~250ms ease-out**, `transform`/`opacity`만. 바운스 금지. 진입 강조는 **1회**(반복 금지). `prefers-reduced-motion` 전역 리셋 필수 |
| 드롭다운 | 트리거 **고정 너비 + truncate**(레이아웃 흔들림 금지), 라벨은 `축 · 값`, 활성은 **테두리로만**. 팝오버 `top-[calc(100%+6px)] z-50 rounded-[12px] shadow-[0_8px_28px_rgba(0,0,0,.16)] max-h-[50vh]`, 바깥클릭·Esc 닫힘 |
| 🚨 치명 함정 | **드롭다운·팝오버가 든 컨테이너에 `overflow-*` 금지.** 한 축이 `auto`면 다른 축도 `visible`이 아니게 되어 팝오버가 통째로 잘린다(2026-08-19 필터 4개 전멸, 서버 로직은 멀쩡했다) |
| z-index | 헤더 `z-20` / 팝오버 `z-50` |

---

## 9. 바로 트랜스포즈할 컴포넌트 (이름만 알면 된다)

**정본 = `gobang-jjinpolicy/src/components`** (아래 ★는 이 repo가 최신·정답)

| 역할 | 컴포넌트 | 비고 |
|---|---|---|
| sticky 헤더 | `PageHeader` ★ | 제목 `p` 태그 |
| 뒤로가기 | `BackButton` | 양 repo 동일 |
| 섹션 제목 | `SectionHeading` ★ | `level`·`tone` 있는 판 |
| 다른 화면 이동 | `MoreLink` | 양 repo 동일 |
| 제자리 펼침 | `MoreButton` ★ / `Collapsible` / `Fold` | bunyang은 인라인이라 이식 불가 |
| 조회 조건 드롭다운 | `SelectMenu` ★ | 제네릭 1개(원본 gobang-admin `ui/select-menu.tsx`) |
| 가로 캐러셀 | `CardCarousel` ★ | 제네릭 + peek |
| 목록 카드 | `PolicyCard` / bunyang `PropertyCard` | 같은 역할·다른 이름 |
| 사진 없는 썸네일 | `CategoryIcon` / bunyang `ListingFallback` | 같은 역할·다른 이름 |
| 상태 배지 | `StatusBadge` ★ + `BADGE_BASE` | |
| 긴급도 칩 | `DdayChip` ★ | 11px/radius 4 |
| 판정 라벨(3종 페어링) | `TrustLabel` | 신규 어휘, 이식 가능 |
| 로고 | `Brand`(`BrandMark`/`BrandLockup`) ★ | 토큰 기반 |
| 진입 타일 아이콘 | `QuickIcons` / `QuickMenu` | 2분할 타일 min-h 92 |
| 필터 바 | `FilterBar` / bunyang `MapFilter`·`FilterSheet` | 구현 다름, 규칙만 공유 |
| 태그 칩 · 캘린더 · 스크롤탑 · VoC · 트래킹 | bunyang `TagChips`·`CalendarView`·`ScrollTopButton`·`VoCWidget`·`ClickTracker` | bunyang에만 |

## 10. 알려진 부채 — 신규에 복제하지 말 것

| 부채 | 어디 | 신규에서는 |
|---|---|---|
| 액센트 토큰 3개(`accent2` 앰버·`accent3` 코럴) | bunyang | **`accent`/`accent-deep` 2개만** |
| PageHeader 제목이 `h1` | bunyang | `p` |
| SectionHeading 위계 1단 | bunyang | `level` 2/3 |
| 썸네일 문서 64 vs 코드 84 | bunyang | **64로 시작**, 그 repo를 만질 때 정본 재확정 |
| D-day 칩 9px/radius 3 | bunyang | **11px/radius 4**(자기 문서 위반 중) |
| 자체 SVG hex 하드코딩 | bunyang | 토큰 유틸 + 가드 테스트 |
| 드롭다운 3개 파일 분산 | bunyang | 제네릭 1개 |
| 라운딩 §원칙 vs §6 불일치 | bunyang 문서 | **§6이 최신**(카드 10 / 박스·팝오버 12) |
| `MoreButton`이 문서엔 있고 파일이 없음 | bunyang | 컴포넌트로 |
| CLAUDE.md가 폐기된 "에디토리얼 매거진"을 참조 | bunyang | — |

## 11. 아직 확정 안 된 축 (새로 정하면 여기 등록한다)

**상태·피드백**: 빈 상태 · 에러 화면(404/500/오프라인/로드실패) · 토스트·스낵바 · 스켈레톤 형태 · 저장 중/낙관적 업데이트
**입력**: 폼 검증 표시 · 입력 필드 규격(높이·포커스 링·helper) · 체크박스·라디오·토글 · 검색 입력 · 날짜 선택기 · 파일 업로드
**컨테이너**: 모달·확인 다이얼로그 · 바텀시트(핸들·백드롭·스냅) · 툴팁 · 탭 · 아코디언 · 테이블
**시스템**: 간격 스케일 토큰 · z-index 스케일 · 모션 토큰 · 버튼 사이즈 스케일 · **`focus-visible` 포커스 링(현재 전 규칙에서 누락 — 접근성 공백)** · 다크 모드 · 560px 초과 데스크톱 전략 · 페이지네이션 · 차트 팔레트 · 숫자 뱃지·아바타 · 온보딩

> 이 목록은 **"아직 없다"는 사실의 기록**이다. 여기 있는 축을 새로 만들 때는 즉흥으로 정하지 말고 정해서 이 파일에 올린다.
