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

  // ── Phase 72.4R — Search Console snapshots, SEO audits, Core Web Vitals ──
  // Reserved-word-adjacent columns ("date", "query", "position", "key",
  // "value") are quoted defensively.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gsc_query_daily (
      id SERIAL PRIMARY KEY,
      "date" DATE NOT NULL,
      "query" TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
      "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
      imported_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS gsc_query_daily_date_query_uq
      ON gsc_query_daily ("date", "query");
    CREATE INDEX IF NOT EXISTS gsc_query_daily_date_idx ON gsc_query_daily ("date");

    CREATE TABLE IF NOT EXISTS gsc_page_daily (
      id SERIAL PRIMARY KEY,
      "date" DATE NOT NULL,
      page TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
      "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
      imported_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS gsc_page_daily_date_page_uq
      ON gsc_page_daily ("date", page);
    CREATE INDEX IF NOT EXISTS gsc_page_daily_date_idx ON gsc_page_daily ("date");

    CREATE TABLE IF NOT EXISTS gsc_dimension_daily (
      id SERIAL PRIMARY KEY,
      "date" DATE NOT NULL,
      dimension VARCHAR(24) NOT NULL,
      "key" TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
      "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
      imported_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS gsc_dimension_daily_uq
      ON gsc_dimension_daily ("date", dimension, "key");

    CREATE TABLE IF NOT EXISTS gsc_query_pages (
      id SERIAL PRIMARY KEY,
      "query" TEXT NOT NULL,
      page TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      window_start DATE,
      window_end DATE,
      imported_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS gsc_query_pages_uq
      ON gsc_query_pages ("query", page);
    CREATE INDEX IF NOT EXISTS gsc_query_pages_query_idx ON gsc_query_pages ("query");

    CREATE TABLE IF NOT EXISTS gsc_sync_runs (
      id SERIAL PRIMARY KEY,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP,
      status VARCHAR(24) NOT NULL DEFAULT 'running',
      source VARCHAR(16) NOT NULL DEFAULT 'api',
      days_requested INTEGER,
      start_date DATE,
      end_date DATE,
      query_rows INTEGER NOT NULL DEFAULT 0,
      page_rows INTEGER NOT NULL DEFAULT 0,
      dimension_rows INTEGER NOT NULL DEFAULT 0,
      query_page_rows INTEGER NOT NULL DEFAULT 0,
      error_text TEXT,
      detail JSONB
    );
    CREATE INDEX IF NOT EXISTS gsc_sync_runs_started_idx ON gsc_sync_runs (started_at);
    -- Sweep stale 'running' rows (crashed runs) so the single-run unique index
    -- below can always be created, then enforce at most ONE running row so the
    -- sync 409 guard is atomic at the DB level (proven partial-unique pattern).
    UPDATE gsc_sync_runs SET status = 'error', finished_at = NOW(),
      error_text = 'stale running row swept before single-run index creation'
      WHERE status = 'running' AND started_at <= NOW() - INTERVAL '10 minutes';
    CREATE UNIQUE INDEX IF NOT EXISTS gsc_sync_runs_single_running_uq ON gsc_sync_runs (status) WHERE status = 'running';

    CREATE TABLE IF NOT EXISTS seo_audit_runs (
      id SERIAL PRIMARY KEY,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP,
      status VARCHAR(24) NOT NULL DEFAULT 'running',
      pages_audited INTEGER NOT NULL DEFAULT 0,
      issues_found INTEGER NOT NULL DEFAULT 0,
      error_text TEXT,
      detail JSONB
    );
    CREATE INDEX IF NOT EXISTS seo_audit_runs_started_idx ON seo_audit_runs (started_at);

    CREATE TABLE IF NOT EXISTS seo_page_audits (
      id SERIAL PRIMARY KEY,
      run_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      http_status INTEGER NOT NULL DEFAULT 0,
      title TEXT,
      title_length INTEGER NOT NULL DEFAULT 0,
      meta_description TEXT,
      description_length INTEGER NOT NULL DEFAULT 0,
      canonical TEXT,
      canonical_ok BOOLEAN,
      robots_meta TEXT,
      noindex BOOLEAN NOT NULL DEFAULT FALSE,
      og_title TEXT,
      og_description TEXT,
      og_image TEXT,
      twitter_title TEXT,
      twitter_description TEXT,
      twitter_image TEXT,
      issues JSONB NOT NULL DEFAULT '[]'::jsonb,
      audited_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS seo_page_audits_run_idx ON seo_page_audits (run_id);

    CREATE TABLE IF NOT EXISTS seo_schema_audits (
      id SERIAL PRIMARY KEY,
      run_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      schema_type VARCHAR(40) NOT NULL,
      expected BOOLEAN NOT NULL DEFAULT FALSE,
      present BOOLEAN NOT NULL DEFAULT FALSE,
      valid BOOLEAN,
      issues JSONB NOT NULL DEFAULT '[]'::jsonb,
      audited_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS seo_schema_audits_run_idx ON seo_schema_audits (run_id);

    CREATE TABLE IF NOT EXISTS seo_indexability_audits (
      id SERIAL PRIMARY KEY,
      run_id INTEGER NOT NULL,
      kind VARCHAR(30) NOT NULL,
      url TEXT NOT NULL,
      ok BOOLEAN NOT NULL DEFAULT TRUE,
      http_status INTEGER,
      detail TEXT,
      audited_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS seo_indexability_run_idx ON seo_indexability_audits (run_id);
    CREATE INDEX IF NOT EXISTS seo_indexability_kind_idx ON seo_indexability_audits (kind);

    CREATE TABLE IF NOT EXISTS web_vitals_events (
      id SERIAL PRIMARY KEY,
      metric VARCHAR(8) NOT NULL,
      "value" DOUBLE PRECISION NOT NULL,
      page TEXT,
      device VARCHAR(40),
      source VARCHAR(20) NOT NULL DEFAULT 'rum_field',
      session_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS web_vitals_metric_created_idx
      ON web_vitals_events (metric, created_at);
    CREATE INDEX IF NOT EXISTS web_vitals_created_idx ON web_vitals_events (created_at);
  `);

  console.log("Phase 72.4 (Search Intelligence + Search Console/SEO/CWV) tables created successfully");
  await pool.end();
}

main().catch((err) => {
  console.error("Phase 72.4 table bootstrap failed:", err);
  process.exit(1);
});
