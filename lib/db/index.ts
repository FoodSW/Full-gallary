import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'
import * as schema from './schema'

// Under Next.js 16 Turbopack, pg's bundled connection-string parser can fail to
// load ("Couldn't load fs/zlib"), which drops the username and yields
// "no PostgreSQL user name specified in startup packet". Parse the URL with
// Node's built-in URL and pass explicit fields to avoid relying on that parser.
// The sandbox env file re-syncs from git between sessions and can drop
// DATABASE_URL, so fall back to the local Postgres server that runs in the
// sandbox. This keeps the app connected even when the env var is missing.
const LOCAL_DATABASE_URL = 'postgresql://postgres@localhost:5432/gallery'

function buildPoolConfig(): PoolConfig {
  const url = process.env.DATABASE_URL || LOCAL_DATABASE_URL
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? Number(parsed.port) : 5432,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      database: parsed.pathname.replace(/^\//, '') || undefined,
      ssl: parsed.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : undefined,
    }
  } catch {
    return { connectionString: url }
  }
}

export const pool = new Pool(buildPoolConfig())

export const db = drizzle(pool, { schema })

// Idempotent schema bootstrap. The sandbox database (and a fresh local
// PostgreSQL install) may not have the tables yet; running the app should not
// require manually applying schema.sql first. This mirrors schema.sql and runs
// at most once per process.
const DDL = `
CREATE TABLE IF NOT EXISTS vessels (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  thumbnail text NOT NULL DEFAULT '/vessel-container.png',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dishes (
  id text PRIMARY KEY,
  vessel_id text NOT NULL,
  image text NOT NULL,
  date timestamp NOT NULL,
  thumbs_up integer NOT NULL DEFAULT 0,
  thumbs_down integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  dish_id text NOT NULL,
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_credentials (
  id integer PRIMARY KEY DEFAULT 1,
  username text NOT NULL DEFAULT 'max',
  password text NOT NULL DEFAULT '1234567890'
);
INSERT INTO admin_credentials (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS admin_users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'manager',
  vessels text NOT NULL DEFAULT '[]',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS site_stats (
  id text PRIMARY KEY,
  visits integer NOT NULL DEFAULT 0
);
INSERT INTO site_stats (id, visits) VALUES ('global', 0) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS photos (
  id text PRIMARY KEY,
  data text NOT NULL,
  mime text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
-- Columns added after initial release; guard for pre-existing tables.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS vessels text NOT NULL DEFAULT '[]';
`

let schemaReady: Promise<void> | null = null

/** Ensure all tables exist. Safe to call on every request; runs once. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(DDL).then(() => undefined).catch((err) => {
      // Reset so a transient failure can be retried on the next call.
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}
