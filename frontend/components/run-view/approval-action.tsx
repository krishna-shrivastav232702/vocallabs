'use client';

import { useState } from 'react';
import { useMutation } from 'urql';
import { toast } from 'sonner';
import { APPROVE_STEP } from '@/lib/graphql/mutations';
import { canEdit } from '@/lib/utils';
import type { OrgRole } from '@/lib/types';
import { ShieldCheck, Loader2, Clock } from 'lucide-react';

interface ApprovalActionProps {
  stepRunId: string;
  role: OrgRole | undefined;
}

export function ApprovalAction({ stepRunId, role }: ApprovalActionProps) {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [, approveStep] = useMutation(APPROVE_STEP);

  async function handleApprove() {
    setApproving(true);
    const result = await approveStep({ step_run_id: stepRunId });
    setApproving(false);

    if (result.error) {
      // 409 = already approved (atomic compare-and-swap); treat as success for UX
      if (result.error.message?.includes('409')) {
        toast.info('Already approved — workflow is resuming');
        setApproved(true);
      } else {
        toast.error(`Approval failed: ${result.error.message}`);
      }
    } else {
      toast.success('Step approved — workflow resuming');
      setApproved(true);
    }
  }

  if (!canEdit(role)) {
    // Viewers see a waiting message — not an approve button they can't use
    return (
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
        style={{
          background: 'var(--color-paused-bg)',
          border: '1px solid var(--color-paused-border)',
        }}
        role="status"
        aria-label="Waiting for approval"
      >
        <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--color-paused)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-paused)' }}>
            Awaiting approval
          </p>
          <p className="text-xs" style={{ color: 'var(--color-paused)' }}>
            An owner or editor needs to approve this step to continue.
          </p>
        </div>
      </div>
    );
  }

  if (approved) {
    return (
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
        style={{
          background: 'var(--color-completed-bg)',
          border: '1px solid var(--color-completed-border)',
        }}
      >
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--color-completed)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-completed)' }}>
          Approved — workflow resuming
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl"
      style={{
        background: 'var(--color-paused-bg)',
        border: '1px solid var(--color-paused-border)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-paused)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-paused)' }}>
            Approval required
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-paused)' }}>
            Review the step&apos;s input above, then approve to continue the run.
          </p>
        </div>
      </div>

      <button
        id={`approve-step-${stepRunId}`}
        onClick={handleApprove}
        disabled={approving}
        className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
        style={{ background: 'var(--color-paused)' }}
        aria-label="Approve step and resume workflow"
      >
        {approving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5" />
        )}
        {approving ? 'Approving…' : 'Approve'}
      </button>
    </div>
  );
}
