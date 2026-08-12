'use client';

import { useState } from 'react';
import { useMutation } from 'urql';
import { toast } from 'sonner';
import { CREATE_WEBHOOK_TRIGGER, REVOKE_WEBHOOK_TRIGGER } from '@/lib/graphql/mutations';
import { WebhookTriggerDialog } from './webhook-trigger-dialog';
import type { WorkflowTrigger, TriggerType, OrgRole } from '@/lib/types';
import { isOwner } from '@/lib/utils';
import {
  Play, Calendar, Database, Webhook, Plus, Trash2, ToggleLeft, ToggleRight
} from 'lucide-react';

interface TriggerPanelProps {
  workflowId?: string;
  triggers: WorkflowTrigger[];
  onTriggersChange: (triggers: Partial<WorkflowTrigger>[]) => void;
  editable: boolean;
  role: OrgRole | undefined;
}

const TRIGGER_CONFIG: Record<TriggerType, { label: string; Icon: React.ElementType; description: string }> = {
  manual: { label: 'Manual', Icon: Play, description: 'Trigger via UI or API' },
  scheduled: { label: 'Scheduled', Icon: Calendar, description: 'Cron expression' },
  database_event: { label: 'DB Event', Icon: Database, description: 'On table change' },
  webhook: { label: 'Webhook', Icon: Webhook, description: 'External HTTP trigger' },
};

export function TriggerPanel({
  workflowId,
  triggers,
  onTriggersChange,
  editable,
  role,
}: TriggerPanelProps) {
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; triggerId: string } | null>(null);

  const [, createWebhook] = useMutation(CREATE_WEBHOOK_TRIGGER);
  const [, revokeWebhook] = useMutation(REVOKE_WEBHOOK_TRIGGER);

  const nonWebhookTriggers = triggers.filter((t) => t.trigger_type !== 'webhook');
  const webhookTriggers = triggers.filter((t) => t.trigger_type === 'webhook');
  const hasManual = nonWebhookTriggers.some((t) => t.trigger_type === 'manual');

  function addTrigger(type: Exclude<TriggerType, 'webhook'>) {
    if (triggers.some((t) => t.trigger_type === type)) {
      toast.info(`${TRIGGER_CONFIG[type].label} trigger already exists`);
      return;
    }
    onTriggersChange([
      ...triggers,
      {
        trigger_type: type,
        config: type === 'scheduled' ? { cron: '0 * * * *' } : {},
        enabled: true,
      },
    ]);
  }

  function removeTrigger(index: number) {
    onTriggersChange(triggers.filter((_, i) => i !== index));
  }

  function toggleEnabled(index: number) {
    onTriggersChange(
      triggers.map((t, i) => (i === index ? { ...t, enabled: !t.enabled } : t))
    );
  }

  function updateConfig(index: number, config: Record<string, unknown>) {
    onTriggersChange(triggers.map((t, i) => (i === index ? { ...t, config } : t)));
  }

  async function handleCreateWebhook() {
    if (!workflowId) {
      toast.error('Save the workflow before adding a webhook trigger');
      return;
    }
    const result = await createWebhook({ workflow_id: workflowId });
    if (result.error) {
      toast.error(`Failed to create webhook: ${result.error.message}`);
      return;
    }
    const { trigger_id, token } = result.data.createWebhookTrigger;
    setNewToken({ token, triggerId: trigger_id });
    setWebhookDialogOpen(true);
  }

  async function handleRevokeWebhook(triggerId: string) {
    const result = await revokeWebhook({ trigger_id: triggerId });
    if (result.error) {
      toast.error(`Failed to revoke webhook: ${result.error.message}`);
    } else {
      toast.success('Webhook trigger revoked');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Triggers
        </h3>

        {/* Manual trigger is always implicit */}
        <div
          className="flex items-center gap-2.5 p-2.5 rounded-lg mb-2"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Play className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Manual
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Always enabled — run via the Run button
            </p>
          </div>
        </div>

        {/* Configured triggers */}
        <div className="flex flex-col gap-2">
          {triggers.map((trigger, index) => {
            if (trigger.trigger_type === 'webhook') return null; // rendered separately
            const cfg = TRIGGER_CONFIG[trigger.trigger_type];
            const { Icon } = cfg;
            return (
              <div
                key={index}
                className="p-2.5 rounded-lg"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                  <span className="text-xs font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    {cfg.label}
                  </span>
                  {editable && (
                    <>
                      <button
                        onClick={() => toggleEnabled(index)}
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors"
                        aria-label={trigger.enabled ? 'Disable trigger' : 'Enable trigger'}
                      >
                        {trigger.enabled
                          ? <ToggleRight className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                          : <ToggleLeft className="w-4 h-4" />
                        }
                      </button>
                      <button
                        onClick={() => removeTrigger(index)}
                        className="hover:text-[var(--color-failed)] transition-colors"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        aria-label="Remove trigger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Inline config for scheduled */}
                {trigger.trigger_type === 'scheduled' && editable && (
                  <div className="mt-2">
                    <label className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      Cron expression
                    </label>
                    <input
                      type="text"
                      value={(trigger.config as { cron?: string })?.cron ?? ''}
                      onChange={(e) => updateConfig(index, { ...trigger.config, cron: e.target.value })}
                      placeholder="0 * * * *"
                      className="w-full mt-1 px-2 py-1 rounded text-xs font-mono"
                      style={{
                        background: 'var(--color-surface-3)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                      }}
                      aria-label="Cron expression"
                    />
                  </div>
                )}

                {/* Inline config for database_event */}
                {trigger.trigger_type === 'database_event' && editable && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={(trigger.config as { table?: string })?.table ?? ''}
                      onChange={(e) => updateConfig(index, { ...trigger.config, table: e.target.value })}
                      placeholder="Table name"
                      className="w-full px-2 py-1 rounded text-xs"
                      style={{
                        background: 'var(--color-surface-3)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                      }}
                      aria-label="Table name"
                    />
                    <select
                      value={(trigger.config as { event?: string })?.event ?? 'INSERT'}
                      onChange={(e) => updateConfig(index, { ...trigger.config, event: e.target.value })}
                      className="w-full px-2 py-1 rounded text-xs"
                      style={{
                        background: 'var(--color-surface-3)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                      }}
                      aria-label="DB event type"
                    >
                      <option value="INSERT">INSERT</option>
                      <option value="UPDATE">UPDATE</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Webhook triggers */}
        {webhookTriggers.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {webhookTriggers.map((trigger) => (
              <div
                key={trigger.id}
                className="p-2.5 rounded-lg"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Webhook className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                  <span className="text-xs font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    Webhook
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      color: trigger.enabled ? 'var(--color-completed)' : 'var(--color-text-tertiary)',
                      background: trigger.enabled ? 'var(--color-completed-bg)' : 'var(--color-surface-3)',
                    }}
                  >
                    {trigger.enabled ? 'Active' : 'Revoked'}
                  </span>
                  {isOwner(role) && trigger.enabled && (
                    <button
                      onClick={() => handleRevokeWebhook(trigger.id)}
                      className="hover:text-[var(--color-failed)] transition-colors"
                      style={{ color: 'var(--color-text-tertiary)' }}
                      aria-label="Revoke webhook trigger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add trigger buttons */}
      {editable && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Add trigger
          </p>

          {(['scheduled', 'database_event'] as const).map((type) => {
            const cfg = TRIGGER_CONFIG[type];
            const { Icon } = cfg;
            const exists = triggers.some((t) => t.trigger_type === type);
            return (
              <button
                key={type}
                onClick={() => addTrigger(type)}
                disabled={exists}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-40 hover:bg-[var(--color-surface-2)]"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Plus className="w-3 h-3" />
                <Icon className="w-3 h-3" />
                {cfg.label}
                {exists && <span className="ml-auto text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>added</span>}
              </button>
            );
          })}

          {/* Webhook — owner only */}
          {isOwner(role) && (
            <button
              onClick={handleCreateWebhook}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:bg-[var(--color-surface-2)]"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Plus className="w-3 h-3" />
              <Webhook className="w-3 h-3" />
              Webhook
            </button>
          )}
        </div>
      )}

      {/* Webhook one-time token dialog */}
      {webhookDialogOpen && newToken && (
        <WebhookTriggerDialog
          token={newToken.token}
          triggerId={newToken.triggerId}
          onDismiss={() => {
            setWebhookDialogOpen(false);
            setNewToken(null);
          }}
        />
      )}
    </div>
  );
}
