# Synflow - Enterprise-Grade Workflow Engine

## 🎥 Video Walkthrough
*[Insert your loom/youtube video link here demonstrating the live end-to-end testing]*

## 🚀 Features Overview
Synflow is a distributed, multi-tenant workflow engine built for resilience and security. It supports executing complex logical flows including external API calls, AI inference, conditional branching, and human-in-the-loop approvals.

* **Multi-Tenant Org Isolation:** Strict Layer 1 Row-Level Security (RLS) ensures users can only interact with data inside their own organization.
* **Role-Based Access Control:** Differentiates between Owners, Editors, and Viewers (e.g., only Owners/Editors can approve gates or configure webhooks).
* **Idempotent Background Processing:** Executes jobs via a Postgres-backed event-queue that guarantees at-least-once delivery, utilizing atomic locks to ensure no duplicate executions.
* **Complex Routing:** Supports branching logic based on the outputs of previous steps, including dynamic LLM outputs.
* **Multiple Triggers:** Workflows can be started manually via the UI or asynchronously via secure, encrypted Webhooks.
* **Real-Time Subscriptions:** Live-streaming of workflow execution status (Pending, In Progress, Paused, Completed, Failed) to the frontend via GraphQL Subscriptions without refreshing.

## 🏗️ System Architecture

This architecture is **production-grade and airtight**. By shifting from an in-memory "fire-and-forget" execution model to a **Postgres-backed Event Trigger loop**, we eliminated the most common failure modes of distributed workflow engines: lost state on server crashes, race conditions, and lingering orphan jobs.

```text
Next.js (nhost auth, org context)
        │ GraphQL
        ▼
Hasura ── Layer 1: org+role RLS (indexed) ── Actions: triggerWorkflowRun, approveStep
        │  triggerWorkflowRun: INSERT workflow_run(pending) + step_run(pending) → return 200
        │
        ├─ Event Trigger: step_runs WHERE status='pending' ──▶ Worker (executes ONE step)
        │                                                      │
        │                                                      writes step_run.status=completed/failed
        │                                                      writes NEXT step_run as 'pending' (or 'paused_awaiting_approval')
        │                                                      (retry: on failure, requeue with attempt_count++, up to N)
        │
        ├─ Cron Trigger (every 15 min) ──▶ Sweeper: in_progress > 1hr → failed
        │                                  paused_awaiting_approval > 7d → timed_out
        │
        └─ approveStep Action ──▶ atomic UPDATE ... WHERE status='paused_awaiting_approval' RETURNING *
                                    0 rows → abort silently
                                    1 row  → insert next step_run as 'pending' (re-enters the event chain)

Postgres: workflows, steps, workflow_runs, step_runs, org_members(user_id, org_id) [UNIQUE INDEX],
          trigger_secrets (untracked from GraphQL — admin-secret access only)
```

## 🛡️ Problems Encountered & Solutions Provided

### 1. Cross-Org Data Leakage (The "Org B" Hack)
**Problem:** In a naive implementation, a user from Org B could guess a UUID and fetch or execute a workflow from Org A by hitting the API or navigating to a hardcoded frontend URL.
**Solution:** We implemented strict Hasura Row Level Security (RLS) on all tables (workflows, runs, steps). If a user attempts to fetch a workflow outside their Org, Hasura intercepts it at the Postgres level and returns 0 rows. On the frontend, we handled this safely by catching the null response and gracefully rendering a "Workflow Not Found" fallback, preventing Next.js hydration crashes.

### 2. Race-Condition Vulnerable Approval Gates
**Problem:** If two managers clicked "Approve" at the exact same millisecond, the system might accidentally duplicate the downstream execution chain.
**Solution:** `approveStep` is implemented as an atomic SQL transition: `UPDATE ... WHERE status='paused_awaiting_approval' RETURNING *`. The database guarantees only one request will successfully update the row, while the second will receive 0 rows and abort silently.

### 3. Worker Crash Recovery & Idempotency
**Problem:** Node.js serverless functions can crash mid-execution. A standard HTTP hook would leave the step permanently "in-progress". Furthermore, Hasura guarantees *at-least-once* delivery, meaning the same payload could hit our worker twice under network duress.
**Solution:** Postgres acts as our queue. The moment a worker spins up, it attempts to atomically transition the step from `pending` to `in_progress`. If 0 rows are returned, it aborts (meaning another worker took it). If it fails to complete, the Hasura Event Trigger handles exponential backoff and retries, while our cron sweeper catches permanently stalled jobs.

### 4. Zero-Exposure Secret Management
**Problem:** Generated Webhook tokens are highly sensitive and should not be stored in plaintext.
**Solution:** Webhook tokens are generated securely server-side and encrypted at rest in Postgres using `pgcrypto`. The decryption key is scoped via `set_config('app.encryption_key', $1, true)` per-transaction to prevent connection pool leakage. Furthermore, the `trigger_secrets` table is completely untracked from the GraphQL schema, meaning it is impossible for a user to query secrets via the Hasura API.

### 5. Hasura Action Permission Denials
**Problem:** When building the Webhook functionality, custom Actions like `createWebhookTrigger` and `revokeWebhookTrigger` threw `field not found` or `403` errors for logged-in users.
**Solution:** We explicitly granted the `user` role execution permissions inside the Hasura Console for internal actions, and the `public` (anonymous) role permissions for `triggerWorkflowRunWebhook` so external systems (like Stripe) can invoke it without a JWT. We also implemented dual-checks to safely extract `x-hasura-user-id` from either `req.headers` or `req.body.session_variables`.

### 6. Runaway Loop Guard
**Problem:** Because `conditional_branch` steps can route backward or cause recursive loops, a bug in user-configured workflow logic could trigger an infinite loop of step executions.
**Solution:** Our architecture naturally limits execution depth by counting existing `step_runs` for the parent `workflow_run_id` before inserting the next `pending` step, protecting the system from infinite recursions.

## ⚡ Serverless Functions Reference (Actions & Triggers)

### Hasura Actions (GraphQL API)
* **`triggerWorkflowRun`**: Manually kicks off a workflow from the UI by inserting the first pending step.
* **`triggerWorkflowRunWebhook`**: Externally kicks off a workflow by decrypting and authenticating a one-time bearer token.
* **`createWebhookTrigger`**: Generates a secure, cryptographically hashed webhook token and registers it to a workflow.
* **`revokeWebhookTrigger`**: Instantly disables an active webhook trigger.
* **`approveStep`**: Atomically unpauses an `approval_gate` step and queues the next step in the workflow.

### Hasura Event & Cron Triggers (Background Workers)
* **`execute_step` (Event Trigger)**: The database-level tripwire that drives the asynchronous loop; it fires the moment a pending step is inserted to wake up the worker function, execute the task, and queue the next step.
* **`sweepStalledRuns` (Cron Trigger)**: Runs every 15 minutes to automatically fail steps stuck `in_progress` for >1 hour, and time out approvals waiting >7 days.

## ✅ Final Deliverables Checklist

This system demonstrates the exact end-to-end scenario required for a robust multi-tenant architecture:

- [x] **Multi-Tenant Orgs:** Two separate organizations exist, each with their own users and roles.
- [x] **Complex Workflows:** An owner can build a workflow with at least 3 step types, including one `llm_call`, one `http_request`, and one `conditional_branch` that changes behavior based on the LLM's output.
- [x] **Multiple Entrypoints:** The workflow can be started two ways — manually via the UI, and externally via a webhook trigger.
- [x] **Human-in-the-loop:** The workflow includes an `approval_gate` where the run pauses indefinitely, and only an owner/editor in that org can approve it forward.
- [x] **Real-Time UI:** While running, live status streams step-by-step with no refresh, including the paused state.
- [x] **Airtight Isolation:** A logged-in Org B user cannot see, trigger, or approve anything belonging to Org A — even by guessing an ID directly.
