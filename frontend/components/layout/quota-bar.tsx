'use client';


import { useOrgContext } from '@/components/providers/org-context';
import type { Org } from '@/lib/types';

export function QuotaBar() {
  const { orgId, orgs } = useOrgContext();

  const currentOrg = orgs.find((m) => m.org.id === orgId)?.org ?? orgs[0]?.org;

  const used = currentOrg?.quota_usage ?? 0;
  const limit = currentOrg?.quota_limit ?? 100;
  const pct = Math.min((used / limit) * 100, 100);

  // Color signal as quota fills up
  const barColor =
    pct >= 90
      ? 'var(--color-failed)'
      : pct >= 70
      ? 'var(--color-quota-warn)'
      : 'var(--color-quota-ok)';

  // Only render if quota data is available
  if (!currentOrg?.quota_limit) return null;

  return (
    <div
      className="px-4 py-2 border-b flex items-center gap-3"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        Monthly runs
      </span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[200px]"
        style={{ background: 'var(--color-surface-3)' }}
        role="progressbar"
        aria-valuenow={used}
        aria-valuemax={limit}
        aria-valuemin={0}
        aria-label={`${used} of ${limit} runs used this month`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <span
        className="text-xs font-medium tabular-nums"
        style={{ color: pct >= 90 ? 'var(--color-failed)' : 'var(--color-text-tertiary)' }}
      >
        {used} / {limit}
      </span>
      {pct >= 90 && (
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--color-failed)',
            background: 'var(--color-failed-bg)',
          }}
        >
          Limit reached
        </span>
      )}
    </div>
  );
}
