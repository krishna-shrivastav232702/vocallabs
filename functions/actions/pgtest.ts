import type { Request, Response } from 'express';
import { Pool } from 'pg';

export default async function handler(req: Request, res: Response) {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    // Check if pg can insert an object directly into a jsonb parameter
    const obj = { foo: 'bar' };
    const result = await client.query('SELECT $1::jsonb as json_test', [obj]);
    
    client.release();
    return res.json({ success: true, dbUrlLength: process.env.DATABASE_URL?.length, result: result.rows });
  } catch (err: any) {
    return res.status(400).json({ error: err.message, stack: err.stack, hasDbUrl: !!process.env.DATABASE_URL });
  }
}
