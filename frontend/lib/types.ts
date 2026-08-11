// Core domain types derived from the backend schema (Hasura + PostgreSQL)
// backend.md is the authoritative source — never invent fields not documented there.

// ─── Role semantics ─────────────────────────────────────────────────────────
// "user" is the only Hasura role. owner/editor/viewer comes from org_members.role.
export type OrgRole = 'owner' | 'editor' | 'viewer';

// ─── Step types ──────────────────────────────────────────────────────────────
export type StepType =
  | 'llm_call'
  | 'http_request'
  | 'db_write'
  | 'notify'
  | 'conditional_branch'
  | 'approval_gate';

// Editor-restricted step types (backend enforces this at both layers)
export const EDITOR_RESTRICTED_STEP_TYPES: StepType[] = ['db_write', 'notify'];

// ─── Step configs (mirrors backend Zod discriminated union) ──────────────────
export interface LlmCallConfig {
  model: string;
  // Field name matches backend processStep.ts: parsedConfig.prompt_template
  prompt_template: string;
  temperature?: number;
  max_tokens?: number;
}

export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

export interface DbWriteConfig {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
}

export interface NotifyConfig {
  message?: string;
  // webhook_url is stored in step_secrets — not sent directly in config
}

export interface ConditionalBranchConfig {
  condition: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains';
    value: string | number | boolean;
  };
  true_target_position: number;
  false_target_position: number;
}

export interface ApprovalGateConfig {
  approver_note?: string;
}

export type StepConfig =
  | LlmCallConfig
  | HttpRequestConfig
  | DbWriteConfig
  | NotifyConfig
  | ConditionalBranchConfig
  | ApprovalGateConfig;

// ─── Step run statuses ────────────────────────────────────────────────────────
export type StepRunStatus =
  | 'pending'
  | 'in_progress'
  | 'paused_awaiting_approval'
  | 'completed'
  | 'failed';

// ─── Workflow run statuses ────────────────────────────────────────────────────
export type WorkflowRunStatus =
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed';

// ─── Trigger types ────────────────────────────────────────────────────────────
export type TriggerType = 'manual' | 'scheduled' | 'database_event' | 'webhook';

// ─── Domain objects ───────────────────────────────────────────────────────────
export interface Step {
  id: string;
  workflow_id: string;
  step_type: StepType;
  position: number;
  config: StepConfig;
}

// Optimistic/draft step (before save — may not have a server-assigned id)
export interface DraftStep {
  id?: string;
  // client-side only key for dnd-kit and React keys
  _key: string;
  step_type: StepType;
  position: number;
  config: StepConfig;
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  trigger_type: TriggerType;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface LatestRun {
  id: string;
  status: WorkflowRunStatus;
  started_at: string;
  completed_at: string | null;
  step_runs?: Array<{
    status: StepRunStatus;
    step: {
      position: number;
      step_type: StepType;
    };
  }>;
}

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  steps: Step[] | { id: string }[];
  workflow_triggers: WorkflowTrigger[];
  // Using workflow_runs relationship directly instead of view to support step_runs
  runs?: LatestRun[];
}

export interface StepRun {
  id: string;
  workflow_run_id: string;
  status: StepRunStatus;
  attempt_count: number;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  created_at: string | null;
  updated_at: string | null;
  step: Step;
}

export interface Org {
  id: string;
  name: string;
  quota_limit?: number;
  quota_usage?: number;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: OrgRole;
  org: Org;
}

// ─── Save workflow input shape ────────────────────────────────────────────────
export interface SaveWorkflowInput {
  workflow_id?: string;
  org_id: string;
  name: string;
  steps: Array<{
    id?: string;
    step_type: StepType;
    position: number;
    config: StepConfig;
  }>;
  triggers: Array<{
    id?: string;
    trigger_type: Exclude<TriggerType, 'webhook'>;
    config: Record<string, unknown>;
    enabled: boolean;
  }>;
}
