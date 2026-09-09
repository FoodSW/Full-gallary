import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const [row] = await db.select().from(photos).where(eq(photos.id, id))
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const bytes = Buffer.from(row.data, 'base64')
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': row.mime,
        // Photo bytes are immutable once stored, so cache aggressively.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('[photo]', err)
    return NextResponse.json({ error: 'Failed to load photo' }, { status: 500 })
  }
}
