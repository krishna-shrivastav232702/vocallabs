'use client';

import { type ApprovalGateConfig } from '@/lib/types';
import { ShieldCheck } from 'lucide-react';

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly: boolean;
  totalSteps: number;
  currentPosition: number;
}

const inputStyle = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  outline: 'none',
};

export function ApprovalGateForm({ config, onChange, readOnly }: Props) {
  const c = config as ApprovalGateConfig;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
        style={{
          background: 'var(--color-paused-bg)',
          border: '1px solid var(--color-paused-border)',
        }}
      >
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-paused)' }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-paused)' }}>
            Approval Gate
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-paused)' }}>
            Workflow will pause here until an owner or editor approves it.
            Viewers will see a &quot;waiting for approval&quot; message and cannot approve.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Approver note (optional)
        </label>
        <textarea
          value={c.approver_note ?? ''}
          onChange={(e) => onChange({ ...config, approver_note: e.target.value })}
          disabled={readOnly}
          rows={2}
          placeholder="Context for the approver — what should they review before approving?"
          className="w-full px-2.5 py-1.5 rounded-lg text-sm resize-y"
          style={inputStyle}
          aria-label="Approver note"
        />
      </div>
    </div>
  );
}
