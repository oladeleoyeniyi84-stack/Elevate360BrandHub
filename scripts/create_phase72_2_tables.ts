import pg from "pg";

// Phase 72.2 — Strategy Session Funnel Analytics.
// Idempotent table bootstrap (CREATE TABLE IF NOT EXISTS) — NOT db:push, which
// wrongly offers to rename the express-session user_sessions table. Safe to run
// repeatedly in dev and as part of post-merge setup for prod.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS strategy_funnel_events (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      session_id TEXT,
      visitor_id TEXT,
      event_name TEXT NOT NULL,
      page TEXT,
      referrer TEXT,
      source TEXT,
      medium TEXT,
      campaign TEXT,
      device TEXT,
      browser TEXT,
      metadata JSONB
    );
    CREATE INDEX IF NOT EXISTS strategy_funnel_events_created_at_idx
      ON strategy_funnel_events (created_at);
    CREATE INDEX IF NOT EXISTS strategy_funnel_events_event_name_idx
      ON strategy_funnel_events (event_name);
    CREATE INDEX IF NOT EXISTS strategy_funnel_events_session_id_idx
      ON strategy_funnel_events (session_id);
    CREATE INDEX IF NOT EXISTS strategy_funnel_events_visitor_id_idx
      ON strategy_funnel_events (visitor_id);
  `);

  console.log("Phase 72.2 (Strategy Funnel Analytics) tables created successfully");
  await pool.end();
}

main().catch((err) => {
  console.error("Phase 72.2 table bootstrap failed:", err);
  process.exit(1);
});
