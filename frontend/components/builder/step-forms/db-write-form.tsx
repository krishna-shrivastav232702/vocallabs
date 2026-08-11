'use client';

import { useState } from 'react';
import { type DbWriteConfig } from '@/lib/types';
import { Lock } from 'lucide-react';

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly: boolean;
  totalSteps: number;
  currentPosition: number;
}

const OPERATIONS = ['insert', 'update', 'delete'] as const;

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

export function DbWriteForm({ config, onChange, readOnly }: Props) {
  const c = config as unknown as DbWriteConfig;
  const [dataText, setDataText] = useState(() => JSON.stringify(c.data ?? {}, null, 2));
  const [dataError, setDataError] = useState('');

  function update(field: keyof DbWriteConfig, value: unknown) {
    onChange({ ...config, [field]: value });
  }

  function handleDataChange(text: string) {
    setDataText(text);
    try {
      update('data', JSON.parse(text || '{}'));
      setDataError('');
    } catch {
      setDataError('Invalid JSON');
    }
  }

  // Validate table/column names (no SQL injection via identifiers)
  const tableValid = !c.table || /^[a-z_][a-z0-9_]*$/i.test(c.table);

  return (
    <div className="flex flex-col gap-3">
      {/* Owner-only notice */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{
          background: 'var(--color-pending-bg)',
          border: '1px solid var(--color-pending-border)',
          color: 'var(--color-pending)',
        }}
      >
        <Lock className="w-3 h-3 shrink-0" />
        Owner-only step — editors cannot add or save this step type
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Table name *">
            <input
              type="text"
              value={c.table ?? ''}
              onChange={(e) => update('table', e.target.value)}
              disabled={readOnly}
              placeholder="table_name"
              pattern="^[a-z_][a-z0-9_]*$"
              className={inputClass}
              style={{
                ...inputStyle,
                borderColor: !tableValid ? 'var(--color-failed)' : undefined,
              }}
              aria-label="Table name"
            />
          </Field>
        </div>
        <div className="w-28 shrink-0">
          <Field label="Operation">
            <select
              value={c.operation ?? 'insert'}
              onChange={(e) => update('operation', e.target.value)}
              disabled={readOnly}
              className={inputClass}
              style={inputStyle}
              aria-label="DB operation"
            >
              {OPERATIONS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {!tableValid && (
        <p className="text-xs" style={{ color: 'var(--color-failed)' }}>
          Table name must be a valid identifier (letters, numbers, underscores)
        </p>
      )}

      <Field label="Data (JSON) *">
        <textarea
          value={dataText}
          onChange={(e) => handleDataChange(e.target.value)}
          disabled={readOnly}
          rows={4}
          className={`${inputClass} resize-y font-mono text-xs`}
          style={{
            ...inputStyle,
            borderColor: dataError ? 'var(--color-failed)' : undefined,
          }}
          aria-label="Write data"
          placeholder='{"column": "value"}'
        />
        {dataError && (
          <p className="text-xs" style={{ color: 'var(--color-failed)' }}>{dataError}</p>
        )}
      </Field>
    </div>
  );
}
