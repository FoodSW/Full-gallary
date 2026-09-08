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
