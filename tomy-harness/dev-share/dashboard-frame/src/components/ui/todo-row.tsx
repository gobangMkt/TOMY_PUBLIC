import { CheckIcon } from '@/components/icons';
import InfoTip from '@/components/ui/info-tip';
import { NavLink } from '@/components/ui/controls';

/**
 * 마감 체크리스트 한 줄 — 체크는 사람이 누르는 게 아니라 **원장에 값이 들어오면 켜진다**.
 * 주간 흐름(`weekly-view.tsx`)·월간 흐름(`monthly-close-checklist.tsx`)이 함께 쓰는 한 벌이다.
 *
 * `how` = **다음 동작 한 조각**("어디를 누른다/어디에 넣는다")만. 왜 그런지·예외는 `hint`(ⓘ)로 뺀다
 * — 할 일 목록은 훑는 것이지 읽는 게 아니다(docs/design-system.md: 설명은 툴팁, 화면엔 값·동작만.
 * 2026-08-03 교정). 다만 `how` 자체를 없애면 "어쩌란거야"로 돌아가므로 한 조각은 남긴다.
 * `go` = 다른 화면에서 해야 하는 항목의 이동 링크(NavLink 어휘: 텍스트 + →, 테두리 없음).
 */
export default function TodoRow({
  done,
  title,
  how,
  hint,
  go,
}: {
  done: boolean;
  title: string;
  how: string;
  hint?: string;
  go?: { href: string; label: string };
}) {
  return (
    <li className="flex items-center gap-2.5 px-4 py-2.5">
      <span
        aria-hidden
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${
          done ? 'border-mint bg-mint text-white' : 'border-accent2/60 bg-white'
        }`}
      >
        {done && <CheckIcon size={11} />}
      </span>
      <p className={`min-w-0 text-[13px] ${done ? 'text-muted line-through decoration-muted/40' : 'text-ink'}`}>
        <span className="font-medium">{title}</span>
        <span className="ml-1.5 text-[12px] text-muted">{how}</span>
        {hint && <InfoTip text={hint} />}
      </p>
      {!done && go && (
        <NavLink href={go.href} className="ml-2 shrink-0 text-[12px]">
          {go.label}
        </NavLink>
      )}
      <span className={`ml-auto shrink-0 text-[11px] font-medium ${done ? 'text-primary' : 'text-alert'}`}>
        {done ? '완료' : '해야 함'}
      </span>
    </li>
  );
}
