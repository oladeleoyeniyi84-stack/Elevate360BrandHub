import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // --- users: additive columns + relax legacy NOT NULL constraints ---
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_tier VARCHAR(20) NOT NULL DEFAULT 'free';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
    ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
  `);
  // unique email (guard if it doesn't exist yet)
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      stripe_subscription_id TEXT UNIQUE,
      stripe_customer_id TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'incomplete',
      tier VARCHAR(20) NOT NULL DEFAULT 'starter',
      current_period_end TIMESTAMP,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id);
    CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);

    CREATE TABLE IF NOT EXISTS ai_credits (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      monthly_allotment INTEGER NOT NULL DEFAULT 0,
      last_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_premium_features (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      feature_key VARCHAR(80) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      source VARCHAR(30) NOT NULL DEFAULT 'subscription',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS user_premium_features_user_feature_idx
      ON user_premium_features (user_id, feature_key);
  `);

  console.log("Phase 68A tables created successfully");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
