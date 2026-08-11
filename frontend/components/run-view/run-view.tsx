'use client';

import { useSubscription } from 'urql';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { STEP_RUNS_SUBSCRIPTION } from '@/lib/graphql/subscriptions';
import { StepRunNode } from './step-run-node';
import { ConnectionIndicator } from './connection-indicator';
import { RunViewSkeleton } from '@/components/skeletons/run-view-skeleton';
import type { StepRun } from '@/lib/types';
import { useOrgContext } from '@/components/providers/org-context';

interface RunViewProps {
  workflowRunId: string;
  workflowName: string;
}

export function RunView({ workflowRunId, workflowName }: RunViewProps) {
  const { role } = useOrgContext();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const prevStepStatusRef = useRef<Record<string, string>>({});
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [{ data, fetching, error, stale }] = useSubscription({
    query: STEP_RUNS_SUBSCRIPTION,
    variables: { workflow_run_id: workflowRunId },
  });

  // Detect WebSocket reconnect: stale or error → show reconnecting indicator
  useEffect(() => {
    if (stale || error) {
      setIsReconnecting(true);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    } else {
      // Brief delay before hiding to avoid flicker on fast reconnects
      reconnectTimeoutRef.current = setTimeout(() => setIsReconnecting(false), 800);
    }
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [stale, error]);

  const stepRuns: StepRun[] = data?.step_runs ?? [];

  if (fetching && stepRuns.length === 0) return <RunViewSkeleton />;

  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {workflowName}
          </h1>
          <p
            className="text-xs mt-0.5 font-mono"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Run {workflowRunId.slice(0, 8)}…
          </p>
        </div>
        <ConnectionIndicator isReconnecting={isReconnecting} />
      </div>

      {/* Timeline */}
      {stepRuns.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
        >
          <p className="text-sm">Waiting for first step…</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-5 top-5 bottom-5 w-px"
            style={{ background: 'var(--color-border)' }}
            aria-hidden="true"
          />

          <AnimatePresence mode="sync">
            <div className="flex flex-col gap-3">
              {stepRuns.map((stepRun) => {
                const prevStatus = prevStepStatusRef.current[stepRun.id];
                const statusChanged = prevStatus !== undefined && prevStatus !== stepRun.status;
                prevStepStatusRef.current[stepRun.id] = stepRun.status;

                return (
                  <motion.div
                    key={stepRun.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    layout
                  >
                    <StepRunNode
                      stepRun={stepRun}
                      role={role}
                      statusChanged={statusChanged}
                    />
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
