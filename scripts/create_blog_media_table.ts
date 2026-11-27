/**
 * Controlled one-off, additive migration for Content Studio blog media.
 * Production: use the existing Render service shell where DATABASE_URL is
 * already set; never paste/database credentials into terminals or CI logs.
 *
 * Preflight: npx tsx scripts/create_blog_media_table.ts --check
 * Apply:     npx tsx scripts/create_blog_media_table.ts --apply
 *
 * Neither mode invokes drizzle-kit push or mutates existing blog posts.
 */
import pg from "pg";

const mode = process.argv[2];
if (mode !== "--check" && mode !== "--apply") {
  console.error("Usage: npx tsx scripts/create_blog_media_table.ts --check|--apply");
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set; connect through the approved Render environment.");
  process.exit(2);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  application_name: "e360-blog-media-controlled-migration",
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
});

async function main() {
  await client.connect();
  const current = await client.query<{ name: string; role: string }>(
    "SELECT current_database() AS name, current_user AS role",
  );
  if (current.rows[0]?.name !== "elevate360_db") {
    throw new Error("Wrong database. Migration requires elevate360_db; no changes made.");
  }
  const exists = await client.query<{ relation: string | null }>(
    "SELECT to_regclass('public.blog_media')::text AS relation",
  );
  if (mode === "--check") {
    console.log(exists.rows[0]?.relation ? "blog_media: present" : "blog_media: not yet present");
    if (!exists.rows[0]?.relation) return;
  } else {
    await client.query("BEGIN");
    try {
      // Transaction-scoped lock prevents two operators simultaneously
      // applying the migration.
      await client.query("SELECT pg_advisory_xact_lock(360, 20261124)");
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.blog_media (
          id uuid PRIMARY KEY,
          mime_type varchar(32) NOT NULL
            CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
          byte_length integer NOT NULL
            CHECK (byte_length > 0 AND byte_length <= 2097152),
          bytes bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        REVOKE ALL ON TABLE public.blog_media FROM PUBLIC;
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  // Postcondition: check actual required columns and access before
  // announcing success. The app role must have SELECT and INSERT.
  const result = await client.query<{ columns: string[]; can_select: boolean; can_insert: boolean }>(`
    SELECT
      ARRAY(
        SELECT column_name::text
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'blog_media'
        ORDER BY ordinal_position
      ) AS columns,
      has_table_privilege(current_user, 'public.blog_media', 'SELECT') AS can_select,
      has_table_privilege(current_user, 'public.blog_media', 'INSERT') AS can_insert
  `);
  const columns = result.rows[0]?.columns ?? [];
  const expected = ["id", "mime_type", "byte_length", "bytes", "created_at"];
  if (JSON.stringify(columns) !== JSON.stringify(expected) ||
      !result.rows[0]?.can_select || !result.rows[0]?.can_insert) {
    throw new Error("blog_media postconditions failed: schema/permissions do not match.");
  }
  console.log("blog_media schema verified; application DB role has SELECT and INSERT.");
}

main()
  .catch((error) => {
    console.error("[blog-media migration] failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => { await client.end().catch(() => undefined); });
