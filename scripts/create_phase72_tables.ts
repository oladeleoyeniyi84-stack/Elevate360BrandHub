import pg from "pg";

// Phase 72 — Content Distribution Engine (Campaigns).
// Idempotent table bootstrap (CREATE TABLE IF NOT EXISTS) — NOT db:push, which
// wrongly offers to rename the express-session user_sessions table. Safe to run
// repeatedly in dev and as part of post-merge setup for prod.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'blog',
      blog_post_id INTEGER,
      blog_slug TEXT,
      topic TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS campaign_assets (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL,
      asset_key TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'empty',
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS campaign_assets_campaign_asset_idx
      ON campaign_assets (campaign_id, asset_key);
    CREATE INDEX IF NOT EXISTS campaign_assets_campaign_idx
      ON campaign_assets (campaign_id);
  `);

  console.log("Phase 72 (Campaigns) tables created successfully");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
