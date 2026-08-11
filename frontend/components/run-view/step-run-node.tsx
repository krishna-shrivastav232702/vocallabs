'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApprovalAction } from './approval-action';
import { STEP_TYPE_CONFIG, cn } from '@/lib/utils';
import type { StepRun, OrgRole } from '@/lib/types';
import {
  ChevronDown, ChevronUp, Clock, Sparkles, Globe, Database, Bell, GitBranch, ShieldCheck
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, Globe, Database, Bell, GitBranch, ShieldCheck,
};

interface StepRunNodeProps {
  stepRun: StepRun;
  role: OrgRole | undefined;
  statusChanged: boolean;
}

export function StepRunNode({ stepRun, role, statusChanged }: StepRunNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STEP_TYPE_CONFIG[stepRun.step.step_type];
  const Icon = ICON_MAP[cfg.iconName] ?? Sparkles;

  const isApprovalPause = stepRun.status === 'paused_awaiting_approval';

  function formatDuration(): string | null {
    if (!stepRun.created_at || !stepRun.updated_at) return null;
    const ms = new Date(stepRun.updated_at).getTime() - new Date(stepRun.created_at).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  const duration = formatDuration();

  return (
    <div
      className={cn(
        'ml-10 rounded-xl transition-all duration-300',
        isApprovalPause
          ? 'ring-2 ring-offset-1 ring-[var(--color-paused)] ring-offset-[var(--color-bg)]'
          : 'surface',
      )}
      style={
        isApprovalPause
          ? {
              background: 'var(--color-paused-bg)',
              border: '1px solid var(--color-paused-border)',
            }
          : {}
      }
    >
      {/* Node dot on the timeline */}
      <div
        className="absolute left-3.5 mt-4 w-3 h-3 rounded-full border-2 border-[var(--color-bg)] flex items-center justify-center"
        style={{
          background:
            stepRun.status === 'completed'
              ? 'var(--color-completed)'
              : stepRun.status === 'failed'
              ? 'var(--color-failed)'
              : stepRun.status === 'in_progress'
              ? 'var(--color-running)'
              : stepRun.status === 'paused_awaiting_approval'
              ? 'var(--color-paused)'
              : 'var(--color-border)',
        }}
        aria-hidden="true"
      />

      {/* Main row */}
      <div
        className="flex items-center gap-3 px-3 py-3 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
        aria-label={`${cfg.label} — ${stepRun.status}. Click to ${expanded ? 'collapse' : 'expand'} details.`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((x) => !x)}
      >
        {/* Step icon */}
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', cfg.bgClass)}>
          <Icon className={cn('w-4 h-4', cfg.accentClass)} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {cfg.label}
            </span>

            {/* Status badge — animates on transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stepRun.status}
                initial={statusChanged ? { scale: 0.85, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <StatusBadge status={stepRun.status} size="sm" />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Step {stepRun.step.position + 1}
            </span>
            {stepRun.attempt_count > 1 && (
              <span className="text-xs" style={{ color: 'var(--color-pending)' }}>
                Attempt {stepRun.attempt_count}
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                <Clock className="w-3 h-3" />
                {duration}
              </span>
            )}
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
        )}
      </div>

      {/* Approval UI — distinct treatment, not just another badge */}
      {isApprovalPause && (
        <div className="px-3 pb-3">
          <ApprovalAction stepRunId={stepRun.id} role={role} />
        </div>
      )}

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className="px-3 pb-3 pt-1 border-t flex flex-col gap-3"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              {stepRun.error && (
                <DataSection label="Error" data={stepRun.error} isError />
              )}
              {stepRun.input && (
                <DataSection label="Input" data={stepRun.input} />
              )}
              {stepRun.output && (
                <DataSection label="Output" data={stepRun.output} />
              )}
              {!stepRun.error && !stepRun.input && !stepRun.output && (
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  No data available yet
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DataSection({
  label,
  data,
  isError = false,
}: {
  label: string;
  data: unknown;
  isError?: boolean;
}) {
  return (
    <div>
      <p
        className="text-xs font-semibold mb-1"
        style={{ color: isError ? 'var(--color-failed)' : 'var(--color-text-tertiary)' }}
      >
        {label}
      </p>
      <pre
        className="text-xs p-2.5 rounded-lg overflow-auto max-h-40 font-mono"
        style={{
          background: isError ? 'var(--color-failed-bg)' : 'var(--color-surface-2)',
          border: `1px solid ${isError ? 'var(--color-failed-border)' : 'var(--color-border)'}`,
          color: isError ? 'var(--color-failed)' : 'var(--color-text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
