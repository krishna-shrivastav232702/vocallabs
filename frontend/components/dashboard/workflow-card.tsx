'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRelativeTime, STEP_TYPE_CONFIG } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Workflow, TriggerType, Step, StepType } from '@/lib/types';
import { ArrowRight, Layers, Zap, GitMerge } from 'lucide-react';

interface WorkflowCardProps {
  workflow: Workflow;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  manual: 'Manual',
  scheduled: 'Scheduled',
  database_event: 'DB Event',
  webhook: 'Webhook',
};

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const router = useRouter();
  const stepCount = workflow.steps?.length ?? 0;
  const triggerTypes = [...new Set(workflow.workflow_triggers.map((t) => t.trigger_type))];
  const latestStatus = workflow.runs?.[0]?.status;
  const activeStepRun = workflow.runs?.[0]?.step_runs?.[0];

  return (
    <Link
      href={`/workflows/${workflow.id}`}
      className="surface p-4 flex items-center gap-4 hover:border-[var(--color-accent-border)] transition-all group cursor-pointer fade-in"
      aria-label={`Open workflow: ${workflow.name}`}
    >
      {/* Step type icons strip */}
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: 'var(--color-accent-subtle)',
          border: '1px solid var(--color-accent-border)',
        }}
      >
        <Layers className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2
            className="font-semibold text-sm truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {workflow.name}
          </h2>
          {latestStatus && (
            <div className="flex items-center gap-2">
              <StatusBadge status={latestStatus} size="sm" />
              {activeStepRun && latestStatus === 'in_progress' && (
                <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                  (Step {activeStepRun.step.position + 1}: {STEP_TYPE_CONFIG[activeStepRun.step.step_type].label})
                </span>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/workflows/${workflow.id}/runs/${workflow.runs?.[0]?.id}`);
                }}
                className="ml-2 text-xs font-medium hover:underline flex items-center gap-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                View details
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--color-text-tertiary)' }}>
            <GitMerge className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium truncate">{workflow.steps?.length ?? 0} steps</span>
          </div>
          {triggerTypes.length > 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              <Zap className="w-3 h-3" />
              {triggerTypes.map((t) => TRIGGER_LABELS[t]).join(', ')}
            </span>
          )}

          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Updated {formatRelativeTime(workflow.updated_at)}
          </span>
        </div>

        {/* Step type chips */}
        {workflow.steps && workflow.steps.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {[...new Set(
              workflow.steps
                .filter((s) => 'step_type' in s)
                .map((s) => (s as Step).step_type)
            )].slice(0, 5).map((type) => {
              const cfg = STEP_TYPE_CONFIG[type as StepType];
              return (
                <span
                  key={type}
                  className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${cfg.accentClass}`}
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Arrow icon */}
      <ArrowRight
        className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--color-accent)' }}
      />
    </Link>
  );
}
