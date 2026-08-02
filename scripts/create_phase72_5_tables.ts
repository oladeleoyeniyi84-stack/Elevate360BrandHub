// Phase 72.5 — Search Growth Operations table bootstrap (idempotent).
// Run: npx tsx scripts/create_phase72_5_tables.ts
// Safe to run repeatedly in dev and production (memory: prod tables are
// bootstrapped via these scripts, never db:push).

import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_growth_actions (
      id SERIAL PRIMARY KEY,
      action_type VARCHAR(48) NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT NOT NULL,
      evidence JSONB NOT NULL,
      target_path VARCHAR(1000),
      target_query VARCHAR(500),
      priority_score INTEGER NOT NULL,
      impact_score INTEGER NOT NULL,
      evidence_score INTEGER NOT NULL,
      relevance_score INTEGER NOT NULL,
      confidence_score INTEGER NOT NULL,
      effort_score INTEGER NOT NULL,
      source_type VARCHAR(32) NOT NULL,
      source_reference VARCHAR(200),
      status VARCHAR(24) NOT NULL DEFAULT 'proposed',
      founder_decision VARCHAR(24),
      decision_note TEXT,
      implementation_note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      approved_at TIMESTAMP,
      completed_at TIMESTAMP,
      dismissed_at TIMESTAMP,
      measurement_start DATE,
      measurement_end DATE,
      baseline_metrics JSONB,
      result_metrics JSONB,
      dedupe_key VARCHAR(300) NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS search_growth_actions_status_idx ON search_growth_actions (status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS search_growth_actions_priority_idx ON search_growth_actions (priority_score)`);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS search_growth_actions_live_dedupe_uq
    ON search_growth_actions (dedupe_key)
    WHERE status IN ('proposed','approved','in_progress')
  `);
  console.log("Phase 72.5 tables ready (search_growth_actions).");
}

main()
  .then(() => pool.end())
  .catch((err) => { console.error("Bootstrap failed:", err); pool.end(); process.exit(1); });
