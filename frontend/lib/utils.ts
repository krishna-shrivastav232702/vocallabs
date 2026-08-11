import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StepType, StepRunStatus, OrgRole } from './types';

// ─── Tailwind class merger ─────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Step type visual config ──────────────────────────────────────────────────
// Each step type gets a distinct color accent and icon name (lucide-react).
// Used by the builder canvas and run view to make workflow shape scannable.
export const STEP_TYPE_CONFIG: Record<
  StepType,
  { label: string; iconName: string; accentClass: string; bgClass: string; description: string }
> = {
  llm_call: {
    label: 'LLM Call',
    iconName: 'Sparkles',
    accentClass: 'text-violet-400',
    bgClass: 'bg-violet-500/10 border-violet-500/20',
    description: 'Call an AI language model',
  },
  http_request: {
    label: 'HTTP Request',
    iconName: 'Globe',
    accentClass: 'text-sky-400',
    bgClass: 'bg-sky-500/10 border-sky-500/20',
    description: 'Make an external HTTP call',
  },
  db_write: {
    label: 'DB Write',
    iconName: 'Database',
    accentClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10 border-orange-500/20',
    description: 'Write to a database table',
  },
  notify: {
    label: 'Notify',
    iconName: 'Bell',
    accentClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    description: 'Send a Slack notification',
  },
  conditional_branch: {
    label: 'Branch',
    iconName: 'GitBranch',
    accentClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Branch on a condition',
  },
  approval_gate: {
    label: 'Approval Gate',
    iconName: 'ShieldCheck',
    accentClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10 border-rose-500/20',
    description: 'Pause and wait for approval',
  },
};

// ─── Step run status config ───────────────────────────────────────────────────
// Color is NEVER used alone — always paired with icon and label (colorblind-safe).
export const STATUS_CONFIG: Record<
  StepRunStatus,
  { label: string; iconName: string; colorClass: string; ringClass: string }
> = {
  pending: {
    label: 'Pending',
    iconName: 'Clock',
    colorClass: 'text-amber-400',
    ringClass: 'ring-amber-400/30',
  },
  in_progress: {
    label: 'Running',
    iconName: 'Loader2',
    colorClass: 'text-sky-400',
    ringClass: 'ring-sky-400/30',
  },
  paused_awaiting_approval: {
    label: 'Awaiting Approval',
    iconName: 'PauseCircle',
    colorClass: 'text-violet-400',
    ringClass: 'ring-violet-400/30',
  },
  completed: {
    label: 'Completed',
    iconName: 'CheckCircle2',
    colorClass: 'text-emerald-400',
    ringClass: 'ring-emerald-400/30',
  },
  failed: {
    label: 'Failed',
    iconName: 'AlertTriangle',
    colorClass: 'text-rose-400',
    ringClass: 'ring-rose-400/30',
  },
};

// ─── Role helpers ─────────────────────────────────────────────────────────────
export function canEdit(role: OrgRole | undefined): boolean {
  return role === 'owner' || role === 'editor';
}

export function isOwner(role: OrgRole | undefined): boolean {
  return role === 'owner';
}

export const ROLE_BADGE_CONFIG: Record<OrgRole, { label: string; className: string }> = {
  owner: { label: 'Owner', className: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' },
  editor: { label: 'Editor', className: 'bg-sky-500/15 text-sky-300 border border-sky-500/20' },
  viewer: { label: 'Viewer', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
};

// ─── Misc helpers ─────────────────────────────────────────────────────────────
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function generateKey(): string {
  return Math.random().toString(36).slice(2, 10);
}
