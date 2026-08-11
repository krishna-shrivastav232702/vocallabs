import type { Request, Response } from 'express';
import { Pool } from 'pg';

export default async function handler(req: Request, res: Response) {
  try {
    const dbUrl = `postgres://postgres:${process.env.NHOST_ADMIN_SECRET}@${process.env.NHOST_SUBDOMAIN}.db.${process.env.NHOST_REGION}.nhost.run:5432/local`;
    
    // Wait, in Nhost Cloud the database name is typically the app id or 'postgres' or the subdomain?
    // Let's try 'postgres' first, then 'local', then the subdomain.
    const pool = new Pool({ connectionString: dbUrl });
    const client = await pool.connect();
    
    const result = await client.query('SELECT 1 as success');
    
    client.release();
    return res.json({ success: true, dbUrlLength: dbUrl.length, result: result.rows, url: dbUrl.replace(process.env.NHOST_ADMIN_SECRET!, '***') });
  } catch (err: any) {
    const dbUrl = `postgres://postgres:${process.env.NHOST_ADMIN_SECRET}@${process.env.NHOST_SUBDOMAIN}.db.${process.env.NHOST_REGION}.nhost.run:5432/postgres`;
    try {
      const pool = new Pool({ connectionString: dbUrl });
      const client = await pool.connect();
      const result = await client.query('SELECT 1 as success');
      client.release();
      return res.json({ success: true, dbName: 'postgres', url: dbUrl.replace(process.env.NHOST_ADMIN_SECRET!, '***') });
    } catch(err2: any) {
        const dbUrl2 = `postgres://postgres:${process.env.NHOST_ADMIN_SECRET}@${process.env.NHOST_SUBDOMAIN}.db.${process.env.NHOST_REGION}.nhost.run:5432/${process.env.NHOST_SUBDOMAIN}`;
        try {
            const pool2 = new Pool({ connectionString: dbUrl2 });
            const client2 = await pool2.connect();
            const result2 = await client2.query('SELECT 1 as success');
            client2.release();
            return res.json({ success: true, dbName: process.env.NHOST_SUBDOMAIN, url: dbUrl2.replace(process.env.NHOST_ADMIN_SECRET!, '***') });
        } catch(err3: any) {
            return res.status(400).json({ error: err3.message, stack: err3.stack });
        }
    }
  }
}
