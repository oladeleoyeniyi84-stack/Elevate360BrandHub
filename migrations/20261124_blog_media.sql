-- Apply through the approved database migration process BEFORE deploying
-- the inline media application. This migration is additive and reversible.
CREATE TABLE IF NOT EXISTS blog_media (
  id uuid PRIMARY KEY,
  mime_type varchar(32) NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
  byte_length integer NOT NULL CHECK (byte_length > 0 AND byte_length <= 2097152),
  bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE blog_media FROM PUBLIC;
-- The application's existing database role must have SELECT/INSERT privileges.
-- No table alteration or deletion of existing post data is performed.
