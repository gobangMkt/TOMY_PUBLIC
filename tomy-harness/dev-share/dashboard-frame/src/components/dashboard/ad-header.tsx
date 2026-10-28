'use client';

import { ExternalLinkIcon } from '@/components/icons';
import { RefreshButton } from '@/components/ui/controls';

type IconComponent = (props: { size?: number; className?: string }) => React.ReactElement;

function fmtUpdated(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 소스 배지 + 업데이트 시각 + 새로고침 + 시트 링크 — AdHeader의 우측 조각만 뗀 것.
// 탭 축(통합비교·소재비교)은 BoardTabs가 붙는 `PageHeader`를 쓰므로 그 `actions` 슬롯에 이걸 꽂는다.
// 탭 없는 대시보드(AdHeader 그대로 사용)와 로직 중복을 피하려고 여기서만 정의한다.
export function AdHeaderActions({
  source,
  updatedAt,
  loading,
  onRefresh,
  sheetUrl,
}: {
  source?: 'sheet' | 'fixture';
  updatedAt: Date | null;
  loading: boolean;
  onRefresh: () => void;
  sheetUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-mute">
      {source && (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${source === 'sheet' ? 'bg-success' : 'bg-accent2'}`}
            aria-hidden
          />
          {source === 'sheet' ? '실시트' : '샘플 데이터'}
        </span>
      )}
      {updatedAt && <span className="tabular">업데이트 {fmtUpdated(updatedAt)}</span>}
      <RefreshButton onClick={onRefresh} loading={loading} />
      {sheetUrl && (
        <a
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-ink-soft hover:bg-hairline"
        >
          <ExternalLinkIcon size={13} />
          시트 열기
        </a>
      )}
    </div>
  );
}

// 고방 광고 페이지 공통 헤더(제목 + 소스 배지 + 새로고침).
export default function AdHeader({
  title,
  subtitle,
  icon: Icon,
  source,
  updatedAt,
  loading,
  onRefresh,
  sheetUrl,
}: {
  title: string;
  subtitle: string;
  icon?: IconComponent;
  source?: 'sheet' | 'fixture';
  updatedAt: Date | null;
  loading: boolean;
  onRefresh: () => void;
  sheetUrl?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden>
            <Icon size={22} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>
        </div>
      </div>
      <AdHeaderActions
        source={source}
        updatedAt={updatedAt}
        loading={loading}
        onRefresh={onRefresh}
        sheetUrl={sheetUrl}
      />
    </div>
  );
}
