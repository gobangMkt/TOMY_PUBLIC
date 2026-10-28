'use client';

// 사업 구역 머리 + 차트 껍데기 — 통합 대시보드와 통합리포트가 같이 쓴다.
// 이 파일이 생긴 이유: 두 화면이 같은 '고방 / U사장님' 2구역 구조를 갖는데, 리포트가 대시보드의
// 로컬 정의를 복붙하면 색점 두께·제목 위계·카드 여백이 화면마다 갈린다(차트·카드를 한 벌로 모은 것과 같은 이유).

import type { EyeIcon } from '@/components/icons';
import InfoTip from '@/components/ui/info-tip';

// 색 틴트 패널로 구역 전체를 감싼다(2026-07-31, 사용자 지적 "고방이랑 U사장님 좀 더 잘 구분되게").
// 옛 방식은 소제목 옆 4px짜리 얇은 점 하나뿐이라 두 구역이 한 판 안에서 이어 붙어 보였다.
// border-left 액센트 도배가 아니라 **구역 전체 배경 틴트**라 안티클리셰 규칙과 배치되지 않는다
// (액센트 바가 아니라 面 자체가 구역이다). color-mix는 monthly-view.tsx에서도 쓰는 기존 패턴.
export function ScopeBlock({
  label,
  color,
  note,
  children,
}: {
  label: string;
  color: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="space-y-4 rounded-[10px] border p-4"
      style={{
        background: `color-mix(in srgb, ${color} 5%, var(--color-surface))`,
        borderColor: `color-mix(in srgb, ${color} 20%, var(--color-border))`,
      }}
    >
      <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
        <span aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        {label}
        {note && <span className="text-xs font-normal text-ink-mute">· {note}</span>}
      </h3>
      {children}
    </div>
  );
}

// ⚠️ 카드 머리는 **제목 + ⓘ + 범위 꼬리표**다 — '합계가 총계와 다르다(유니크)', '조회 막대·문의 선'
// 같은 정의·읽는 법은 `hint`(ⓘ)로 넣는다(monthly-view의 `Panel`과 같은 규칙, 2026-08-04 교정).
// `note`에 설명을 깔면 카드 6~8장을 훑을 때 제목보다 잔글씨가 먼저 눈에 들어온다.
export function ChartCard({
  icon: Icon,
  title,
  note,
  hint,
  hintItems,
  action,
  children,
}: {
  icon: typeof EyeIcon;
  title: string;
  /** 그 차트가 덮는 **범위·단위**만(예: '최근 6개월 · 주별(일~토)'). 정의·읽는 법은 hint로. */
  note?: string;
  /** ⓘ 툴팁 — 정의·산식·출처·주의(유니크 합산 불가 등). */
  hint?: string;
  /** ⓘ 툴팁에 항목이 2개 이상일 때(점 마커 + 굵은 라벨 + 콜론). `hint`와 같이 주면 리스트 위 머리글이 된다. */
  hintItems?: { label: string; text: string }[];
  /** 카드 머리 오른쪽 슬롯(리포트의 [메모] 버튼 등). 없으면 note만 남아 기존 카드와 같다. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-ink-soft">
        <h4 className="inline-flex items-center gap-2 text-[15px] font-semibold">
          <Icon size={17} />
          {title}
          {(hint || hintItems) && <InfoTip text={hint} items={hintItems} />}
        </h4>
        <div className="flex items-center gap-2">
          {note && <span className="text-xs text-ink-mute">{note}</span>}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}
