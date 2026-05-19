import { pool } from "@workspace/db";

let ensurePromise: Promise<void> | undefined;

async function createOrUpdateAnalysesTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analyses (
      id serial PRIMARY KEY,
      input text NOT NULL,
      input_type text NOT NULL DEFAULT 'unknown',
      network text NOT NULL DEFAULT 'mainnet',
      summary text NOT NULL,
      verdict text NOT NULL DEFAULT 'caution',
      verdict_reason text NOT NULL DEFAULT '',
      risk_score integer NOT NULL DEFAULT 0,
      risk_level text NOT NULL DEFAULT 'low',
      warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
      positives jsonb NOT NULL DEFAULT '[]'::jsonb,
      details jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      hall_of_shame boolean NOT NULL DEFAULT false,
      hall_of_shame_label text
    );
  `);

  await pool.query(`
    ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS input text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS input_type text NOT NULL DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS network text NOT NULL DEFAULT 'mainnet',
      ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS verdict text NOT NULL DEFAULT 'caution',
      ADD COLUMN IF NOT EXISTS verdict_reason text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS risk_score integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'low',
      ADD COLUMN IF NOT EXISTS warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS positives jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS details jsonb,
      ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS hall_of_shame boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS hall_of_shame_label text;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS analyses_created_at_idx ON analyses (created_at DESC);
    CREATE INDEX IF NOT EXISTS analyses_hall_of_shame_idx ON analyses (hall_of_shame);
  `);
}

export async function ensureAnalysesSchema(): Promise<void> {
  ensurePromise ??= createOrUpdateAnalysesTable().catch((error) => {
    ensurePromise = undefined;
    throw error;
  });

  return ensurePromise;
}
