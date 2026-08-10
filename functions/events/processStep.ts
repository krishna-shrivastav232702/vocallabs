import { Pool, PoolClient } from "pg"
import {z} from "zod";
import { Request,Response, text } from "express";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});
const MAX_ATTEMPTS = 3;
const RETRYABLE_TYPES = ['llm_call','http_request'];
const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const ALLOWED_TABLES = ['results'];

const StepConfigSchema = z.discriminatedUnion('step_type',[
    z.object({ step_type: z.literal('db_write'),table: z.string(),columns: z.record(z.string(),z.unknown())}),
    z.object({ step_type: z.literal('http_request'),url:z.string().url(),method:z.enum(['GET', 'POST', 'PUT'])}),
    z.object({ step_type: z.literal('llm_call'), prompt_template: z.string(), model: z.string() }),
    z.object({
    step_type: z.literal('conditional_branch'),
    condition: z.object({
      field: z.string(),
      operator: z.enum(['eq', 'contains', 'gt']),
      value: z.union([z.string(), z.number()]),
    }),
    on_true_position: z.number().int(),
    on_false_position: z.number().int(),
  }),
   z.object({ step_type: z.literal('approval_gate') }),
   z.object({ step_type: z.literal('notify'), channel: z.enum(['slack', 'email']), target: z.string() }),
]);

async function getDecryptedSecrets(client:PoolClient,stepId:string,):Promise<Record<string,string>>{
  await client.query(`SELECT set_config('app.encryption_key', $1, true)`,[process.env.SECRET_ENCRYPTION_KEY]);
  const rows = await client.query(
    `SELECT secret_key, pgp_sym_decrypt(secret_value,current_setting('app.encryption_key')) AS val
     FROM step_secrets WHERE step_id = $1`,
     [stepId]
  );
  return Object.fromEntries(rows.rows.map((r) => [r.secret_key,r.val]));
}

export default async function handler(req:Request,res:Response){
  const stepRunId = req.body.event?.data?.new?.id;
  if(!stepRunId) return res.status(400).json({error:"Missing step_run id "});
  const client = await pool.connect();
  let currentStepRun;
  try{
    const claim = await client.query(`
      UPDATE step_runs SET status = 'in_progress',updated_at = NOW()
      WHERE id = $1 AND status = 'pending' RETURNING *  
    `,[stepRunId]
    );
    if(claim.rows.length === 0){
      return res.status(200).json({message:"Already claimed or not pending"});
    }
    currentStepRun = claim.rows[0];

    const stepQuery = await client.query(`SELECT * FROM steps WHERE id = $1`,[currentStepRun.step_id]);
    const step = stepQuery.rows[0];

    const parsedConfig = StepConfigSchema.parse({step_type: step.step_type,...step.config}); //check step.step_config
    let outputData: any = null;

    try{
      switch(parsedConfig.step_type){
        case 'approval_gate':{
          await client.query(`UPDATE step_runs SET status = 'paused_awaiting_approval' WHERE id = $1`,[stepRunId]);
          await client.query(`UPDATE workflow_runs SET status = 'paused' WHERE id = $1`,[currentStepRun.workflow_run_id]);
          return res.status(200).json({message:"workflow paused at approval gate"});
        }
        case 'http_request':{
          const secrets = await getDecryptedSecrets(client,step.id);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(),10000);
          try{
            const fetchRes = await fetch(parsedConfig.url,{
              method: parsedConfig.method,
              headers: secrets.authorization ? {Authorization: secrets.authorization}: undefined,
              signal: controller.signal,
            });
            if(!fetchRes.ok){
              throw new Error(`HTTP ${fetchRes.status} :  ${await fetchRes.text()}`);
            }
            outputData = await fetchRes.json();
          }finally{
            clearTimeout(timeoutId);
          }
          break;
        }
        case 'llm_call': {
          const secrets = await getDecryptedSecrets(client,step.id);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(),15000);
          try{
            
          }finally{
            clearTimeout(timeoutId);
          }
          break;
        }
        case 'db_write':{
          const {table, columns} = parsedConfig;
          if(!ALLOWED_TABLES.includes(table) || !IDENTIFIER_RE.test(table)){
            throw new Error(`Table "${table}" is not writable`);
          }
          const cols = Object.keys(columns);
          if(cols.some((c) => !IDENTIFIER_RE.test(c))) throw new Error('Invalid column name');
          const values = Object.values(columns);
          const placeholders = values.map((_,i) => `$${i+1}`).join(', ');
          const insertSql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
          const result = await client.query(insertSql,values);
          outputData = result.rows[0];
          break;
        }
        case 'notify': {
          const secrets = await getDecryptedSecrets(client,step.id);
          if(parsedConfig.channel === 'slack' && secrets.webhook_url){
            await fetch(secrets.webhook_url,{
              method:'POST',
              headers: {
                'Content-Type' : 'application/json'
              },
              body: JSON.stringify({text: `Workflow notifications ${parsedConfig.target}`}),
            })
          }
          outputData = {
            notified: true,
            channel: parsedConfig.channel
          };
          break;
        }
        case 'conditional_branch':{
          const prev = await client.query(
            `SELECT sr.output FROM step_runs sr
             JOIN steps s ON s.id = sr.step_id
             WHERE sr.workflow_run_id = $1 AND s.workflow_id = $2 AND s.position < $3
             ORDER BY s.position DESC LIMIT 1`,
            [currentStepRun.workflow_run_id,step.workflow_id,step.position]
          )
          const prevOutput = prev.rows[0]?.output ?? {};
          const {field,operator,value} = parsedConfig.condition;
          const fieldVal = prevOutput?.[field];
          let matched = false;
          if(operator === 'eq') matched = fieldVal === value;
          if(operator === 'contains') matched = String(fieldVal ?? '').includes(String(value));
          if (operator === 'gt') matched = Number(fieldVal) > Number(value);
          outputData = {
            matched,next_position:matched ? parsedConfig.on_true_position : parsedConfig.on_false_position
          };
          break;
        }
      }
    }catch(execErr: any){
      if(RETRYABLE_TYPES.includes(step.step_type) && currentStepRun.attempt_count < MAX_ATTEMPTS - 1){
        await client.query(
          `UPDATE step_runs SET status = 'pending',attempt_count = attempt_count + 1,error = $1,updated_at = NOW() WHERE id = $2`,
          [execErr.message,stepRunId]
        );
        // return res.status(200).json({ message: 'Retrying', attempt: currentStepRun.attempt_count + 1 });
        return res.status(500).json({ error: 'Step failed, triggering Hasura retry' });
      }
      throw execErr;
    }
    
    await client.query('BEGIN');
    await client.query(
      `UPDATE step_runs SET status = 'completed',output = $1,updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(outputData),stepRunId]
    );

    let nextStepQuery;
    if(step.step_type === 'conditional_branch'){
      nextStepQuery = await client.query(
        `SELECT id FROM steps WHERE workflow_id = $1 AND position = $2`,
        [step.workflow_id,outputData.next_position]
      );
    }else{
      nextStepQuery = await client.query(
        `SELECT id FROM steps WHERE workflow_id = $1 AND position > $2 ORDER BY position ASC LIMIT 1`,
        [step.workflow_id,step.position]
      );
    }

    if (nextStepQuery.rows.length > 0) {
      await client.query(
        `INSERT INTO step_runs (workflow_run_id, step_id, status) VALUES ($1, $2, 'pending')`,
        [currentStepRun.workflow_run_id, nextStepQuery.rows[0].id]
      );
    } else {
      await client.query(
        `UPDATE workflow_runs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [currentStepRun.workflow_run_id]
      );
    }
    await client.query('COMMIT');
    return res.status(200).json({success: true});
  }catch(error:any){
    await client.query('ROLLBACK').catch(() => {});
    console.error('Worker Error:', error);
    if (currentStepRun) {
      await client.query(
        `UPDATE step_runs SET status = 'failed', error = $1, updated_at = NOW() WHERE id = $2`,
        [error.message, stepRunId]
      );
      await client.query(`UPDATE workflow_runs SET status = 'failed' WHERE id = $1`, [currentStepRun.workflow_run_id]);
    }
    return res.status(500).json({ error: error.message });
  }finally{
    client.release();
  }
}