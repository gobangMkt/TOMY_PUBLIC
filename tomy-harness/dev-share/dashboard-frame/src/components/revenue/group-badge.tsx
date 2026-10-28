import { TagIcon, SpeechIcon } from '@/components/icons';
import { MINT, GREEN, AMBER } from '@/components/charts/trend-charts';
import { UBOSS_GROUP } from '@/lib/revenue';
import type { IconComponent } from '@/lib/nav';

// 구역(매출 그룹) 메타 — 전용 모노 아이콘 + 은은한 브랜드 틴트(2색으로 미묘하게 구분).
// 색은 브랜드 토큰(민트=primary / 앰버=accent2)만 사용, 틴트는 옅게(색은 보조·형태가 주 구분).
// 새 구역이 생기면 여기 한 줄 추가. 미매핑 구역은 중립 회색 + 아이콘 없이 라벨만.
type GroupMeta = { icon?: IconComponent; chip: string; fg: string };

// BM·SNS는 유사색(청록↔초록) 계열로 미묘하게 구분 — 둘 다 쿨 그린 패밀리.
const GROUP_META: Record<string, GroupMeta> = {
  '고방 BM': { icon: TagIcon, chip: 'bg-primary/10', fg: 'text-primary' },
  '고방 SNS': { icon: SpeechIcon, chip: 'bg-success/12', fg: 'text-success' },
};

const FALLBACK: GroupMeta = { chip: 'bg-ink/5', fg: 'text-ink-soft' };

// 격자표 그룹 소계 행 머리의 색점 — 배지를 쓰면 볼드 소계 줄에서 칩이 더 커 보여 위계가 뒤집힌다.
// 목표 매트릭스(OKR)와 매출 대시보드가 같은 색을 쓰도록 여기 한 곳에서 판정한다.
const GROUP_DOT: Record<string, string> = {
  '고방 BM': 'bg-primary',
  '고방 SNS': 'bg-success',
  // ⚠️ 아래 GROUP_COLOR(차트·바)에는 앰버가 있는데 여기 색점이 빠져 있어 U사장님만 회색으로
  //    폴백됐다(2026-08-04 실측 — 주간 매출 입력에서 고방/U사장님이 색으로 안 갈렸다).
  //    두 맵은 같은 그룹에 같은 색을 줘야 한다(표의 색점 = 바·차트의 채움색).
  [UBOSS_GROUP]: 'bg-accent2',
};

export function groupDotClass(group: string): string {
  return GROUP_DOT[group] ?? 'bg-ink/30';
}

/**
 * 구역(ScopeBlock) 안에서 쓰는 짧은 라벨 — 스코프 접두('고방 ')를 뗀다(구역 머리가 이미 그 사업을
 * 말하므로 라벨에서 또 반복하지 않는다. §달성률 라벨 규칙과 같은 이유). 주간 매출 입력의 고방
 * 구획 안 BM/SNS 소제목이 이 규칙을 쓴다.
 */
export function shortGroupLabel(group: string): string {
  return group.startsWith('고방 ') ? group.slice(3) : group;
}

// 차트·진행바에 넘길 실제 색값(클래스가 아니라 hex) — 같은 그룹이 표에서는 색점, 바에서는 채움색으로
// 나오는데 둘이 어긋나면 같은 그룹으로 안 읽힌다. 색 정본은 trend-charts.tsx 하나.
const GROUP_COLOR: Record<string, string> = {
  '고방 BM': MINT,
  '고방 SNS': GREEN,
  [UBOSS_GROUP]: AMBER,
};

export function groupColor(group: string): string {
  return GROUP_COLOR[group] ?? MINT;
}

export default function GroupBadge({
  group,
  size = 'sm',
  label,
}: {
  group: string;
  size?: 'xs' | 'sm';
  /** 표시 문구를 그룹명과 다르게 낼 때(예: 스코프 접두를 뗀 짧은 라벨). 색·아이콘은 여전히 `group`으로 찾는다. */
  label?: string;
}) {
  const meta = GROUP_META[group] ?? FALLBACK;
  const Icon = meta.icon;
  const icon = size === 'xs' ? 12 : 14;
  const text = size === 'xs' ? 'text-xs' : 'text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${meta.chip} ${meta.fg} ${text}`}
    >
      {Icon && <Icon size={icon} />}
      {label ?? group}
    </span>
  );
}
