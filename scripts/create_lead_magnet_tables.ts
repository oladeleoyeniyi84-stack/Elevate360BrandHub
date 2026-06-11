import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lead_magnet_leads (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL,
      guide_slug VARCHAR(120) NOT NULL DEFAULT 'ai-growth-playbook',
      source VARCHAR(80) NOT NULL DEFAULT 'guide-page',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS lead_magnet_leads_email_idx ON lead_magnet_leads (email);
    CREATE INDEX IF NOT EXISTS lead_magnet_leads_created_at_idx ON lead_magnet_leads (created_at);
  `);
  console.log("lead_magnet_leads table ready");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
