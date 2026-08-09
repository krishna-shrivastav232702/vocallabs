import { Pool } from "pg";
import type { Request,Response } from "express";

const pool = new Pool({
    connectionString : process.env.DATABASE_URL
});

export default async function handler(req:Request,res:Response){
    const {input,session_variables} = req.body;
    const workflowId = input.workflow_id;
    const userId = session_variables['x-hasura-user-id'];

    if(!userId){
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const client = await pool.connect();

    try{
        await client.query('BEGIN');
        const workflowQuery = await client.query(`
            SELECT w.org_id,
                om.role,
                (SELECT id FROM steps WHERE workflow_id = w.id ORDER BY position ASC LIMIT 1 ) as first_step_id
            FROM workflows w
            JOIN org_members om ON om.org_id = w.org_id AND om.user_id = $1
            WHERE w.id = $2
        `,[userId,workflowId]);

        if(workflowQuery.rows.length === 0){
            await client.query('ROLLBACK');
            return res.status(404).json({
                success:false,
                message: "Workflow not found or access is denied"
            });
        }

        const {
            org_id: orgId,
            role: userRole,
            first_step_id : firstStepId
        } = workflowQuery.rows[0];

        if(userRole !== 'owner' && userRole !== 'editor'){
            await client.query('ROLLBACK');
            return res.status(403).json({
                success:false,
                message:"Forbidden: Only owners/editors can trigger runs"
            });
        }

        if(!firstStepId){
            await client.query('ROLLBACK');
            return res.status(400).json({
                success:false,
                message:"This workflow has no steps. Create steps before triggering."
            })
        }

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
                RETURNING id,quota_usage,quota_limit;
        `,[orgId]);

        if(quotaQuery.rows.length === 0){
            await client.query('ROLLBACK');
            return res.status(429).json({
                success:false,
                message : "Quota exhausted. Upgrade your plan"
            })
        }

        const runInsert = await client.query(`
            INSERT INTO workflow_runs (workflow_id,org_id,triggered_by_user,status)
            VALUES ($1, $2, $3,'in_progress)
            RETURNING id
        `,[workflowId,orgId,userId]);

        const runId = runInsert.rows[0].id;

        await client.query(`
            INSERT INTO step_runs(workflow_run_id,step_id,status)
            VALUES ($1,$2,'pending)
        `,[runId,firstStepId]);

        await client.query('COMMIT');

        return res.status(200).json({
            success:true,
            workflow_run_id: runId,
            message: "Workflow started successfully"
        });
    } catch (error){
        await client.query('ROLLBACK');
        console.error("Action error:",error);
        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }finally{
        client.release();
    }
}