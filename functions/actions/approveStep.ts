import { Pool } from "pg";
import { Request,Response } from "express";

interface ApproveStepPlayload{
    input:{
        step_run_id: string;
    };
    session_variables?:{
        'x-hasura-user-id'?:string;
    };
}


const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});


export default async function handler(req:Request,res:Response){
    const body = req.body as ApproveStepPlayload;
    const { step_run_id } = body.input;
    const userId = body.session_variables?.['x-hasura-user-id'] || req.headers['x-hasura-user-id'];
    if(!userId){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }
    const client = await pool.connect();
    try{
        await client.query('BEGIN');
        const authCheck = await client.query(
            `SELECT om.role
             FROM step_runs sr
             JOIN workflow_runs wr ON wr.id = sr.workflow_run_id
             JOIN org_members om ON om.org_id = wr.org_id
             WHERE sr.id = $1 AND om.user_id = $2`,
             [step_run_id,userId]
        );
        if(authCheck.rows.length === 0){
            await client.query('ROLLBACK');
            return res.status(403).json({
                message: 'Not authorized for this run'
            })
        }
        if(!['owner','editor'].includes(authCheck.rows[0].role)){
            await client.query('ROLLBACK');
            return res.status(403).json({message:"Viewers cannot approve"});
        }
        const approval = await client.query(
            `UPDATE step_runs
             SET status = 'completed', approved_by = $1, approved_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND status = 'paused_awaiting_approval'
             RETURNING *
            `,
            [userId, step_run_id]
        );
        if (approval.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Already approved or not awaiting approval' });
        }
        const stepRun = approval.rows[0];
        const step = await client.query(`SELECT * FROM steps WHERE id = $1`, [stepRun.step_id]);

        await client.query(`UPDATE workflow_runs SET status = 'in_progress' WHERE id = $1`, [stepRun.workflow_run_id]);
        const nextStep = await client.query(
            `SELECT id FROM steps WHERE workflow_id = $1 AND position > $2 ORDER BY position ASC LIMIT 1`,
            [stepRun.workflow_id, step.rows[0].position]
        );
        if (nextStep.rows.length > 0) {
            await client.query(
                `INSERT INTO step_runs (workflow_run_id, step_id, status) VALUES ($1, $2, 'pending')`,
                [stepRun.workflow_run_id, nextStep.rows[0].id]
            );
        } else {
            await client.query(
                `UPDATE workflow_runs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
                [stepRun.workflow_run_id]
            );
        }
        await client.query('COMMIT');
        return res.json({ success: true, message: 'Approved and resumed' });
    }catch(error:any){
        await client.query('ROLLBACK').catch(() => {});
        return res.status(500).json({ message: 'Internal error approving step' });
    }finally{
        client.release();
    }
}