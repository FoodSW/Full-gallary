import { NextResponse } from 'next/server'
import { pool, ensureSchema } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/health/db
// Returns 200 { ok: true } when the database is reachable and the schema is
// present, 503 { ok: false, error } otherwise. Handy for `curl` checks,
// uptime monitors, and load-balancer health probes.
export async function GET() {
  const started = Date.now()
  try {
    await ensureSchema()
    const { rows } = await pool.query('SELECT current_database() AS db')
    return NextResponse.json(
      { ok: true, database: rows[0]?.db ?? null, latencyMs: Date.now() - started },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
