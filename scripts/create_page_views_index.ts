import pg from "pg";

// Memory-fix follow-up — index for the bounded page-view queries.
// getPageViews(days) now filters and sorts on page_views.created_at; without an
// index this is a sequential scan on a table that grows with every visit.
// Idempotent (CREATE INDEX IF NOT EXISTS) — NOT db:push, which wrongly offers to
// rename the express-session user_sessions table. Safe to run repeatedly in dev
// and against prod (Render) as part of deploy setup.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE INDEX IF NOT EXISTS page_views_created_at_idx
      ON page_views (created_at);
  `);
  console.log("page_views_created_at_idx created (or already present)");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
