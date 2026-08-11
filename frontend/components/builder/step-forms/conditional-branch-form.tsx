'use client';

import { type ConditionalBranchConfig } from '@/lib/types';

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly: boolean;
  totalSteps: number;
  currentPosition: number;
}

const OPERATORS = [
  { value: 'eq', label: '= equals' },
  { value: 'neq', label: '≠ not equals' },
  { value: 'gt', label: '> greater than' },
  { value: 'gte', label: '≥ greater or equal' },
  { value: 'lt', label: '< less than' },
  { value: 'lte', label: '≤ less or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
] as const;

const inputClass = 'w-full px-2.5 py-1.5 rounded-lg text-sm';
const inputStyle = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  outline: 'none',
};

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

export function ConditionalBranchForm({ config, onChange, readOnly, totalSteps, currentPosition }: Props) {
  const c = config as unknown as ConditionalBranchConfig;
  const condition = c.condition ?? { field: '', operator: 'eq', value: '' };

  function updateCondition(field: string, value: unknown) {
    onChange({ ...config, condition: { ...condition, [field]: value } });
  }

  function updateTarget(key: 'true_target_position' | 'false_target_position', pos: number) {
    onChange({ ...config, [key]: pos });
  }

  // Build position options (excluding current step)
  const positionOptions = Array.from({ length: totalSteps }, (_, i) => i).filter(
    (i) => i !== currentPosition
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Condition block */}
      <div
        className="p-3 rounded-lg flex flex-col gap-3"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
          Condition
        </p>

        <Field label="Field (from previous step output)">
          <input
            type="text"
            value={condition.field ?? ''}
            onChange={(e) => updateCondition('field', e.target.value)}
            disabled={readOnly}
            placeholder="e.g. status, score, response.code"
            className={inputClass}
            style={inputStyle}
            aria-label="Condition field"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Operator">
            <select
              value={condition.operator ?? 'eq'}
              onChange={(e) => updateCondition('operator', e.target.value)}
              disabled={readOnly}
              className={inputClass}
              style={inputStyle}
              aria-label="Condition operator"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Value">
            <input
              type="text"
              value={String(condition.value ?? '')}
              onChange={(e) => updateCondition('value', e.target.value)}
              disabled={readOnly}
              placeholder="Expected value"
              className={inputClass}
              style={inputStyle}
              aria-label="Condition value"
            />
          </Field>
        </div>
      </div>

      {/* Branch targets — visual step picker, not raw integers */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-3 rounded-lg flex flex-col gap-2"
          style={{ background: 'var(--color-completed-bg)', border: '1px solid var(--color-completed-border)' }}
        >
          <p className="text-xs font-semibold" style={{ color: 'var(--color-completed)' }}>
            ✓ If true → go to step
          </p>
          <select
            value={c.true_target_position ?? 0}
            onChange={(e) => updateTarget('true_target_position', parseInt(e.target.value, 10))}
            disabled={readOnly}
            className={inputClass}
            style={inputStyle}
            aria-label="True branch target step"
          >
            {positionOptions.map((pos) => (
              <option key={pos} value={pos}>Step {pos + 1}</option>
            ))}
            {positionOptions.length === 0 && (
              <option value={0}>Step 1</option>
            )}
          </select>
        </div>

        <div
          className="p-3 rounded-lg flex flex-col gap-2"
          style={{ background: 'var(--color-failed-bg)', border: '1px solid var(--color-failed-border)' }}
        >
          <p className="text-xs font-semibold" style={{ color: 'var(--color-failed)' }}>
            ✗ If false → go to step
          </p>
          <select
            value={c.false_target_position ?? 0}
            onChange={(e) => updateTarget('false_target_position', parseInt(e.target.value, 10))}
            disabled={readOnly}
            className={inputClass}
            style={inputStyle}
            aria-label="False branch target step"
          >
            {positionOptions.map((pos) => (
              <option key={pos} value={pos}>Step {pos + 1}</option>
            ))}
            {positionOptions.length === 0 && (
              <option value={0}>Step 1</option>
            )}
          </select>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        Branch targets reference step positions, not step IDs. Reordering steps
        may require updating these values.
      </p>
    </div>
  );
}
