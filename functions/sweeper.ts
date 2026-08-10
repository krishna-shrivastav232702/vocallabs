import type { Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
 
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SWEEPER_SECRET = process.env.SWEEPER_SHARED_SECRET || '';

export default async function(req:Request,res:Response){
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method not allowed' });
    }
    const provided = req.headers['x-sweeper-secret'];
    const a = Buffer.from(String(provided ?? ''));
    const b = Buffer.from(SWEEPER_SECRET);
    if (!SWEEPER_SECRET || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    const client = await pool.connect();
    try{
        const { rows } = await client.query('SELECT run_sweeper() AS summary;');
        const summary = rows[0].summary;
        if (summary.failed_steps > 0 || summary.failed_pending_steps > 0 || summary.timed_out_steps > 0 || summary.orgs_quota_reset > 0) {
            console.log('[sweeper]', JSON.stringify(summary));
        }
        return res.status(200).json({ ok: true, summary });
    }catch (err) {
        console.error('[sweeper] failed', err);
        return res.status(500).json({ ok: false, error: 'sweeper run failed' });
    }finally {
        client.release();
    }
}