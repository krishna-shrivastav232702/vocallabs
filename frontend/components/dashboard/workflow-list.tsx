'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { useUserData } from '@nhost/react';
import Link from 'next/link';
import { GET_WORKFLOWS } from '@/lib/graphql/queries';
import { CREATE_ORG } from '@/lib/graphql/mutations';
import { WorkflowCard } from './workflow-card';
import { EmptyState } from './empty-state';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { useOrgContext } from '@/components/providers/org-context';
import type { Workflow } from '@/lib/types';
import { Plus, RefreshCw, AlertTriangle, Building2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function WorkflowList() {
  const { orgId, isLoading: orgLoading, hasNoOrg, orgError } = useOrgContext();
  const user = useUserData();
  const [newOrgName, setNewOrgName] = useState('');
  const [{ fetching: creatingOrg }, createOrg] = useMutation(CREATE_ORG);

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: GET_WORKFLOWS,
    variables: { org_id: orgId },
    pause: !orgId,
    requestPolicy: 'network-only',
  });

  // ── Org still loading ──────────────────────────────────────────────────────
  if (orgLoading) return <DashboardSkeleton />;

  // ── GraphQL / network error on org query ───────────────────────────────────
  if (orgError) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div
          className="surface p-6 text-center"
          style={{ borderColor: 'var(--color-failed-border)' }}
        >
          <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-failed)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Could not load your organisations
          </p>
          <p
            className="text-xs mb-4 max-w-sm mx-auto font-mono"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {orgError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-accent)',
              background: 'var(--color-accent-subtle)',
              border: '1px solid var(--color-accent-border)',
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </button>
        </div>
      </div>
    );
  }

  // ── User has no org memberships ────────────────────────────────────────────
  if (hasNoOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center fade-in">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: 'var(--color-accent-subtle)',
            border: '1px solid var(--color-accent-border)',
          }}
        >
          <Building2 className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
        </div>
        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Welcome to Synflow
        </h2>
        <p
          className="text-sm max-w-sm mb-8 leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          To get started with building AI agent workflows, you need to create your first organisation.
        </p>

        <form
          className="w-full max-w-sm flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newOrgName.trim()) return;
            const res = await createOrg({ name: newOrgName });
            if (res.error) {
              toast.error(res.error.message);
            } else {
              toast.success('Organisation created!');
              // Force full reload so the org context completely resets with the new org
              window.location.reload();
            }
          }}
        >
          <input
            type="text"
            required
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="E.g. Acme Corp"
            className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors text-center font-medium"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          />
          <button
            type="submit"
            disabled={creatingOrg}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: creatingOrg ? 'var(--color-accent-hover)' : 'var(--color-accent)',
            }}
          >
            {creatingOrg ? 'Creating...' : 'Create organisation'}
            {!creatingOrg && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    );
  }

  // ── Workflows loading ──────────────────────────────────────────────────────
  if (fetching) return <DashboardSkeleton />;

  // ── Workflows query error ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div
          className="surface p-6 text-center"
          style={{ borderColor: 'var(--color-failed-border)' }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-failed)' }}>
            Failed to load workflows
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
            {error.message}
          </p>
          <button
            onClick={() => reexecute({ requestPolicy: 'network-only' })}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-accent)',
              background: 'var(--color-accent-subtle)',
              border: '1px solid var(--color-accent-border)',
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const workflows: Workflow[] = data?.workflows ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Workflows
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} in this org
          </p>
        </div>

        <Link
          href="/workflows/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          New workflow
        </Link>
      </div>

      {/* Workflow list or empty state */}
      {workflows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2.5">
          {workflows.map((w) => (
            <WorkflowCard key={w.id} workflow={w} />
          ))}
        </div>
      )}
    </div>
  );
}
