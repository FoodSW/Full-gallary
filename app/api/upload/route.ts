import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const vesselName = (form.get('vesselName') as string | null)?.trim()

    if (!file || !vesselName) {
      return NextResponse.json({ error: 'Missing file or vesselName' }, { status: 400 })
    }

    // Sanitise the vessel name so it is safe as a folder name.
    const safeFolder = vesselName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-')

    const ext = path.extname(file.name).toLowerCase() || '.jpg'
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Build the target directory: public/vessels/<vessel-name>/
    const dir = path.join(process.cwd(), 'public', 'vessels', safeFolder)
    await mkdir(dir, { recursive: true })

    // Use a timestamp-based filename to avoid collisions.
    const filename = `${Date.now()}${ext}`
    const filePath = path.join(dir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Return the public URL path so Next.js <Image> can serve it.
    const publicPath = `/vessels/${safeFolder}/${filename}`
    return NextResponse.json({ path: publicPath })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
