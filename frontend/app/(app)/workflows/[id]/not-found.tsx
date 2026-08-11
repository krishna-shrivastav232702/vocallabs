import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Workflow Not Found' };

export default function WorkflowNotFound() {
  return (
    <div className="flex items-center justify-center flex-1 p-8">
      <div className="text-center max-w-sm">
        <p
          className="text-5xl font-bold mb-4"
          style={{ color: 'var(--color-accent)', opacity: 0.3 }}
        >
          ¿
        </p>
        <h1
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Workflow not found
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          This workflow doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
