-- Read-only, non-PII Postgres recovery validation.
-- Run ONLY against the designated isolated PITR restoration, never as a restore command.
-- Does not copy, export, change, drop, or replay data.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15000ms';
SELECT current_database() AS database_name,
       current_setting('server_version') AS postgres_version,
       pg_size_pretty(pg_database_size(current_database())) AS restored_database_size,
       (SELECT count(*)::int FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS public_table_count;
WITH expected(table_name) AS (
  VALUES ('orders'), ('stripe_processed_events'), ('user_sessions'),
         ('bookings'), ('contact_messages'), ('newsletter_subscribers')
)
SELECT e.table_name,
       to_regclass('public.' || e.table_name) IS NOT NULL AS table_present
  FROM expected e ORDER BY e.table_name;
SELECT relname AS table_name,
       greatest(0,n_live_tup)::bigint AS estimated_row_count
  FROM pg_stat_user_tables
 WHERE schemaname = 'public'
   AND relname IN ('orders','stripe_processed_events','user_sessions',
                   'bookings','contact_messages','newsletter_subscribers')
 ORDER BY relname;
SELECT count(*)::int AS index_count FROM pg_indexes WHERE schemaname = 'public';
COMMIT;
