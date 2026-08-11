import { gql } from 'urql';

// ─── Org / user queries ────────────────────────────────────────────────────────

// Fetch all orgs the current user belongs to (drives the OrgSwitcher).
// Hasura row permissions automatically filter to orgs where the user is a member.
export const GET_MY_ORGS = gql`
  query GetMyOrgs($userId: uuid!) {
    organizations {
      id
      name
      quota_limit
      quota_usage
      org_members(where: { user_id: { _eq: $userId } }) {
        role
      }
    }
  }
`;

// ─── Workflows ────────────────────────────────────────────────────────────────

export const GET_WORKFLOWS = gql`
  query GetWorkflows($org_id: uuid!) {
    workflows(
      where: { org_id: { _eq: $org_id } }
      order_by: { updated_at: desc }
    ) {
      id
      name
      created_at
      updated_at
      steps {
        id
      }
      workflow_triggers {
        id
        trigger_type
        enabled
        config
      }
      runs: workflow_runs(order_by: { started_at: desc }, limit: 1) {
        id
        status
        started_at
        completed_at
        step_runs(
          order_by: { step: { position: desc } }
          limit: 1
        ) {
          status
          step {
            position
            step_type
          }
        }
      }
    }
  }
`;

export const GET_WORKFLOW = gql`
  query GetWorkflow($id: uuid!) {
    workflows_by_pk(id: $id) {
      id
      name
      org_id
      created_at
      updated_at
      steps(order_by: { position: asc }) {
        id
        step_type
        position
        config
      }
      workflow_triggers {
        id
        trigger_type
        enabled
        config
      }
    }
  }
`;

// ─── Workflow runs ────────────────────────────────────────────────────────────

export const GET_WORKFLOW_RUN = gql`
  query GetWorkflowRun($id: uuid!) {
    workflow_runs_by_pk(id: $id) {
      id
      status
      started_at
      completed_at
      workflow {
        id
        name
        org_id
        steps(order_by: { position: asc }) {
          id
          step_type
          position
          config
        }
      }
    }
  }
`;
