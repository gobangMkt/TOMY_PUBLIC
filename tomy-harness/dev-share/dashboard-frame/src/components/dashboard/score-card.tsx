'use client';

// 대시보드 공용 스코어 카드 + 전기간 대비 증감 한 줄.
// 이 파일이 생긴 이유: 고방·U사장님 대시보드가 같은 카드를 각자 복붙해 갖고 있었다(2026-07-28에 합침).
// 차트를 trend-charts.tsx 한 벌로 모은 것과 같은 이유 — 카드 여백·색조가 화면마다 갈리는 걸 막는다.

import type { EyeIcon } from '@/components/icons';
import InfoTip from '@/components/ui/info-tip';

// 목표 대비 채움 비율(%) — 100% 초과도 바는 100%에서 멈춘다(길이로 초과를 표현하면 트랙을 넘친다).
// GroupBar와 같은 규칙을 쓴다. 목표 0/음수면 0(달성률 자체는 상위에서 '—'로 표시).
export const barPct = (actual: number, target: number) =>
  target > 0 ? Math.max(0, Math.min(100, (actual / target) * 100)) : 0;

export const changePct = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : cur > 0 ? 1 : 0);
// 면(surface)에 따라 색이 갈린다 — 딥 밴드(board) 위에서는 success/alert가 대비 미달이라 밝은 변주를 쓴다.
const toneOf = (d: number, board = false) =>
  Math.abs(d) < 1e-9
    ? board
      ? 'text-board-mute'
      : 'text-ink-mute'
    : d > 0
      ? board
        ? 'text-board-up'
        : 'text-success'
      : board
        ? 'text-board-down'
        : 'text-rose-600';
const arrowOf = (d: number) => (Math.abs(d) < 1e-9 ? '—' : d > 0 ? '▲' : '▼');

type ScoreProps = {
  icon: typeof EyeIcon;
  label: string;
  badge?: string;
  // ReactNode 허용 — 큰 수치 뒤에 '(주평균 0.4건)' 같은 작은 보조를 같은 줄에 붙이기 위함.
  value: React.ReactNode;
  valueTone?: string;
  sub?: React.ReactNode;
  highlight?: boolean;
  // 이 숫자가 무엇을 센 것인지(소스·기간·단위). 라벨 옆 ⓘ에 붙는다 — BoardStat과 같은 규칙.
  hint?: string;
  // 단위는 값에서 떼어 한 단계 작게 붙인다 — '3,029만원'처럼 붙여 쓰면 숫자와 단위가 같은 무게로
  // 읽혀 스캔이 느려진다. 값에는 수만 남기고 단위는 여기로(원·회·건·%·명).
  unit?: string;
  // 'lg' = 그 블록의 결론 카드(매출·달성률). 값을 키워 보조 카드와 층을 만든다.
  size?: 'md' | 'lg';
  // 목표 대비 진행 바. 달성률 카드에서 "얼마 남았나"를 숫자 없이 한눈에 보여주는 유일한 그래픽.
  progress?: { actual: number; target: number };
  /**
   * 신호등 — "이 값이 좋은 건지 나쁜 건지"를 카드가 스스로 말한다(2026-08-14 요청).
   * 🚨 **색만으로 말하지 않는다**(전역 접근성 규칙) — 색점 + `좋음/보통/주의` 텍스트를 함께 낸다.
   * 판정은 화면에서 짜지 말고 lib에서 받아 넘길 것(같은 지표가 화면마다 다른 색이 되는 걸 막는다).
   * ⚠️ pill 배지가 아니라 **점 + 글자**다 — 안티클리셰(배지 남발) 규칙.
   */
  status?: { level: 'good' | 'ok' | 'watch'; label: string; hint?: string };
  /**
   * 카드를 누르면 일어나는 일(2026-09-04 신설) — 넘기면 카드 전체가 버튼이 된다.
   * 어포던스는 표의 값 칸과 같은 어휘: **hover 시 테두리가 진해지고 배경이 옅게 깔린다**(§컨트롤 어휘
   * ② — 같은 화면에서 여는 동작). 카드 안의 ⓘ 툴팁은 버튼 안에 있어도 그대로 눌린다.
   * ⚠️ 넘기지 않으면 지금까지처럼 그냥 `div`다 — 모든 카드를 클릭 가능하게 만들지 말 것(누를 데가
   * 늘어나면 어디가 정말 동작하는 자리인지 흐려진다).
   */
  onClick?: () => void;
  /** 눌렀을 때 무엇이 열리는지 — `title`(툴팁)과 `aria-label` 보조에 쓴다. `onClick`과 함께 넘긴다. */
  clickTitle?: string;
};

const STATUS_TONE: Record<'good' | 'ok' | 'watch', { dot: string; text: string }> = {
  good: { dot: 'bg-success', text: 'text-success' },
  ok: { dot: 'bg-accent2', text: 'text-accent2' },
  watch: { dot: 'bg-alert', text: 'text-alert' },
};

/** 신호 한 조각(색점 + 라벨). 카드·구역 결론 줄이 같은 형태를 쓴다. */
export function HealthDot({ level, label, className = '' }: { level: 'good' | 'ok' | 'watch'; label: string; className?: string }) {
  const tone = STATUS_TONE[level];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium ${tone.text} ${className}`}>
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
      {label}
    </span>
  );
}

export function ScoreCard({
  icon: Icon,
  label,
  badge,
  value,
  valueTone = 'text-ink',
  sub,
  highlight,
  hint,
  unit,
  size = 'md',
  progress,
  status,
  onClick,
  clickTitle,
}: ScoreProps) {
  const lg = size === 'lg';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, title: clickTitle } : {})}
      className={`rounded-[10px] border text-left shadow-sm ${lg ? 'p-5' : 'p-4'} ${
        highlight ? 'border-primary/25 bg-primary/5' : 'border-border bg-surface'
      } ${onClick ? 'w-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/[0.04]' : ''}`}
    >
      {/* 라벨 높이 2줄분 예약 — BoardStat과 같은 이유(한 칸만 라벨이 길어도 값 정렬이 안 깨지게) */}
      <div className="flex min-h-[34px] items-start gap-1.5 text-ink-mute">
        <Icon size={15} className={`mt-px mr-0.5 shrink-0 ${highlight ? 'text-primary' : ''}`} />
        <span className="text-[13px] leading-snug">{label}</span>
        {hint && <InfoTip text={hint} />}
        {badge && <span className="text-xs font-medium text-primary">{badge}</span>}
        {status && (
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <HealthDot level={status.level} label={status.label} />
            {status.hint && <InfoTip text={status.hint} />}
          </span>
        )}
      </div>
      <div className={`tabular flex items-baseline gap-1 font-semibold ${valueTone} ${lg ? 'mt-1.5 text-[32px] leading-none' : 'mt-1 text-[22px] leading-none'}`}>
        {value}
        {unit && <span className="text-[0.5em] font-medium text-ink-mute">{unit}</span>}
      </div>
      {progress && (
        // ⚠️ 트랙은 `bg-hairline`이 아니라 `bg-ink/10`이다(2026-08-06 지적 "게이지바가 잘 안보여 —
        // 어디가 달성부분인지"). `highlight` 카드는 배경 자체가 옅은 민트 틴트(`bg-primary/5`)라
        // `bg-hairline`(#eceff2, 거의 흰색)과 거의 구분이 안 돼 트랙의 전체 길이가 안 보이고
        // 채움만 뚝 끊긴 것처럼 보였다. lg 카드는 채움 막대도 더 두껍게(h-2.5) — 32px 값 글자 옆에
        // 6px 얇은 막대는 결론 카드의 무게에 안 맞는다.
        <div className={lg ? 'mt-3' : 'mt-2.5'} aria-hidden>
          <div className={`w-full overflow-hidden rounded-full bg-ink/10 ${lg ? 'h-2.5' : 'h-1.5'}`}>
            <div
              className="h-full rounded-full bg-primary-fill transition-[width] duration-300"
              style={{ width: `${barPct(progress.actual, progress.target)}%` }}
            />
          </div>
        </div>
      )}
      {/* 보조줄은 **비교 전용**(전주·전월 대비 / 실적÷목표). 산식은 라벨과 ⓘ가 이미 말하므로 쓰지 않는다 */}
      <div className={`min-h-[16px] text-xs text-ink-mute ${progress ? 'mt-1.5' : 'mt-2'}`}>{sub}</div>
    </Tag>
  );
}

// 전 기간 대비 증감 한 줄. fmt로 만원/정수 표기를 갈아끼운다.
export function DeltaChange({
  cur,
  prev,
  prevLabel,
  fmt,
  board = false,
}: {
  cur: number;
  prev: number;
  prevLabel: string;
  fmt: (n: number) => string;
  board?: boolean; // 딥 스코어보드 밴드 위에 놓일 때
}) {
  const muted = board ? 'text-board-mute' : 'text-ink-mute';
  if (prev <= 0 && cur <= 0) return <span className={muted}>{prevLabel} 데이터 없음</span>;
  const d = changePct(cur, prev);
  return (
    <span className="tabular inline-flex items-baseline gap-1.5">
      <span className={`font-medium ${toneOf(d, board)}`}>
        {arrowOf(d)} {(Math.abs(d) * 100).toFixed(1)}%
      </span>
      <span className={muted}>
        {prevLabel} {prev > 0 ? fmt(prev) : '—'}
      </span>
    </span>
  );
}

// ── 스코어보드 밴드용 스탯 ─────────────────────────────
// 카드가 아니라 '한 판 위의 칸'이다 — 테두리·그림자 없이 gap-px 라인으로만 갈린다.
// 밝은 카드와 형태부터 달라야 "기간 필터와 무관한 고정 구역"이 스크롤 없이 읽힌다.
export function BoardStat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  hint,
}: {
  icon: typeof EyeIcon;
  label: string;
  value: string;
  sub?: React.ReactNode;
  accent?: boolean; // 달성률처럼 이 판의 결론이 되는 칸 — 민트로 뽑는다
  // 이 숫자가 무엇을 센 것인지(소스·기간·단위). 카드 본문에 적지 말고 여기로 — 칸마다 설명을 깔면
  // 밴드가 글 덩어리가 된다(2026-07-28). 라벨 옆 ⓘ에 붙는다(InfoTip, native title 아님).
  hint?: string;
}) {
  return (
    <div className="bg-board px-5 py-4">
      {/* 라벨 높이를 2줄분 예약한다 — 한 칸의 라벨만 길어 줄바꿈되면 그 칸 값이 아래로 밀려
          4칸 숫자 정렬이 깨진다('U사장님 애드 매출목표 달성률'처럼 기준을 라벨에 박아야 할 때 생김). */}
      <div className="flex min-h-[34px] items-center gap-1.5 text-board-mute">
        <Icon size={15} className={`mr-0.5 shrink-0 ${accent ? 'text-primary-fill' : ''}`} />
        <span className="text-sm leading-snug">{label}</span>
        {hint && <InfoTip text={hint} tone="board" />}
      </div>
      <div
        className={`tabular mt-2 text-[28px] leading-tight font-semibold ${
          accent ? 'text-primary-fill' : 'text-white'
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 min-h-[16px] text-xs text-board-mute">{sub}</div>
    </div>
  );
}
