// Standalone database connectivity check.
//
// Run from the project root:
//   node --env-file-if-exists=.env.local scripts/check-db.mjs
//
// Exit code 0 = connected and all expected tables present.
// Exit code 1 = connection failed or tables missing.

import { Pool } from 'pg'

const LOCAL_DATABASE_URL = 'postgresql://postgres@localhost:5432/gallery'
const url = process.env.DATABASE_URL || LOCAL_DATABASE_URL

const EXPECTED_TABLES = [
  'vessels',
  'dishes',
  'comments',
  'admin_credentials',
  'admin_users',
  'site_stats',
  'photos',
]

function buildConfig(connectionString) {
  try {
    const parsed = new URL(connectionString)
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? Number(parsed.port) : 5432,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      database: parsed.pathname.replace(/^\//, '') || undefined,
      ssl:
        parsed.searchParams.get('sslmode') === 'require'
          ? { rejectUnauthorized: false }
          : undefined,
    }
  } catch {
    return { connectionString }
  }
}

// Redact the password before printing the target.
function safeTarget(connectionString) {
  try {
    const p = new URL(connectionString)
    const user = p.username || '(default)'
    return `${user}@${p.hostname || 'localhost'}:${p.port || 5432}${p.pathname || ''}`
  } catch {
    return '(unparseable connection string)'
  }
}

const pool = new Pool(buildConfig(url))

try {
  console.log(`[check-db] Connecting to ${safeTarget(url)} ...`)
  const started = Date.now()
  const { rows } = await pool.query('SELECT current_database() AS db, version() AS version')
  const ms = Date.now() - started
  console.log(`[check-db] Connected to "${rows[0].db}" in ${ms}ms`)
  console.log(`[check-db] Server: ${rows[0].version.split(',')[0]}`)

  const { rows: tableRows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [EXPECTED_TABLES],
  )
  const present = new Set(tableRows.map((r) => r.table_name))
  const missing = EXPECTED_TABLES.filter((t) => !present.has(t))

  for (const t of EXPECTED_TABLES) {
    console.log(`  ${present.has(t) ? 'OK  ' : 'MISS'} ${t}`)
  }

  if (missing.length > 0) {
    console.error(
      `[check-db] Missing table(s): ${missing.join(', ')}. ` +
        `Apply schema.sql or start the app once to auto-create them.`,
    )
    process.exitCode = 1
  } else {
    console.log('[check-db] SUCCESS - database connected and schema present.')
  }
} catch (err) {
  console.error(`[check-db] FAILED: ${err.message}`)
  console.error('[check-db] Check that PostgreSQL is running and DATABASE_URL is correct.')
  process.exitCode = 1
} finally {
  await pool.end()
}
