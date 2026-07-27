import pg from "pg";

// Phase 72.4 — Search Intelligence & Authority Platform.
// Idempotent table bootstrap (CREATE TABLE IF NOT EXISTS) — NOT db:push, which
// wrongly offers to rename the express-session user_sessions table. Safe to run
// repeatedly in dev and as part of post-merge setup for prod.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_intelligence_events (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      event_name TEXT NOT NULL,
      traffic_source TEXT,
      referrer_host TEXT,
      landing_path TEXT,
      content_slug TEXT,
      content_type TEXT,
      read_percent INTEGER,
      dwell_seconds INTEGER,
      share_channel TEXT,
      session_id TEXT,
      visitor_id TEXT,
      page TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      device TEXT,
      browser TEXT,
      dedupe_key TEXT,
      metadata JSONB
    );
    CREATE INDEX IF NOT EXISTS search_intel_created_at_idx
      ON search_intelligence_events (created_at);
    CREATE INDEX IF NOT EXISTS search_intel_event_name_idx
      ON search_intelligence_events (event_name);
    CREATE INDEX IF NOT EXISTS search_intel_traffic_source_idx
      ON search_intelligence_events (traffic_source);
    CREATE INDEX IF NOT EXISTS search_intel_session_id_idx
      ON search_intelligence_events (session_id);
    CREATE INDEX IF NOT EXISTS search_intel_visitor_id_idx
      ON search_intelligence_events (visitor_id);
    CREATE INDEX IF NOT EXISTS search_intel_content_slug_idx
      ON search_intelligence_events (content_slug);
    CREATE INDEX IF NOT EXISTS search_intel_utm_campaign_idx
      ON search_intelligence_events (utm_campaign);
    CREATE UNIQUE INDEX IF NOT EXISTS search_intel_dedupe_key_uq
      ON search_intelligence_events (dedupe_key)
      WHERE dedupe_key IS NOT NULL;
  `);

  console.log("Phase 72.4 (Search Intelligence) tables created successfully");
  await pool.end();
}

main().catch((err) => {
  console.error("Phase 72.4 table bootstrap failed:", err);
  process.exit(1);
});
