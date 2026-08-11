'use client';

import { useState } from 'react';
import { type HttpRequestConfig } from '@/lib/types';

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  readOnly: boolean;
  totalSteps: number;
  currentPosition: number;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

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

export function HttpRequestForm({ config, onChange, readOnly }: Props) {
  const c = config as unknown as HttpRequestConfig;
  const [headersText, setHeadersText] = useState(
    () => JSON.stringify(c.headers ?? {}, null, 2)
  );
  const [headersError, setHeadersError] = useState('');

  function update(field: keyof HttpRequestConfig, value: unknown) {
    onChange({ ...config, [field]: value });
  }

  function handleHeadersChange(text: string) {
    setHeadersText(text);
    try {
      const parsed = JSON.parse(text || '{}');
      setHeadersError('');
      update('headers', parsed);
    } catch {
      setHeadersError('Invalid JSON');
    }
  }

  const showBody = ['POST', 'PUT', 'PATCH'].includes(c.method ?? '');
  const isUrlValid = !c.url || c.url.startsWith('http://') || c.url.startsWith('https://');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="w-28 shrink-0">
          <Field label="Method">
            <select
              value={c.method ?? 'GET'}
              onChange={(e) => update('method', e.target.value)}
              disabled={readOnly}
              className={inputClass}
              style={inputStyle}
              aria-label="HTTP method"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex-1">
          <Field label="URL *">
            <input
              type="url"
              value={c.url ?? ''}
              onChange={(e) => update('url', e.target.value)}
              disabled={readOnly}
              required
              placeholder="https://api.example.com/endpoint"
              className={inputClass}
              style={{
                ...inputStyle,
                borderColor: !isUrlValid ? 'var(--color-failed)' : undefined,
              }}
              aria-label="Request URL"
            />
          </Field>
        </div>
      </div>

      {!isUrlValid && (
        <p className="text-xs" style={{ color: 'var(--color-failed)' }}>
          URL must start with http:// or https://
        </p>
      )}

      <Field label="Headers (JSON)">
        <textarea
          value={headersText}
          onChange={(e) => handleHeadersChange(e.target.value)}
          disabled={readOnly}
          rows={3}
          className={`${inputClass} resize-y font-mono text-xs`}
          style={{
            ...inputStyle,
            borderColor: headersError ? 'var(--color-failed)' : undefined,
          }}
          aria-label="Request headers"
          placeholder='{"Content-Type": "application/json"}'
        />
        {headersError && (
          <p className="text-xs" style={{ color: 'var(--color-failed)' }}>{headersError}</p>
        )}
      </Field>

      {showBody && (
        <Field label="Request body">
          <textarea
            value={c.body ?? ''}
            onChange={(e) => update('body', e.target.value)}
            disabled={readOnly}
            rows={3}
            className={`${inputClass} resize-y font-mono text-xs`}
            style={inputStyle}
            aria-label="Request body"
            placeholder='{"key": "value"}'
          />
        </Field>
      )}
    </div>
  );
}
