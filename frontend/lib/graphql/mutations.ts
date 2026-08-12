import { gql } from 'urql';

// All Actions are standard GraphQL mutations via Hasura — frontend never calls
// Node handler URLs directly (documented in backend.md §6).

export const CREATE_ORG = gql`
  mutation CreateOrg($name: String!) {
    insert_organizations_one(
      object: {
        name: $name
        org_members: { data: [{ role: "owner" }] }
      }
    ) {
      id
      name
    }
  }
`;

export const SAVE_WORKFLOW = gql`
  mutation SaveWorkflow(
    $workflow_id: uuid
    $org_id: uuid!
    $name: String!
    $steps: [StepInput!]!
    $triggers: [NonWebhookTriggerInput!]!
  ) {
    saveWorkflow(
      workflow_id: $workflow_id
      org_id: $org_id
      name: $name
      steps: $steps
      triggers: $triggers
    ) {
      workflow_id
    }
  }
`;

export const TRIGGER_WORKFLOW_RUN = gql`
  mutation TriggerWorkflowRun($workflow_id: uuid!) {
    triggerWorkflowRun(workflow_id: $workflow_id) {
      workflow_run_id
    }
  }
`;

export const APPROVE_STEP = gql`
  mutation ApproveStep($step_run_id: uuid!) {
    approveStep(step_run_id: $step_run_id) {
      success
    }
  }
`;

// Returns the webhook token ONCE — show it to the user immediately and
// never again. Backend uses crypto.timingSafeEqual for token comparison.
export const CREATE_WEBHOOK_TRIGGER = gql`
  mutation CreateWebhookTrigger($workflow_id: uuid!) {
    createWebhookTrigger(workflow_id: $workflow_id) {
      trigger_id
      token
    }
  }
`;

export const REVOKE_WEBHOOK_TRIGGER = gql`
  mutation RevokeWebhookTrigger($trigger_id: uuid!) {
    revokeWebhookTrigger(trigger_id: $trigger_id) {
      ok
    }
  }
`;
