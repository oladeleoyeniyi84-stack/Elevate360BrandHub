import pg from "pg";

// Phase 69 — indexes backing the bounded-read remediation.
// All growing-table reads now filter/sort on a timestamp column (ORDER BY ...
// DESC LIMIT N, or WHERE ts >= cutoff); without indexes those are sequential
// scans on tables that grow forever.
// Idempotent (CREATE INDEX IF NOT EXISTS) — NOT db:push, which wrongly offers
// to rename the express-session user_sessions table. Safe to run repeatedly in
// dev and against prod (Render) as part of deploy setup.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const INDEXES: Array<{ name: string; table: string; column: string }> = [
  { name: "contact_messages_created_at_idx", table: "contact_messages", column: "created_at" },
  { name: "newsletter_subscribers_subscribed_at_idx", table: "newsletter_subscribers", column: "subscribed_at" },
  { name: "lead_magnet_leads_created_at_idx", table: "lead_magnet_leads", column: "created_at" },
  { name: "chat_conversations_updated_at_idx", table: "chat_conversations", column: "updated_at" },
  { name: "bookings_created_at_idx", table: "bookings", column: "created_at" },
  { name: "orders_created_at_idx", table: "orders", column: "created_at" },
];

async function main() {
  for (const idx of INDEXES) {
    await pool.query(
      `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} (${idx.column});`
    );
    console.log(`${idx.name} created (or already present)`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
