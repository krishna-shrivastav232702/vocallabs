import {Pool} from 'pg';
import crypto from 'crypto'
import { Request,Response } from 'express';

interface CreateWebhookPayload {
  input: {
    workflow_id: string;
  };
  session_variables?: {
    'x-hasura-user-id'?: string;
    [key: string]: string | undefined;
  };
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

export default async function handler(req:Request,res:Response){
    const body = req.body as CreateWebhookPayload;
    const {workflow_id} = body.input;
    const userId = req.headers['x-hasura-user-id'] || body.session_variables?.['x-hasura-user-id'];
    const client = await pool.connect();
    try{
        await client.query('BEGIN');
        const authCheck = await client.query(
            `SELECT om.role, w.org_id
             FROM workflows w
             JOIN org_members om ON om.org_id = w.org_id
             WHERE w.id = $1 AND om.user_id = $2`,
            [workflow_id,userId]
        )
        if(authCheck.rows.length === 0){
            await client.query('ROLLBACK');
            return res.status(403).json({message:"Not a member of this workflow's org"})
        }
        if (authCheck.rows[0].role !== 'owner') {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Only an owner can create a webhook trigger' });
        }
        
        const token = crypto.randomBytes(32).toString('hex');
        const triggerResult = await client.query(
            `INSERT INTO workflow_triggers (workflow_id, trigger_type, config, enabled)
             VALUES ($1, 'webhook', '{}'::jsonb, true)
             RETURNING id`,
            [workflow_id]
        );
        const triggerId = triggerResult.rows[0].id;
        await client.query(`SELECT set_config('app.encryption_key', $1, true)`, [process.env.SECRET_ENCRYPTION_KEY]);
        await client.query(
            `INSERT INTO trigger_secrets (trigger_id, secret_key, secret_value)
             VALUES ($1, 'webhook_token', pgp_sym_encrypt($2, current_setting('app.encryption_key')))`,
            [triggerId, token]
        );
        await client.query('COMMIT');
        return res.json({trigger_id:triggerId,token});
    }catch(err){
        await client.query('ROLLBACK');
        console.error(err);
            return res.status(500).json({message:'Internal error creating webhook trigger'});
    }finally{
        client.release();
    }
}