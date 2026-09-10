import { NextRequest, NextResponse } from 'next/server'
import { db, pool } from '@/lib/db'
import { photos } from '@/lib/db/schema'

export const runtime = 'nodejs'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// The photos table is created lazily so uploads work even before a migration
// has been run. CREATE TABLE IF NOT EXISTS is idempotent and cheap.
let tableReady: Promise<void> | null = null
function ensurePhotosTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS photos (
          id text PRIMARY KEY,
          data text NOT NULL,
          mime text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`,
      )
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later request can retry table creation.
        tableReady = null
        throw err
      })
  }
  return tableReady
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    const mime = file.type || 'application/octet-stream'
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    await ensurePhotosTable()

    const buffer = Buffer.from(await file.arrayBuffer())
    // A cryptographically-unique id per upload. The filename is deliberately
    // ignored, so uploading a file whose name (or bytes) matches an existing
    // photo always creates a distinct record and never collides / dedupes.
    const id = `ph-${crypto.randomUUID()}`

    await db.insert(photos).values({
      id,
      data: buffer.toString('base64'),
      mime,
    })

    // Served by the /api/photo/[id] route; persists via the database so it
    // survives on the published serverless deployment.
    return NextResponse.json({ path: `/api/photo/${id}` })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
