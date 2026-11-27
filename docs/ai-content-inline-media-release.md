# Inline Blog Media — Controlled Release Gate

Scope: Elevate360Official AI Content Studio, founder-authorized inline image support.
This is not a public blog publication authorization.

## Preconditions (NO-GO until satisfied)

1. Review and back up the production PostgreSQL database.
2. Use the repository's established guarded table-bootstrap pattern: `scripts/create_blog_media_table.ts`. Never run `drizzle-kit push`.
   - From the authenticated, approved Render application shell with its existing `DATABASE_URL` (do not expose or paste credentials), run exactly:
     ```bash
     npx tsx scripts/create_blog_media_table.ts --apply
     ```
   - The script refuses databases other than `elevate360_db`, uses a transactional advisory lock, creates only the additive `blog_media` table, and verifies columns and SELECT/INSERT privileges.
   - In environments that do not already have a checkout of this PR branch, first use the approved migration runner to provide this exact script. Do not change a live web process's application branch or startup settings merely to obtain the script.
   - A backup/restore point must be verified before executing the command.
3. Verify the table and minimum privilege requirements using read-only SQL:
   ```sql
   SELECT to_regclass('public.blog_media')::text AS table_name;
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'blog_media'
   ORDER BY ordinal_position;
   ```
4. Validate the DB role used by the web service can INSERT and SELECT images.
5. Obtain a successful GitHub CI run for PR #53 (typecheck, image-placement and URL-safety tests, AI content contract tests, mock-provider integration, and production build).

## Founder-session acceptance

- Refresh Content Studio and open the unpublished blog review of the Git Blob article.
- Choose the approved branded PNG. Limit: 2 MB; PNG/JPEG/WebP only.
- Enter meaningful alt text and caption. Click "Upload and insert after Section 4".
- Verify the image appears AFTER the entire Section 4 conceptual model and BEFORE Section 5.
- Verify rendered Markdown headings, fenced code blocks, table, caption, and image in the blog preview.
- Verify Copy/TXT/DOCX/PDF use the revised Markdown content (exports preserve image reference; they do not embed the image binary).
- Save AS DRAFT only, confirm persistence, then review preview and final appearance on desktop and mobile.
- Check authorization boundaries: unauthenticated upload returns 401; unpublished image GET returns 404 for unauthenticated requests; founder session sees the preview.
- Confirm no DeepSeek provider request occurs during file upload.
- Maintain a publication NO-GO until Founder explicitly approves.

## Security and operational constraints

- Max 2 MiB per upload, magic-byte format verification, no SVG/HTML, no disk-only storage.
- Immutable same-origin image URL; before publication, only a verified founder session may view it.
- Existing CSRF/same-origin request controls and session guards remain in force.
- Never rotate credentials or touch Stripe/Healthwise/Bondedlove/Video Crafter during this release.
- If upload returns HTTP 503, STOP and check the migration/DB role. Do not repeatedly re-upload.
- Rollback application code only after confirming it will not break saved image references. Retain additive media table to avoid data loss.
