// 팔레트 단일 소스. tailwind.config·차트·채널 메타가 전부 여기서 가져온다.
// (개편 전에는 tailwind 토큰과 컴포넌트 하드코딩 색이 서로 다른 두 벌로 갈라져 있었다.)
//
// 방향 = "Operations Paper" — 낮에 사무실에서 보는 관제 문서.
// 원칙: 화면의 무채(종이+잉크)가 90%. 색이 보이면 그건 100% '상태'다.
// 브랜드 강조색을 따로 두지 않는다 — 판정 3색(양호·주의·미달)이 이 도구의 주인공이라
// 브랜드색을 얹으면 그 신호와 경쟁한다.

export const palette = {
  // 지면 — paper는 카드(surface, 흰색) 아래 깔리는 배경. 카드가 "종이처럼 떠 보이려면"
  // 이 배경과 흰 카드 사이 명도차가 있어야 한다(그림자만으론 부족했다 — 2026-07-31 카드 입체감 보강).
  paper: "#E2E7EC",
  "paper-2": "#F4F6F8",
  surface: "#FFFFFF",
  "surface-2": "#F1F4F7",

  // 잉크
  ink: "#101823",
  "ink-2": "#3D4A57",
  muted: "#5F6B77",

  // 선
  border: "#DCE2E9",
  "border-strong": "#C2CBD5",

  // 딥 밴드(사이드바) — 면으로 성격을 가른다
  deep: "#131B25",
  "deep-2": "#1F2A37",
  "deep-line": "#2C3846",
  "deep-text": "#C7D0DA",
  "deep-muted": "#7C8896",

  // 상태 — 지면 위 대비 4.5:1 이상
  positive: "#0E7A4C",
  warning: "#8A5A05",
  negative: "#B4302A",
  // 상태 '면'(막대·아이콘)은 텍스트보다 밝게 써야 형태가 읽힌다
  "positive-face": "#12A566",
  "warning-face": "#D9930C",
  "negative-face": "#DC4038",

  // 선택·포커스 — 상태색 축과 겹치지 않게 유일하게 남긴 유채 액션색
  accent: "#1E4FD8",
  /**
   * 선택된 행의 면. accent를 흰 지면에 6%·12%로 섞은 값이다(2026-08-25).
   * **상태색이 아니라 선택 표시다** — 판정 3색과 축이 다르므로 경쟁하지 않는다.
   * 두 단을 두는 이유: 주간 원장 표가 지표마다 `값 │ 대비` 2열이라, 옅은 쪽을 값에
   * 진한 쪽을 대비에 깔아야 **어디까지가 한 지표인지**가 선 없이도 읽힌다
   * (고방어드민 주간 격자의 88%/82% 규칙을 무채 팔레트로 옮긴 것).
   * 고정(sticky) 행이 깔고 있으므로 반투명이 아니라 불투명이어야 한다 — 밑을 지나가는 행이 비친다.
   */
  "select-face": "#EEF2FC",
  "select-face-2": "#E1E9FA",

  /**
   * 비교 주의 면 — **무채인데 `paper`보다 한 단 더 진하다.** 판정 3색·`select-face`(선택,
   * 유채)와 겹치지 않게 여전히 무채를 쓰지만, `paper`(#E2E7EC)가 표 얼룩(줄무늬 `surface-2`)과
   * 너무 가까워 비교 행이 안 보인다는 재지적(2026-08-26)에 한 단 더 내렸다.
   *
   * ⚠️ 이 밑으로 더 내리면 이 지면 위 양호(positive) 텍스트의 대비가 4.5:1 밑으로 떨어진다
   * (실측: `paper` 자체도 이미 4.32:1로 살짝 못 미쳤다 — 이 표는 원래도 여유가 없었다).
   * 그래서 여기서 멈추고, 나머지 "더 눈에 띄게"는 배지를 선 대신 채운 면으로 바꿔
   * 감당한다(아래 렌더 참고) — 텍스트 대비가 아니라 장식(배지·띠)에서 무게를 더하는 쪽이
   * 대비를 깨지 않는다.
   */
  "compare-face": "#DFE3E9",
  "compare-face-2": "#DBDFE5",
} as const;

/**
 * 자체 SVG 아이콘(분류 배지)의 fill 팔레트 — icon-design 스킬(TOSSFACE 계열) 토큰. 아이콘 한 개에 5종 이내.
 * 무채 90% 원칙의 예외가 아니다: 판정 색(양호·주의·미달)과 겹치지 않게 **영역을 가르는 얼굴**에만 쓴다(baseline §7 "화면의 얼굴").
 */
export const iconPalette = {
  yellow: "#FFC84D",
  red: "#EF4452",
  orange: "#FF9000",
  green: "#23B169",
  sky: "#64A7FF",
  navy: "#313D4C",
  white: "#FFFFFF",
} as const;

export const channelColor = {
  google: "#B5544B",
  meta: "#3A6AB4",
  apple: "#65727F",
  naver: "#2E8B5F",
  kakao: "#9A7508",
} as const;

/** 차트 공용 — recharts에 넘길 값 */
export const chart = {
  /** 축선 */
  axis: palette.border,
  /**
   * 눈금 텍스트 — **본문 보조색(`muted`)보다 한 단 옅게.**
   * 축 라벨은 데이터를 읽는 좌표계이지 읽을 내용이 아니다. `muted`로 두면 30일 차트에서
   * 날짜 30개가 데이터 선만큼 진하게 깔려 시선을 뺏는다(2026-08-11 지적).
   */
  axisText: "#858F9C",
  grid: palette.border,
  tooltipBg: palette.surface,
  tooltipBorder: palette["border-strong"],
  tooltipText: palette.ink,
  track: palette["surface-2"],
} as const;
