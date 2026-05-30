import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cognitive_decisions (
      id SERIAL PRIMARY KEY,
      kind VARCHAR(20) NOT NULL DEFAULT 'action',
      area VARCHAR(40) NOT NULL DEFAULT 'general',
      title VARCHAR(200) NOT NULL,
      detail TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 50,
      confidence INTEGER NOT NULL DEFAULT 50,
      sources JSONB NOT NULL DEFAULT '[]'::jsonb,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      source VARCHAR(40) NOT NULL DEFAULT 'rules',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cognitive_decisions_kind_idx ON cognitive_decisions (kind);
    CREATE INDEX IF NOT EXISTS cognitive_decisions_status_idx ON cognitive_decisions (status);

    CREATE TABLE IF NOT EXISTS cognitive_briefings (
      id SERIAL PRIMARY KEY,
      period_type VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      summary TEXT NOT NULL,
      sections JSONB NOT NULL DEFAULT '{}'::jsonb,
      provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      source VARCHAR(40) NOT NULL DEFAULT 'openai',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cognitive_briefings_period_idx ON cognitive_briefings (period_type);
    CREATE INDEX IF NOT EXISTS cognitive_briefings_created_idx ON cognitive_briefings (created_at);

    CREATE TABLE IF NOT EXISTS cognitive_conflicts (
      id SERIAL PRIMARY KEY,
      area VARCHAR(40) NOT NULL DEFAULT 'general',
      title VARCHAR(200) NOT NULL,
      detail TEXT NOT NULL,
      severity INTEGER NOT NULL DEFAULT 50,
      left_signal TEXT NOT NULL DEFAULT '',
      right_signal TEXT NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      source VARCHAR(40) NOT NULL DEFAULT 'rules',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cognitive_conflicts_area_idx ON cognitive_conflicts (area);
    CREATE INDEX IF NOT EXISTS cognitive_conflicts_status_idx ON cognitive_conflicts (status);
  `);
  console.log("Phase 67 tables created successfully");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
