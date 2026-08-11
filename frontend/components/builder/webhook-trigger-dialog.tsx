'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Copy, Check, X } from 'lucide-react';

interface WebhookTriggerDialogProps {
  token: string;
  onDismiss: () => void;
}

export function WebhookTriggerDialog({ token, onDismiss }: WebhookTriggerDialogProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success('Token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    // Modal backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="webhook-dialog-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Warning banner */}
        <div
          className="flex items-start gap-3 p-3 rounded-xl"
          style={{
            background: 'var(--color-pending-bg)',
            border: '1px solid var(--color-pending-border)',
          }}
        >
          <AlertTriangle
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: 'var(--color-pending)' }}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-pending)' }}>
              Copy this token now — you won&apos;t see it again
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-pending)' }}>
              This token is generated once and stored as a one-way hash. There is
              no way to retrieve it after you close this dialog. Copy it to a
              secure location before continuing.
            </p>
          </div>
        </div>

        <div>
          <p
            id="webhook-dialog-title"
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Webhook Bearer Token
          </p>

          {/* Token display */}
          <div
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            <code
              className="flex-1 text-xs font-mono break-all select-all"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {token}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-lg transition-all hover:bg-[var(--color-surface-3)]"
              style={{ color: copied ? 'var(--color-completed)' : 'var(--color-accent)' }}
              aria-label="Copy token"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Use this as an{' '}
            <code className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
              Authorization: Bearer {'<token>'}
            </code>{' '}
            header when calling the webhook endpoint.
          </p>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--color-accent)] cursor-pointer"
            id="token-saved-confirm"
          />
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            I&apos;ve saved this token in a secure location
          </span>
        </label>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'var(--color-accent-subtle)',
              color: 'var(--color-accent-text)',
              border: '1px solid var(--color-accent-border)',
            }}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy token
          </button>

          <button
            onClick={onDismiss}
            disabled={!confirmed}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-accent)' }}
            aria-label={confirmed ? 'Close dialog' : 'Check the confirmation box first'}
          >
            <X className="w-3.5 h-3.5" />
            Done, close
          </button>
        </div>
      </div>
    </div>
  );
}
