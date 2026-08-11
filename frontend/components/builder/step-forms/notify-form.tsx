'use client';

import { type NotifyConfig } from '@/lib/types';
import { Lock } from 'lucide-react';

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly: boolean;
  totalSteps: number;
  currentPosition: number;
}

const inputClass = 'w-full px-2.5 py-1.5 rounded-lg text-sm';
const inputStyle = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  outline: 'none',
};

export function NotifyForm({ config, onChange, readOnly }: Props) {
  const c = config as unknown as NotifyConfig;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{
          background: 'var(--color-pending-bg)',
          border: '1px solid var(--color-pending-border)',
          color: 'var(--color-pending)',
        }}
      >
        <Lock className="w-3 h-3 shrink-0" />
        Owner-only step — Slack webhook URL is stored securely as a secret
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Message *
        </label>
        <textarea
          value={c.message ?? ''}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          disabled={readOnly}
          rows={3}
          required
          placeholder="Notification message. Use {{previous_output.field}} to include workflow data."
          className={`${inputClass} resize-y`}
          style={inputStyle}
          aria-label="Notification message"
        />
        {!c.message?.trim() && !readOnly && (
          <p className="text-xs" style={{ color: 'var(--color-failed)' }}>Message is required</p>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        The Slack webhook URL is configured separately as an encrypted secret and
        not stored in the workflow config.
      </p>
    </div>
  );
}
