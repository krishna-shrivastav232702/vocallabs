import Link from 'next/link';
import { Workflow } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center fade-in">
      {/* Decorative icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'var(--color-accent-subtle)',
          border: '1px solid var(--color-accent-border)',
        }}
      >
        <Workflow className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
      </div>

      <h2
        className="text-xl font-semibold mb-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        No workflows yet
      </h2>
      <p
        className="text-sm max-w-xs mb-6 leading-relaxed"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Build your first AI agent workflow — add steps, configure triggers,
        and watch runs happen in real time.
      </p>

      <Link
        href="/workflows/new"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
        style={{ background: 'var(--color-accent)' }}
      >
        Create workflow
      </Link>
    </div>
  );
}
