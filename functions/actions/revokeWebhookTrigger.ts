import {Pool} from "pg";
import {Request,Response} from "express"

const pool = new Pool({connectionString: process.env.DATABASE_URL});

export default async function handler(req:Request,res:Response){
    const {trigger_id} = req.body.input;
    const userId = req.headers['x-hasura-user-id'] || req.body.session_variables?.['x-hasura-user-id'];
    const client = await pool.connect();
    try{
        const authCheck = await client.query(
            `SELECT om.role
             FROM workflow_triggers wt
             JOIN workflows w ON w.id = wt.workflow_id
             JOIN org_members om ON om.org_id = w.org_id
             WHERE wt.id = $1 AND om.user_id = $2`,
             [trigger_id, userId]
        );
        if(authCheck.rows.length === 0){
            return res.status(403).json({ message: "Not a member of this trigger's org" });
        }
        if (authCheck.rows[0].role !== 'owner') {
            return res.status(403).json({ message: 'Only an owner can revoke a webhook trigger' });
        }
        const result = await client.query(
            `UPDATE workflow_triggers SET enabled = false
             WHERE id = $1 AND trigger_type = 'webhook' RETURNING id`,
             [trigger_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Webhook trigger not found' });
        }
        return res.json({ success: true });
    }catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal error revoking trigger' });
    } finally {
        client.release();
    }
}