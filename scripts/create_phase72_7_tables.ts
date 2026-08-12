// Phase 72.7 — Stripe webhook idempotency ledger bootstrap (idempotent).
// Run: npx tsx scripts/create_phase72_7_tables.ts
// Safe to run repeatedly in dev and production (memory: prod tables are
// bootstrapped via these scripts, never db:push).
//
// Table stores ONLY the Stripe event id/type/livemode and a redacted result.
// Never card data, payment-method payloads, customer objects, signatures,
// secrets, or raw event payloads.

import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_processed_events (
      event_id VARCHAR(255) PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      livemode BOOLEAN NOT NULL,
      processed_at TIMESTAMP NOT NULL DEFAULT now(),
      result VARCHAR(40),
      metadata JSONB
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS stripe_processed_events_processed_at_idx
    ON stripe_processed_events (processed_at)
  `);
  // Lifecycle-ordering column: Stripe event `created` timestamp of the newest
  // event applied to a subscription row (rejects stale out-of-order updates).
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMP`);
  console.log("Phase 72.7 tables ready: stripe_processed_events + subscriptions.last_event_at");
}

main()
  .catch((e) => {
    console.error("Phase 72.7 table bootstrap failed:", e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
