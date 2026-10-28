// 고방 어드민 커스텀 아이콘 세트.
// 규칙: viewBox 0 0 20 20, 100% fill(무 stroke), currentColor 단색 상속.
// 색은 부모의 text-* 토큰(ink/ink-mute/primary/white)이 결정 — 아이콘 자체는 무채색.
// 라벨과 함께 쓰므로 기본 aria-hidden. 단독 의미 전달 시 label prop 사용.

import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string; label?: string };

function Svg({
  size = 18,
  className,
  label,
  box = '0 0 20 20',
  children,
}: IconProps & { box?: string; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={box}
      fill="currentColor"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

// ── 사이드바 네비 ─────────────────────────────

export function DashboardIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="6" height="6" rx="1.6" />
      <rect x="11" y="3" width="6" height="6" rx="1.6" />
      <rect x="3" y="11" width="6" height="6" rx="1.6" />
      <rect x="11" y="11" width="6" height="6" rx="1.6" />
    </Svg>
  );
}

export function BuildingIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 높은 동 + 창문 */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.5 2.5h5.5a1 1 0 0 1 1 1V17h-7.5V3.5a1 1 0 0 1 1-1Zm1.6 2.4v1.6h1.7V4.9zm0 3.4v1.6h1.7V8.3zm0 3.4v1.6h1.7v-1.6z"
      />
      {/* 낮은 동 + 창문 */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 9h4v8H3zm1.4 2.2v1.5h1.3v-1.5zm0 3v1.5h1.3v-1.5z"
      />
    </Svg>
  );
}

export function ContentIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 아티클 = 굵기 다른 텍스트 라인 */}
      <rect x="3" y="4.2" width="14" height="2.1" rx="1.05" />
      <rect x="3" y="9" width="14" height="2.1" rx="1.05" />
      <rect x="3" y="13.8" width="9" height="2.1" rx="1.05" />
    </Svg>
  );
}

export function ReportsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.6" y="16.6" width="14.8" height="1.6" rx="0.8" />
      <rect x="3" y="10.5" width="3.3" height="6" rx="1" />
      <rect x="8.35" y="6" width="3.3" height="10.5" rx="1" />
      <rect x="13.7" y="8.5" width="3.3" height="8" rx="1" />
    </Svg>
  );
}

export function TargetIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 과녁 = 바깥 링 + 중간 링 + 중심점 (동심원, evenodd로 도넛) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2Zm0 2a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 6.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Zm0 1.9a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"
      />
      <circle cx="10" cy="10" r="1.7" />
    </Svg>
  );
}

export function TagIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 가격표(태그) — 판매 상품 = 고방 BM. 구멍은 evenodd로 뚫음 */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.6 3.6A2 2 0 0 1 5 3h4.6a2 2 0 0 1 1.4.6l5.4 5.4a2 2 0 0 1 0 2.8l-4.6 4.6a2 2 0 0 1-2.8 0L3.6 11A2 2 0 0 1 3 9.6V5a2 2 0 0 1 .6-1.4Zm2.9 1.9a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z"
      />
    </Svg>
  );
}

export function SpeechIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 말풍선 — 소셜/콘텐츠 = 고방 SNS */}
      <path d="M4 3.5h12A1.5 1.5 0 0 1 17.5 5v6.5A1.5 1.5 0 0 1 16 13H9l-3.2 2.9A.7.7 0 0 1 4.6 15.4V13H4A1.5 1.5 0 0 1 2.5 11.5V5A1.5 1.5 0 0 1 4 3.5Z" />
    </Svg>
  );
}

export function CampaignsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 확성기 혼 + 마우스피스 */}
      <path d="M4 8h2.2l8-3.4a1.2 1.2 0 0 1 1.6 1.13v8.54a1.2 1.2 0 0 1-1.6 1.13L6.2 12H4a1.4 1.4 0 0 1-1.4-1.4V9.4A1.4 1.4 0 0 1 4 8Z" />
      {/* 손잡이 */}
      <path d="M5.2 12h1.9l.35 4.1a1 1 0 0 1-1 1.1h-.6a1 1 0 0 1-1-1.1Z" />
    </Svg>
  );
}

export function SettingsIcon(p: IconProps) {
  const teeth = [0, 60, 120, 180, 240, 300];
  return (
    <Svg {...p}>
      {teeth.map((a) => (
        <rect key={a} x="8.4" y="2.5" width="3.2" height="4.4" rx="1" transform={`rotate(${a} 10 10)`} />
      ))}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2.65a2.35 2.35 0 1 0 0 4.7 2.35 2.35 0 0 0 0-4.7Z"
      />
    </Svg>
  );
}

// ── KPI 카드 ─────────────────────────────

export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 4.2C4.8 4.2 1.8 8.4 1.1 9.6a.8.8 0 0 0 0 .8C1.8 11.6 4.8 15.8 10 15.8s8.2-4.2 8.9-5.4a.8.8 0 0 0 0-.8C18.2 8.4 15.2 4.2 10 4.2Zm0 3a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z"
      />
      <circle cx="10" cy="10" r="1.5" />
    </Svg>
  );
}

export function CursorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 3l0 12.8 3.4-3.3 2.2 4.5 1.9-.8-2.2-4.5 4.4-.2z" />
    </Svg>
  );
}

export function PercentIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="8.7" y="1.2" width="2.6" height="17.6" rx="1.3" transform="rotate(45 10 10)" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 3.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Zm0 1.9a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 11.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Zm0 1.9a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Z"
      />
    </Svg>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 4.3a1 1 0 0 1 1.53-.85l7.2 4.7a1 1 0 0 1 0 1.7l-7.2 4.7A1 1 0 0 1 6.5 13.7z" />
    </Svg>
  );
}

// ── 컨트롤 어포던스 ─────────────────────────────

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.5 13.47 4.02 10 2.84 11.17 7.5 15.83 17.5 5.83 16.32 4.66z" />
    </Svg>
  );
}

export function XIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="8.9" y="2" width="2.2" height="16" rx="1.1" transform="rotate(45 10 10)" />
      <rect x="8.9" y="2" width="2.2" height="16" rx="1.1" transform="rotate(-45 10 10)" />
    </Svg>
  );
}

// 더하기 — '목록에 항목을 새로 만든다'는 어포던스(리포트 목록 끝의 [+ 리포트 만들기]).
// XIcon과 **같은 막대 두 개**로 만들어 회전만 다르게 둔다(같은 세트에서 굵기·길이가 어긋나면
// 나란히 놓일 때 한쪽이 굵어 보인다). 세트 계약대로 fill 전용·stroke 없음.
export function PlusIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="8.9" y="2.6" width="2.2" height="14.8" rx="1.1" />
      <rect x="2.6" y="8.9" width="14.8" height="2.2" rx="1.1" />
    </Svg>
  );
}

// 연필 — '이 칸은 눌러서 고칠 수 있다'는 어포던스. 몸통 + 촉(꼭지) 2조각 fill(무 stroke).
/** 삭제(휴지통) — 목록 행의 파괴적 동작에만 쓴다. 라벨 없이 아이콘만 두므로 `label`로 접근명을 준다. */
export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 2.6h4a1 1 0 0 1 1 1v.9h3.2a.9.9 0 0 1 0 1.8H3.8a.9.9 0 0 1 0-1.8H7v-.9a1 1 0 0 1 1-1z" />
      <path d="M5.4 8.1h9.2l-.7 8a1.6 1.6 0 0 1-1.6 1.5H7.7a1.6 1.6 0 0 1-1.6-1.5z" />
    </Svg>
  );
}

export function PencilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 14.15V17.5h3.35l9.88-9.88-3.35-3.35z" />
      <path d="M17.74 5.28a.89.89 0 0 0 0-1.26l-1.76-1.76a.89.89 0 0 0-1.26 0l-1.38 1.38 3.02 3.02z" />
    </Svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.17 7.16 10 10.97l3.83-3.81L15 8.33 10 13.33 5 8.33z" />
    </Svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5.9" y="2.2" width="1.8" height="3.4" rx="0.9" />
      <rect x="12.3" y="2.2" width="1.8" height="3.4" rx="0.9" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 4.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm.7 5.4v1.7h1.7V9.9zm3.45 0v1.7h1.7V9.9zm3.45 0v1.7h1.7V9.9zM5.7 13.1v1.7h1.7v-1.7zm3.45 0v1.7h1.7v-1.7zm3.45 0v1.7h1.7v-1.7z"
      />
    </Svg>
  );
}

// 기간 범위 = 달력 + 가운데 가로 띠(시작~끝). 단일 CalendarIcon(점 격자)과 한눈에 구분되게
// 격자 대신 '구간 막대'를 넣었다 — 대시보드에서 '기간 종속' 구역 표식으로 쓴다.
export function CalendarRangeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5.9" y="2.2" width="1.8" height="3.4" rx="0.9" />
      <rect x="12.3" y="2.2" width="1.8" height="3.4" rx="0.9" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 4.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm.7 5.5v1.9h8.6V10zm0 3.3v1.7h1.9v-1.7zm3.4 0v1.7h1.9v-1.7z"
      />
    </Svg>
  );
}

// 고정(압정) = 기간 필터와 무관하게 항상 같은 기준을 보는 구역 표식.
export function PinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5.8" y="2" width="8.4" height="3.1" rx="1.2" />
      <path d="M7.4 5.1h5.2l.85 5a1 1 0 0 0 .6.77l1.35.6a1 1 0 0 1 .6.92v.51H4v-.51a1 1 0 0 1 .6-.92l1.35-.6a1 1 0 0 0 .6-.77z" />
      <path d="M9.35 14.3h1.3v3.2a.65.65 0 0 1-1.3 0z" />
    </Svg>
  );
}

// ── 기타 ─────────────────────────────

export function PhoneIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 스마트폰 = 둥근 몸체(속 비움) + 하단 홈 바 */}
      <path
        fillRule="evenodd"
        d="M6.5 1.5h7a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM6.3 3.3v13.4h7.4V3.3z"
      />
      <rect x="8.4" y="14.6" width="3.2" height="1.3" rx="0.65" />
    </Svg>
  );
}

export function WonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 원화 ₩ = 더블 V + 가로 두 줄 */}
      <path d="M2.5 4.5h2.2l2.4 7 2.1-7h1.6l2.1 7 2.4-7h2.2l-3.4 11h-2l-2.1-6.6L7.9 15.5h-2z" />
      <rect x="3.4" y="8.2" width="13.2" height="1.5" rx="0.75" />
      <rect x="3.4" y="10.7" width="13.2" height="1.5" rx="0.75" />
    </Svg>
  );
}

export function LogoutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 왼쪽 문(패널) — 오른쪽 개방 */}
      <path d="M9.6 2H5.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4.1a1 1 0 0 0 0-2H5.5V4h4.1a1 1 0 0 0 0-2Z" />
      {/* 나가는 화살표 */}
      <path d="M11.5 6.3a1 1 0 0 1 1.7-.7l3.9 3.7a1 1 0 0 1 0 1.4l-3.9 3.7a1 1 0 0 1-1.7-.7V11H8.6a1 1 0 0 1 0-2h2.9z" />
    </Svg>
  );
}

export function SortUpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 5.2 15.4 14H4.6z" />
    </Svg>
  );
}

/** 정렬 가능하다는 표시(▲▼) — 아직 이 열로 정렬하고 있지 않을 때. 켜지면 SortUp/SortDown 하나로 바뀐다. */
export function SortNeutralIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 2.8 14.4 8.2H5.6z" />
      <path d="M5.6 11.8h8.8L10 17.2z" />
    </Svg>
  );
}

export function SortDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.6 6h10.8L10 14.8z" />
    </Svg>
  );
}

export function ColumnsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 3h12a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 16 17H4a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 4 3Zm4.7 1.8v10.4h2.6V4.8zm-4.4 0v10.4h2.6V4.8zm8.8 0v10.4h2.6V4.8z"
      />
    </Svg>
  );
}

// 소재비교 — 높이가 다른 두 막대 + 가운데 대비 마름모(비교 지점).
export function CompareIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="9" width="5.2" height="8.5" rx="1.2" />
      <rect x="12.3" y="4.5" width="5.2" height="13" rx="1.2" />
      <path d="M10 7.6 11.8 10 10 12.4 8.2 10Z" />
    </Svg>
  );
}

export function DownloadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 2.8a1 1 0 0 1 2 0v6.6l1.9-1.9a1 1 0 1 1 1.4 1.42l-3.6 3.6a1 1 0 0 1-1.42 0l-3.6-3.6A1 1 0 0 1 7.1 7.5L9 9.4z" />
      <path d="M3.5 13a1 1 0 0 1 1 1v1.2h11V14a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 16 17H4a1.5 1.5 0 0 1-1.5-1.5V14a1 1 0 0 1 1-1Z" />
    </Svg>
  );
}

// 표·화면을 그림(PNG)으로 내보내는 동작 — 같은 자리의 CSV(DownloadIcon)와 형식이 다름을 형태로 말한다.
// 액자(테두리 링) + 해 + 산 셋으로 그린다. 링은 `evenodd`로 안쪽을 파낸다(stroke 금지 규칙).
export function ImageIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        d="M4.8 3h10.4A1.8 1.8 0 0 1 17 4.8v10.4A1.8 1.8 0 0 1 15.2 17H4.8A1.8 1.8 0 0 1 3 15.2V4.8A1.8 1.8 0 0 1 4.8 3Zm-.2 1.8h10.8v10.4H4.6V4.8Z"
      />
      <circle cx="7.5" cy="7.6" r="1.3" />
      <path d="M5.4 14.2l2.9-3.2a.6.6 0 0 1 .9 0l1.5 1.6 1.6-1.9a.6.6 0 0 1 .92.02l2.28 3.48z" />
    </Svg>
  );
}

// 화면 이동 링크 꼬리표(NavLink) — "여기서 나간다"를 형태로 말한다. 20x20 그리드, 100% fill.
// 몸통(수평 막대) + 머리(삼각) 두 조각. 13px에서도 방향이 읽히도록 머리를 살짝 크게 잡았다.
export function ArrowRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.4 9.1h8.3a1 1 0 0 1 0 1.8H3.4a1 1 0 0 1 0-1.8Z" />
      <path d="M10.9 5.3a.9.9 0 0 1 1.3-.06l4.2 4a.9.9 0 0 1 0 1.3l-4.2 4a.9.9 0 1 1-1.24-1.3L14.3 10l-3.34-3.24a.9.9 0 0 1-.06-1.26Z" />
    </Svg>
  );
}

export function RefreshIcon(p: IconProps) {
  return (
    <Svg {...p} box="0 0 24 24">
      <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" />
    </Svg>
  );
}

// 지표 설명 툴팁 트리거. 링(테두리)만 뚫린 원 + 점·막대 — 라벨 옆 13~14px에서도 'i'가 읽힌다.
export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 1.7a6.3 6.3 0 1 1 0 12.6 6.3 6.3 0 0 1 0-12.6Z"
      />
      <circle cx="10" cy="6.5" r="1.05" />
      <rect x="9.1" y="8.7" width="1.8" height="5.4" rx="0.9" />
    </Svg>
  );
}

export function ExternalLinkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 오른쪽 위로 나가는 대각선 화살표 */}
      <path d="M11.5 3a1 1 0 0 0 0 2h1.09l-4.3 4.29a1 1 0 1 0 1.42 1.42L14 6.41V7.5a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1z" />
      {/* 왼쪽 아래 열린 상자(프레임) */}
      <path d="M5.5 5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5v-3a1 1 0 1 0-2 0V14H6V7h3.5a1 1 0 0 0 0-2z" />
    </Svg>
  );
}

// 비교표 열 그룹 표식(2026-07-31) — '전기간'과 '전년동기'가 배경 띠만으로는 눈에 덜 띈다는
// 지적으로 각 그룹 머리에 붙인다. 두 아이콘은 "한 걸음 전"과 "한 바퀴 전"으로 짝을 이룬다:
// 전기간 = 짧은 되감기 화살(더블 쉐브런) / 전년동기 = 한 바퀴 도는 원형 화살(연간 순환).
export function PrevPeriodIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.3 4.6a1 1 0 0 1 1.4 1.42L7.62 9.1H16a1 1 0 1 1 0 2H7.62l3.08 3.08a1 1 0 1 1-1.4 1.42l-4.8-4.8a1 1 0 0 1 0-1.42z" />
      <rect x="3" y="4.5" width="1.9" height="11" rx="0.95" />
    </Svg>
  );
}

export function YoyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* 원형 순환 화살(연간 반복) — 열린 링 + 화살촉. RefreshIcon과 남는 짝이 되지 않게
          20x20 격자에 맞춰 새로 그렸다(RefreshIcon은 새로고침 전용 24x24 어휘). */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 3.3a6.7 6.7 0 1 0 6.7 6.7 1 1 0 1 1 2 0 8.7 8.7 0 1 1-2.55-6.15V2.8a1 1 0 1 1 2 0v3.9a1 1 0 0 1-1 1h-3.9a1 1 0 1 1 0-2h1.5A6.66 6.66 0 0 0 10 3.3Z"
      />
    </Svg>
  );
}

// ── 월간 흐름 차트 6종 머리 아이콘(2026-08-03) ────────────────
// 규칙(이 파일 정본 + /icon-design): viewBox 0 0 20 20 · **fill 전용(stroke 금지)** ·
// currentColor 단색 상속 · 디테일 3단계 이하(Major 본체 → Sub 악센트 → Micro 점).
// ⚠️ 다색 팔레트는 쓰지 않는다 — 이 세트는 어드민 UI 아이콘이라 부모의 text-* 토큰이 색을 정한다
//    (차트 구분색은 아이콘이 아니라 계열 색이 맡는다). 새 아이콘도 이 계약을 따를 것.

/** 활성 사용자 — 사람 둘(모수 = 사람 수). 앞 사람이 크고 뒤 사람은 잘려 겹친다. */
export function UsersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="7.6" cy="6.2" r="3.1" />
      <path d="M2.2 15.6c0-2.6 2.4-4.3 5.4-4.3s5.4 1.7 5.4 4.3a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1Z" />
      <circle cx="14.3" cy="7" r="2.3" />
      <path d="M14.3 11.1c2.2 0 3.9 1.3 3.9 3.2a1 1 0 0 1-1 1h-2.6c.1-1.6-.5-3-1.6-4 .4-.1.8-.2 1.3-.2Z" />
    </Svg>
  );
}

/** 파트너 — 맞잡은 두 블록(제휴). 가운데 흰 틈이 두 주체를 가른다(fill 도형으로만 분리). */
export function PartnerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 6.4a1 1 0 0 1 1-1h4.1a1 1 0 0 1 1 1v2.1H7.3a1.6 1.6 0 0 0 0 3.2h1.8v2.1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M10.9 5.4H16a1 1 0 0 1 1 1v7.2a1 1 0 0 1-1 1h-5.1v-2.1h1.8a1.6 1.6 0 0 0 0-3.2h-1.8Z" />
      <rect x="9.1" y="9.2" width="1.8" height="1.6" />
    </Svg>
  );
}

// ── 찐정책 응답 항목 구분(2026-10-17) ─────────────
// 맞춤찾기 응답 13항목을 도넛·표 머리·필터에서 한눈에 가르는 용도. 색이 아니라 모양으로 가른다.

/** 필터(깔때기) — 표를 거르는 팝업을 여는 아이콘 버튼 */
export function FilterIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.4 4.2a1 1 0 0 1 .9-.7h11.4a1 1 0 0 1 .78 1.63L12 10.7v4.9a1 1 0 0 1-.55.9l-2.4 1.2A1 1 0 0 1 7.6 16.8v-6.1L3.52 5.13a1 1 0 0 1-.12-.93Z" />
    </Svg>
  );
}

/** 지역 — 접은 지도 */
export function MapIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m2.3 5.4 4.4-1.8v11.3l-3.8 1.6a.8.8 0 0 1-1.1-.74V6.1a.8.8 0 0 1 .5-.7Zm5.9-1.8 3.6 1.4v11.3l-3.6-1.4Zm5.1 1.4 3.8-1.6a.8.8 0 0 1 1.1.74v9.3a.8.8 0 0 1-.5.74l-4.4 1.8Z" />
    </Svg>
  );
}

/** 혼인 — 맞물린 반지 둘 */
export function RingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 6.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 1.8a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2ZM13 6.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 1.8a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z"
      />
      <path d="M10 2.4 11.5 4 10 5.6 8.5 4Z" />
    </Svg>
  );
}

/** 취업상태 — 서류가방 */
export function BriefcaseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.6 3.3h4.8a1 1 0 0 1 1 1V6h2.9A1.3 1.3 0 0 1 17.6 7.3v2.4H2.4V7.3A1.3 1.3 0 0 1 3.7 6h2.9V4.3a1 1 0 0 1 1-1Zm.8 1.7v1h3.2V5ZM2.4 11h5.9v1.1h3.4V11h5.9v4.2a1.3 1.3 0 0 1-1.3 1.3H3.7a1.3 1.3 0 0 1-1.3-1.3Z"
      />
    </Svg>
  );
}

/** 학력 — 학사모 */
export function CapIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 3.2 18.6 7.6 10 12 1.4 7.6Z" />
      <path d="M4.7 10.5v3.2c0 1.1 2.4 2.7 5.3 2.7s5.3-1.6 5.3-2.7v-3.2L10 13.2Z" />
      <path d="M17.2 8.6h1.4v4.6h-1.4Z" />
    </Svg>
  );
}

/** 성별 — 고리 + 대각선 화살표 */
export function GenderIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 7.6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Z"
      />
      <path d="M12.6 2.4h5v5h-1.8V5.5l-3.3 3.3-1.3-1.3 3.3-3.3h-1.9Z" />
    </Svg>
  );
}

/** 주거 — 집 */
export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 2.7 2.3 9.5a.8.8 0 0 0 .5 1.4h1.6v5.3a1 1 0 0 0 1 1h2.8v-4.1h3.6v4.1h2.8a1 1 0 0 0 1-1v-5.3h1.6a.8.8 0 0 0 .5-1.4Z" />
    </Svg>
  );
}

/** 거주기간 — 시계 */
export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm-.9 3.4h1.8v3.8l2.7 1.6-.9 1.5-3.6-2.1Z"
      />
    </Svg>
  );
}

/** 사업자 — 차양 달린 가게 */
export function StoreIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.3 3.4h13.4l1.3 4.3a2.4 2.4 0 0 1-4.2 1.5 2.6 2.6 0 0 1-3.8 0 2.6 2.6 0 0 1-3.8 0A2.4 2.4 0 0 1 2 7.7Z" />
      <path d="M4 11a4 4 0 0 0 .6.1v5.4h3.9v-3.2h3v3.2h3.9v-5.4a4 4 0 0 0 .6-.1v6a.6.6 0 0 1-.6.6H4.6A.6.6 0 0 1 4 17Z" />
    </Svg>
  );
}

/** 병역 — 방패 */
export function ShieldIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 2.2 16.6 4.6v5c0 3.9-2.7 6.6-6.6 8.2-3.9-1.6-6.6-4.3-6.6-8.2v-5Z" />
    </Svg>
  );
}

/** 본인 연소득 — 지갑 */
export function WalletIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4.4h10.4a1 1 0 0 1 0 2H4.7c-.4 0-.7.2-.7.5s.3.5.7.5H16A1.5 1.5 0 0 1 17.5 8.9v6.1A1.5 1.5 0 0 1 16 16.5H4A1.5 1.5 0 0 1 2.5 15V5.9A1.5 1.5 0 0 1 4 4.4Zm9.6 6.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
      />
    </Svg>
  );
}
