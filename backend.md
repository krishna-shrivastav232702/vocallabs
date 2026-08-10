# AI Agent Workflow Builder — Backend Architecture

## 1. Stack & High-Level Shape

```
Next.js (nhost auth, org context)
        │  GraphQL (queries / mutations / subscriptions)
        ▼
Hasura GraphQL Engine ── Layer 1: org + role row permissions (RLS-style, indexed)
        │  Actions: triggerWorkflowRun, triggerWorkflowRunWebhook, approveStep,
        │           createWebhookTrigger, revokeWebhookTrigger, saveWorkflow
        ▼
Node Action handlers ── Layer 2: business-logic gating (role checks, atomic
        │                        state transitions, secret decryption)
        ├─ Event Trigger (step_runs WHERE status='pending') ──▶ processStep worker
        ├─ Cron Trigger (every 15 min) ──▶ run_sweeper() (stuck runs, quota reset)
        ▼
PostgreSQL — durable state machine (workflows, runs, step_runs, secrets)
```

**Core principle:** Postgres is the queue and the source of truth. No execution
state ever lives only in a Node process's memory — every step transition is a
row write, and the Event Trigger (not application code) is what drives the
next step forward. This means a crashed worker loses at most one in-flight
step, never an entire run, because Hasura's Event Trigger delivery has its
own retry/dead-letter guarantees independent of the worker process.

## 2. Two-Layer Permission Model

**Layer 1 — Hasura row permissions (who can see/touch a row at all).**
Every table's permission predicate joins through `org_members` rather than
trusting any client-supplied org claim:

```
{ "org": { "org_members": { "_and": [
    { "user_id": { "_eq": "X-Hasura-User-Id" } },
    { "role": { "_in": [...] } }
]}}}
```

All authenticated traffic uses a single Hasura role, `user` — owner/editor/
viewer is never encoded as a Hasura role, because a user can hold different
roles in different orgs simultaneously. Role logic lives entirely in the
row-permission expression, re-evaluated per request, which is what makes
cross-org ID-guessing fail even against a directly-guessed UUID.

`workflow_runs` and `step_runs` — the two tables that represent live
execution state — have **zero client insert/update/delete permissions**,
for every role including owner. All writes to these tables happen only
through Action handlers using the Hasura admin secret. This is deliberate:
a declarative permission rule can't express "only if the run is currently
paused," so anything requiring that kind of conditional, mid-execution
check is pushed to Layer 2 instead of faked in Layer 1.

**Layer 2 — Action handler logic (who can perform this specific action,
right now).** Examples: only owner/editor can call `triggerWorkflowRun`
(viewer is a valid org member but blocked at the handler); only owner can
create/revoke a webhook trigger; only owner/editor can approve a paused
gate, checked via an atomic compare-and-swap so a duplicate approval loses
cleanly instead of double-executing.

`db_write`, `notify`, and `webhook` triggers are gated at **both** layers
redundantly — Layer 1 restricts editor's insert permission by
`step_type`/`trigger_type`, and the `saveWorkflow`/`createWebhookTrigger`
handlers independently re-check the same restriction in code. This
duplication is intentional defense-in-depth, not an oversight.

## 3. Execution Engine

`triggerWorkflowRun` / `triggerWorkflowRunWebhook` do **only** two things:
write a `workflow_runs` row and the first `step_runs` row (status
`pending`), then return. No step logic executes inline.

A Hasura Event Trigger on `step_runs` (`INSERT`/`UPDATE` where
`status = 'pending'`) invokes `processStep`, which:

1. **Atomically claims** the row (`UPDATE ... WHERE status='pending'
   RETURNING *`) — makes duplicate event delivery a no-op instead of a
   double-execution.
2. Re-validates `steps.config` against a Zod discriminated union keyed on
   `step_type`, even though the same validation ran at save-time — a
   defense-in-depth checkpoint against malformed data reaching the worker
   by any other path (manual DB edits, migrations, admin-secret testing).
3. Dispatches by `step_type`:
   - `llm_call` / `http_request`: real external calls, `AbortController`
     timeout, non-2xx responses explicitly thrown as errors (not silently
     recorded as success).
   - `conditional_branch`: reads the previous step's `output`, evaluates a
     structured `{field, operator, value}` condition (never a raw
     evaluable string — that would be arbitrary code execution against
     user-controlled JSONB), and branches to one of two explicit
     `position` targets.
   - `db_write`: inserts into an explicit allow-list of app tables, with
     identifier validation on table/column names to prevent SQL injection
     via config.
   - `notify`: posts to a Slack webhook URL pulled from encrypted
     `step_secrets`.
   - `approval_gate`: sets the step to `paused_awaiting_approval` and the
     run to `paused`, then stops — no further steps are queued until
     `approveStep` resumes it.
4. On failure of a retryable step type (`llm_call`/`http_request`),
   increments `attempt_count` and resets status to `pending` — which
   re-fires the Event Trigger — up to a max of 3 attempts before failing
   the step and the run.
5. On success, writes `output` and inserts the next `step_runs` row as
   `pending`, or marks the run `completed` if it was the last step.

`approveStep` uses the same atomic-compare-and-swap pattern
(`WHERE status='paused_awaiting_approval'`) to make double-approval a
clean no-op (`409`) rather than a double-executed workflow tail.

## 4. Failure Handling & the Sweeper

- **Per-call timeouts** (`AbortController`, 10–15s) stop a single hung
  external call from blocking a worker invocation indefinitely.
- **Per-step retries** (up to 3 attempts, tracked via `attempt_count`)
  handle transient failures in external APIs.
- **The sweeper** (`run_sweeper()`, Postgres function, invoked via a
  cron-triggered Action every 15 min) handles the failure modes retries
  and timeouts can't: a `step_runs` row stuck `in_progress` for over an
  hour (worker died mid-call), a `paused_awaiting_approval` step never
  approved within 7 days, and monthly `quota_usage` reset. All updates
  are set-based, not row-by-row, and run inside one function invocation
  authenticated by a shared secret header — this endpoint is never
  reachable by client roles.

## 5. Secrets Management

Two tables — `step_secrets`, `trigger_secrets` — hold encrypted values and
are **untracked from the Hasura GraphQL schema entirely** (not merely
permissioned to deny all roles; untracked means introspection never
reveals the table exists at all).

- Encryption: `pgp_sym_encrypt`/`pgp_sym_decrypt` via `pgcrypto`, with the
  key passed as a **bound parameter** through `set_config('app.encryption_key',
  $1, true)` — the `true` flag scopes it to the current transaction only,
  preventing key leakage across pooled connections. The key itself lives
  only in the Node process's environment, never in the database or in
  client-reachable config.
- Webhook trigger tokens are generated server-side
  (`crypto.randomBytes(32)`), returned to the caller exactly once at
  creation time, and compared using `crypto.timingSafeEqual` to prevent
  timing-based token guessing. A wrong token and a nonexistent
  `trigger_id` return an identical `401` response, preventing trigger-ID
  enumeration via response-shape differences.
- Known limitation, intentionally out of scope for this assignment: no key
  rotation mechanism. Noted here rather than silently omitted.

## 6. API Surface Exposed to the Frontend

All Actions are called as standard GraphQL mutations through the Hasura
endpoint — the frontend never calls Node handler URLs directly.

| Operation | Type | Auth | Notes |
|---|---|---|---|
| `workflows` (+ nested `steps`, `workflow_triggers`, `latest_run`) | Query | Hasura session (`user` role) | Org-scoped automatically via Layer 1 |
| `saveWorkflow` | Action mutation | Hasura session, owner/editor | Combined create/edit for workflow + steps + non-webhook triggers |
| `triggerWorkflowRun` | Action mutation | Hasura session, owner/editor | Manual trigger path |
| `createWebhookTrigger` | Action mutation | Hasura session, owner only | Returns plaintext token once |
| `revokeWebhookTrigger` | Action mutation | Hasura session, owner only | Soft-disables, preserves history |
| `triggerWorkflowRunWebhook` | Action mutation | **No** Hasura session — `trigger_id` + bearer token instead | Called by external systems, not the frontend UI directly |
| `approveStep` | Action mutation | Hasura session, owner/editor | Atomic compare-and-swap under the hood |
| `step_runs(where: {workflow_run_id: {_eq: $id}})` | Subscription | Hasura session | Drives the live progress UI, including the paused state |

Frontend integration notes:
- Standard queries/mutations go through nhost's GraphQL client, which
  attaches the user's JWT automatically — Hasura derives
  `X-Hasura-User-Id` from it, so the frontend never sends that header
  manually.
- Subscriptions use the same client over a WebSocket connection; filter by
  `workflow_run_id` obtained from the `triggerWorkflowRun`/
  `triggerWorkflowRunWebhook` response.
- The Run button should be hidden for viewers in the UI as a UX nicety,
  but this is **not** the enforcement point — Layer 2 in
  `triggerWorkflowRun` rejects viewers regardless of what the UI shows,
  so a viewer bypassing the UI still gets a `403`.
- `triggerWorkflowRunWebhook` is documented here for completeness but
  isn't called by the Next.js app — it's the endpoint external systems
  (or `curl`, for the demo) call to prove the "started two ways"
  requirement.

## 7. Testing Approach (summary)

Tested bottom-up: raw SQL primitives first (quota UPDATE race, approval
compare-and-swap, encrypt/decrypt round-trip) → Layer 1 permissions via
Hasura's role impersonation (confirm cross-org queries return empty, not
errors) → each Action handler called directly via HTTP, bypassing Hasura,
covering success/403/409/429 cases per handler → the real Event Trigger
wired end-to-end, observed by watching `step_runs` advance with no manual
intervention → a live GraphQL subscription confirmed to stream state
changes including the paused/approved transition, before any frontend
code was written.

## 8. Known Gaps / Explicitly Deferred

- Key rotation for encrypted secrets.
- A `pending`-status sweep for step_runs whose Event Trigger delivery was
  fully exhausted before ever reaching the worker (current sweeper covers
  `in_progress` and `paused_awaiting_approval`, not this edge case).
- `conditional_branch` targets are explicit `position` integers rather
  than a full DAG edge model — sufficient for the assignment's linear
  step-list model, would need revisiting for arbitrary branching/merging
  workflows at larger scale.