'use client';

import { type LlmCallConfig } from '@/lib/types';

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly: boolean;
  totalSteps: number;
  currentPosition: number;
}

// Groq models (backend calls api.groq.com per processStep.ts)
const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'deepseek-r1-distill-llama-70b',
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass = 'w-full px-2.5 py-1.5 rounded-lg text-sm';
const inputStyle = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  outline: 'none',
};

export function LlmCallForm({ config, onChange, readOnly }: Props) {
  const c = config as unknown as LlmCallConfig;

  function update(field: keyof LlmCallConfig, value: unknown) {
    onChange({ ...config, [field]: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Model">
        <select
          value={c.model ?? 'gpt-4o'}
          onChange={(e) => update('model', e.target.value)}
          disabled={readOnly}
          className={inputClass}
          style={inputStyle}
          aria-label="LLM model"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>

      <Field label="Prompt template *">
        <textarea
          value={c.prompt_template ?? ''}
          onChange={(e) => update('prompt_template', e.target.value)}
          disabled={readOnly}
          rows={4}
          required
          placeholder="Enter your prompt. Use {{previous_output.field}} to reference prior step output."
          className={`${inputClass} resize-y`}
          style={inputStyle}
          aria-label="Prompt template"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Temperature">
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={c.temperature ?? 0.7}
            onChange={(e) => update('temperature', parseFloat(e.target.value))}
            disabled={readOnly}
            className={inputClass}
            style={inputStyle}
            aria-label="Temperature"
          />
        </Field>

        <Field label="Max tokens">
          <input
            type="number"
            min={1}
            max={32000}
            step={64}
            value={c.max_tokens ?? 1024}
            onChange={(e) => update('max_tokens', parseInt(e.target.value, 10))}
            disabled={readOnly}
            className={inputClass}
            style={inputStyle}
            aria-label="Max tokens"
          />
        </Field>
      </div>

      {!c.prompt_template?.trim() && !readOnly && (
        <p className="text-xs" style={{ color: 'var(--color-failed)' }}>
          Prompt template is required
        </p>
      )}
    </div>
  );
}
