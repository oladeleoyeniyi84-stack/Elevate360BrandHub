import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(40) NOT NULL DEFAULT 'analyst',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS approval_requests (
      id SERIAL PRIMARY KEY,
      request_key VARCHAR(180) NOT NULL UNIQUE,
      area VARCHAR(40) NOT NULL,
      action_type VARCHAR(80) NOT NULL,
      payload_json JSONB,
      requested_by VARCHAR(80) NOT NULL DEFAULT 'ai',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      resolved_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_explanations (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(80) NOT NULL,
      entity_id VARCHAR(120) NOT NULL,
      action_type VARCHAR(80) NOT NULL,
      reason TEXT,
      evidence_json JSONB,
      confidence INTEGER NOT NULL DEFAULT 0,
      policy_key VARCHAR(120),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS system_health_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_time TIMESTAMP DEFAULT NOW() NOT NULL,
      job_health_score INTEGER NOT NULL DEFAULT 0,
      revenue_truth_score INTEGER NOT NULL DEFAULT 0,
      audit_health_score INTEGER NOT NULL DEFAULT 0,
      execution_safety_score INTEGER NOT NULL DEFAULT 0,
      growth_health_score INTEGER NOT NULL DEFAULT 0,
      overall_maturity_score INTEGER NOT NULL DEFAULT 0,
      meta_json JSONB
    );
    CREATE TABLE IF NOT EXISTS quarterly_strategy_reports (
      id SERIAL PRIMARY KEY,
      period_start TIMESTAMP NOT NULL,
      period_end TIMESTAMP NOT NULL,
      summary TEXT,
      recommendations_json JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  console.log("Phase 52 tables created successfully");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
