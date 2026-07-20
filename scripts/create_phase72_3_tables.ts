import pg from "pg";

// Phase 72.3 — Revenue Intelligence System.
// Idempotent table bootstrap (CREATE TABLE IF NOT EXISTS) — NOT db:push, which
// wrongly offers to rename the express-session user_sessions table. Safe to run
// repeatedly in dev and as part of post-merge setup for prod.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS revenue_intelligence_events (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revenue_source TEXT NOT NULL,
      event_type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      visitor_id TEXT,
      session_id TEXT,
      user_id TEXT,
      lead_id TEXT,
      order_id TEXT,
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT,
      product_id TEXT,
      product_name TEXT,
      plan_name TEXT,
      page TEXT,
      landing_page TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      device TEXT,
      browser TEXT,
      country TEXT,
      ai_assisted BOOLEAN NOT NULL DEFAULT FALSE,
      concierge_session_id TEXT,
      attribution_model TEXT NOT NULL DEFAULT 'last_touch',
      dedupe_key TEXT,
      metadata JSONB
    );
    CREATE INDEX IF NOT EXISTS revenue_intel_created_at_idx
      ON revenue_intelligence_events (created_at);
    CREATE INDEX IF NOT EXISTS revenue_intel_occurred_at_idx
      ON revenue_intelligence_events (occurred_at);
    CREATE INDEX IF NOT EXISTS revenue_intel_revenue_source_idx
      ON revenue_intelligence_events (revenue_source);
    CREATE INDEX IF NOT EXISTS revenue_intel_event_type_idx
      ON revenue_intelligence_events (event_type);
    CREATE INDEX IF NOT EXISTS revenue_intel_visitor_id_idx
      ON revenue_intelligence_events (visitor_id);
    CREATE INDEX IF NOT EXISTS revenue_intel_session_id_idx
      ON revenue_intelligence_events (session_id);
    CREATE INDEX IF NOT EXISTS revenue_intel_order_id_idx
      ON revenue_intelligence_events (order_id);
    CREATE INDEX IF NOT EXISTS revenue_intel_stripe_session_id_idx
      ON revenue_intelligence_events (stripe_session_id);
    CREATE INDEX IF NOT EXISTS revenue_intel_utm_source_idx
      ON revenue_intelligence_events (utm_source);
    CREATE INDEX IF NOT EXISTS revenue_intel_utm_campaign_idx
      ON revenue_intelligence_events (utm_campaign);
    CREATE INDEX IF NOT EXISTS revenue_intel_product_name_idx
      ON revenue_intelligence_events (product_name);
    CREATE UNIQUE INDEX IF NOT EXISTS revenue_intel_dedupe_key_uq
      ON revenue_intelligence_events (dedupe_key)
      WHERE dedupe_key IS NOT NULL;
  `);

  console.log("Phase 72.3 (Revenue Intelligence) tables created successfully");
  await pool.end();
}

main().catch((err) => {
  console.error("Phase 72.3 table bootstrap failed:", err);
  process.exit(1);
});
