import { pool } from "@workspace/db";

let ensurePromise: Promise<void> | undefined;

async function checkAnalysesTable(): Promise<void> {
  await pool.query(`
    SELECT id, public_id, input, input_type, network, summary, verdict,
      verdict_reason, risk_score, risk_level, warnings, positives, details,
      created_at, hall_of_shame, hall_of_shame_label
    FROM analyses LIMIT 0
  `);
  // Bearer result IDs must remain unique; a legacy schema is not repaired at runtime.
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attname = 'public_id'
      WHERE i.indrelid = 'analyses'::regclass
        AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
        AND i.indnkeyatts = 1 AND i.indkey[0] = a.attnum
        AND i.indexprs IS NULL
        AND (i.indpred IS NULL OR pg_get_expr(i.indpred, i.indrelid) = '(public_id IS NOT NULL)')
    ) AS ready
  `);
  if (result.rows[0]?.ready !== true) throw new Error("analysis_schema_not_ready");
}

export async function runAnalysisRetentionCleanup(): Promise<number> {
  const configuredDays = Number.parseInt(process.env.SIGIL_ANALYSIS_RETENTION_DAYS ?? "30", 10);
  const retentionDays = Number.isFinite(configuredDays) ? Math.min(365, Math.max(1, configuredDays)) : 30;
  const result = await pool.query(
    `DELETE FROM analyses
       WHERE hall_of_shame = false
         AND created_at < now() - ($1 * interval '1 day')`,
    [retentionDays],
  );
  return result.rowCount ?? 0;
}

export async function ensureAnalysesSchema(): Promise<void> {
  ensurePromise ??= checkAnalysesTable().catch((error) => {
    ensurePromise = undefined;
    throw error;
  });

  return ensurePromise;
}
