import pg from "pg";

// Phase 72.1 — Homepage Analytics.
// Idempotent table bootstrap (CREATE TABLE IF NOT EXISTS) — NOT db:push, which
// wrongly offers to rename the express-session user_sessions table. Safe to run
// repeatedly in dev and as part of post-merge setup for prod.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS homepage_events (
      id SERIAL PRIMARY KEY,
      event TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS homepage_events_created_at_idx
      ON homepage_events (created_at);
    CREATE INDEX IF NOT EXISTS homepage_events_event_idx
      ON homepage_events (event);
  `);

  console.log("Phase 72.1 (Homepage Analytics) tables created successfully");
  await pool.end();
}

main().catch((err) => {
  console.error("Phase 72.1 table bootstrap failed:", err);
  process.exit(1);
});
