import { Pool } from "pg";
import type { Request, Response } from "express";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export default async function handler(req: Request, res: Response) {
    const { input } = req.body;
    const { trigger_id, token } = input;

    if (!trigger_id || !token) {
        return res.status(400).json({
            success: false,
            message: "Missing trigger_id or token"
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        // 1. Set encryption key for decryption
        await client.query(`SELECT set_config('app.encryption_key', $1, true)`, [process.env.SECRET_ENCRYPTION_KEY]);

        // 2. Validate token and get workflow_id
        const authQuery = await client.query(`
            SELECT t.workflow_id
            FROM trigger_secrets ts
            JOIN workflow_triggers t ON t.id = ts.trigger_id
            WHERE ts.trigger_id = $1 
              AND ts.secret_key = 'webhook_token'
              AND t.enabled = true
              AND pgp_sym_decrypt(ts.secret_value, current_setting('app.encryption_key')) = $2
        `, [trigger_id, token]);

        if (authQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid trigger_id or token, or trigger is disabled"
            });
        }

        const workflowId = authQuery.rows[0].workflow_id;

        // 3. Get workflow details and first step
        const workflowQuery = await client.query(`
            SELECT w.org_id,
                (SELECT id FROM steps WHERE workflow_id = w.id ORDER BY position ASC LIMIT 1) as first_step_id
            FROM workflows w
            WHERE w.id = $1
        `, [workflowId]);

        if (workflowQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Workflow not found"
            });
        }

        const {
            org_id: orgId,
            first_step_id: firstStepId
        } = workflowQuery.rows[0];

        if (!firstStepId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "This workflow has no steps. Create steps before triggering."
            });
        }

        // 4. Check Quota
        const quotaQuery = await client.query(`
            UPDATE organizations
            SET 
                quota_usage = CASE WHEN 
                                    NOW() >= quota_reset_at THEN 1 ELSE quota_usage + 1 END,
                quota_reset_at = CASE WHEN
                                        NOW() >= quota_reset_at THEN NOW() + INTERVAL '1 month'
                                    ELSE quota_reset_at
                                 END
                WHERE id = $1 AND (quota_usage < quota_limit OR NOW() >= quota_reset_at)
                RETURNING id, quota_usage, quota_limit;
        `, [orgId]);

        if (quotaQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(429).json({
                success: false,
                message: "Quota exhausted. Upgrade your plan"
            });
        }

        // 5. Insert Run (triggered_by_user is NULL for webhook)
        const runInsert = await client.query(`
            INSERT INTO workflow_runs (workflow_id, org_id, triggered_by_user, status)
            VALUES ($1, $2, NULL, 'in_progress')
            RETURNING id
        `, [workflowId, orgId]);

        const runId = runInsert.rows[0].id;

        // 6. Insert first step
        await client.query(`
            INSERT INTO step_runs(workflow_run_id, step_id, status)
            VALUES ($1, $2, 'pending')
        `, [runId, firstStepId]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            workflow_run_id: runId,
            message: "Workflow started successfully via Webhook"
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Webhook Action error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    } finally {
        client.release();
    }
}
