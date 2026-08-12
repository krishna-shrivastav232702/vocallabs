'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-bg)' }}>
          <div style={{ textAlign: 'center', maxWidth: '360px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: '#1f0b10', border: '1px solid #881337',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <AlertTriangle style={{ width: '24px', height: '24px', color: '#fb7185' }} />
            </div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#9898b0', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              An unexpected error occurred. The error has been logged.
              {error.digest && (
                <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.5rem', fontFamily: 'monospace', color: '#5a5a70' }}>
                  ID: {error.digest}
                </span>
              )}
            </p>
            <button
              onClick={reset}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem',
                fontWeight: 500, color: '#ffffff', background: '#6366f1',
                border: 'none', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
      </div>
  
  );
}
