'use client';

import { Zap, Clock, BarChart2, AlertTriangle, CheckCircle2, Loader2, PauseCircle } from 'lucide-react';
import type { WorkflowRunStatus, StepRunStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

// Multi-modal status badge — color + icon + label, never color alone (colorblind-safe)
// Used across the dashboard cards and the run view timeline.

interface StatusBadgeProps {
  status: WorkflowRunStatus | StepRunStatus | string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const STATUS_MAP: Record<
  string,
  {
    label: string;
    Icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    spin?: boolean;
  }
> = {
  pending: {
    label: 'Pending',
    Icon: Clock,
    color: 'var(--color-pending)',
    bg: 'var(--color-pending-bg)',
    border: 'var(--color-pending-border)',
  },
  in_progress: {
    label: 'Running',
    Icon: Loader2,
    color: 'var(--color-running)',
    bg: 'var(--color-running-bg)',
    border: 'var(--color-running-border)',
    spin: true,
  },
  running: {
    label: 'Running',
    Icon: Loader2,
    color: 'var(--color-running)',
    bg: 'var(--color-running-bg)',
    border: 'var(--color-running-border)',
    spin: true,
  },
  paused_awaiting_approval: {
    label: 'Needs Approval',
    Icon: PauseCircle,
    color: 'var(--color-paused)',
    bg: 'var(--color-paused-bg)',
    border: 'var(--color-paused-border)',
  },
  paused: {
    label: 'Paused',
    Icon: PauseCircle,
    color: 'var(--color-paused)',
    bg: 'var(--color-paused-bg)',
    border: 'var(--color-paused-border)',
  },
  completed: {
    label: 'Completed',
    Icon: CheckCircle2,
    color: 'var(--color-completed)',
    bg: 'var(--color-completed-bg)',
    border: 'var(--color-completed-border)',
  },
  failed: {
    label: 'Failed',
    Icon: AlertTriangle,
    color: 'var(--color-failed)',
    bg: 'var(--color-failed-bg)',
    border: 'var(--color-failed-border)',
  },
};

const FALLBACK = {
  label: 'Unknown',
  Icon: BarChart2,
  color: 'var(--color-text-tertiary)',
  bg: 'var(--color-surface-2)',
  border: 'var(--color-border)',
};

export function StatusBadge({ status, size = 'sm', showLabel = true, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? FALLBACK;
  const { label, Icon, color, bg, border, spin } = config;

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center gap-1.5 rounded-full font-medium', padding, textSize, className)}
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      <Icon
        className={cn(iconSize, spin && 'animate-spin')}
        aria-hidden="true"
      />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
