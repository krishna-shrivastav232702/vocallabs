import { gql } from 'urql';

// Subscription filtered by workflow_run_id — drives the live run view.
// Subscriptions use the same urql client over a WebSocket connection.
// The workflow_run_id is obtained from the triggerWorkflowRun mutation response.
export const STEP_RUNS_SUBSCRIPTION = gql`
  subscription StepRuns($workflow_run_id: uuid!) {
    step_runs(
      where: { workflow_run_id: { _eq: $workflow_run_id } }
      order_by: { position: asc }
    ) {
      id
      status
      attempt_count
      input
      output
      error
      started_at
      completed_at
      step {
        id
        step_type
        position
        config
      }
    }
  }
`;
