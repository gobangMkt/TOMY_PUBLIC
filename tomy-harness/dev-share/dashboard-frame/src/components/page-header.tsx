import type { IconComponent } from '@/lib/nav';
import BoardTabs from '@/components/board-tabs';

// 보드 헤더 밴드 — [아이콘 칩 + 제목 + 부제] 좌측, 액션 슬롯 우측.
// 모든 보드가 동일 구조를 상속해 "지금 어느 보드인지"를 형태로 즉시 알게 한다(민트 단일 색).
// 헤더 바로 아래 축 탭바(BoardTabs)를 상속 — 현재 축이 tabs를 가지면 자동 렌더, 없으면 null.
export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: IconComponent;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-ink">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <BoardTabs />
    </div>
  );
}
