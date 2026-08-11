import type { Request, Response } from 'express';
import { Pool } from 'pg';

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.NHOST_ADMIN_SECRET && process.env.NHOST_SUBDOMAIN && process.env.NHOST_REGION) {
    const region = process.env.NHOST_REGION.replace(/-(\d)$/, '$1'); // e.g. ap-south-1 -> ap-south1
    return `postgres://postgres:${process.env.NHOST_ADMIN_SECRET}@${process.env.NHOST_SUBDOMAIN}.db.${region}.nhost.run:5432/${process.env.NHOST_SUBDOMAIN}`;
  }
  return undefined;
}

const pool = new Pool({ connectionString: getDbUrl() });
const EDITOR_RESTRICTED_STEP_TYPES = ['db_write', 'notify'];

export default async function handler(req: Request, res: Response) {
  if (!req.body) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  const { input, session_variables } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  const { workflow_id, org_id, name, steps = [], triggers = [] } = input;
  const userId =
    session_variables?.['x-hasura-user-id'] ||
    (req.headers['x-hasura-user-id'] as string | undefined);

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (triggers.some((t: any) => t.trigger_type === 'webhook')) {
    return res.status(400).json({ message: 'Use createWebhookTrigger for webhook triggers' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    let targetOrgId = org_id;
    let targetWorkflowId = workflow_id;

    if (targetWorkflowId) {
      const existing = await client.query(`SELECT org_id FROM workflows WHERE id = $1`, [targetWorkflowId]);
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Workflow not found' });
      }
      targetOrgId = existing.rows[0].org_id;
    }

    const authCheck = await client.query(
      `SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2`,
      [targetOrgId, userId]
    );
    if (authCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Not a member of this org' });
    }
    const role = authCheck.rows[0].role;
    if (!['owner', 'editor'].includes(role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Viewers cannot edit workflows' });
    }

    if (role === 'editor' && steps.some((s: any) => EDITOR_RESTRICTED_STEP_TYPES.includes(s.step_type))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Editors cannot add db_write or notify steps' });
    }
    if (targetWorkflowId) {
      await client.query(`UPDATE workflows SET name = $1, updated_at = NOW() WHERE id = $2`, [name, targetWorkflowId]);
    } else {
      const created = await client.query(
        `INSERT INTO workflows (org_id, name, created_by) VALUES ($1, $2, $3) RETURNING id`,
        [targetOrgId, name, userId]
      );
      targetWorkflowId = created.rows[0].id;
    }

    const keepStepIds = steps.filter((s: any) => s.id).map((s: any) => s.id);
    await client.query(
      `DELETE FROM steps WHERE workflow_id = $1 AND id != ALL($2::uuid[])`,
      [targetWorkflowId, keepStepIds.length ? keepStepIds : ['00000000-0000-0000-0000-000000000000']]
    );
    for (const s of steps) {
      if (s.id) {
        await client.query(
          `UPDATE steps SET step_type = $1, position = $2, config = $3 WHERE id = $4 AND workflow_id = $5`,
          [s.step_type, s.position, JSON.stringify(s.config), s.id, targetWorkflowId]
        );
      } else {
        await client.query(
          `INSERT INTO steps (workflow_id, step_type, position, config) VALUES ($1, $2, $3, $4)`,
          [targetWorkflowId, s.step_type, s.position, JSON.stringify(s.config)]
        );
      }
    }

    const keepTriggerIds = triggers.filter((t: any) => t.id).map((t: any) => t.id);
    await client.query(
      `DELETE FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type != 'webhook' AND id != ALL($2::uuid[])`,
      [targetWorkflowId, keepTriggerIds.length ? keepTriggerIds : ['00000000-0000-0000-0000-000000000000']]
    );
    for (const t of triggers) {
      if (t.id) {
        await client.query(
          `UPDATE workflow_triggers SET config = $1, enabled = $2 WHERE id = $3 AND workflow_id = $4`,
          [JSON.stringify(t.config), t.enabled, t.id, targetWorkflowId]
        );
      } else {
        await client.query(
          `INSERT INTO workflow_triggers (workflow_id, trigger_type, config, enabled) VALUES ($1, $2, $3, $4)`,
          [targetWorkflowId, t.trigger_type, JSON.stringify(t.config), t.enabled]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({ workflow_id: targetWorkflowId });
  } catch (err: any) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error(err);
    return res.status(400).json({ message: 'Internal error saving workflow' });
  } finally {
    if (client) {
      client.release();
    }
  }
}