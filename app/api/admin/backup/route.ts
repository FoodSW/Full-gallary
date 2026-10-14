import { NextResponse } from "next/server"
import { ensureSchema, pool } from "@/lib/db"

export const runtime = "nodejs"

const MAX_BACKUP_BYTES = 100 * 1024 * 1024
const TABLES = [
  "vessels",
  "dishes",
  "comments",
  "admin_credentials",
  "admin_users",
  "site_stats",
  "photos",
] as const

type BackupTable = (typeof TABLES)[number]
type BackupPayload = {
  format: "swire-gallery-backup"
  version: 1
  createdAt: string
  tables: Record<BackupTable, Record<string, unknown>[]>
}

function emptyTables(): Record<BackupTable, Record<string, unknown>[]> {
  return Object.fromEntries(TABLES.map((table) => [table, []])) as Record<
    BackupTable,
    Record<string, unknown>[]
  >
}

export async function GET() {
  try {
    await ensureSchema()
    const tables = emptyTables()

    for (const table of TABLES) {
      const result = await pool.query(`SELECT * FROM "${table}" ORDER BY 1`)
      tables[table] = result.rows
    }

    const payload: BackupPayload = {
      format: "swire-gallery-backup",
      version: 1,
      createdAt: new Date().toISOString(),
      tables,
    }

    return new NextResponse(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="swire-gallery-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[v0] Backup creation failed:", error)
    return NextResponse.json(
      { error: "Backup could not be created. Check that PostgreSQL is running and DATABASE_URL is correct." },
      { status: 503 },
    )
  }
} 

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > MAX_BACKUP_BYTES) {
    return NextResponse.json({ error: "Backup file is too large." }, { status: 413 })
  }

  let payload: Partial<BackupPayload>
  try {
    payload = (await request.json()) as Partial<BackupPayload>
  } catch {
    return NextResponse.json({ error: "The backup file is not valid JSON." }, { status: 400 })
  }

  if (payload.format !== "swire-gallery-backup" || payload.version !== 1 || !payload.tables) {
    return NextResponse.json({ error: "Unsupported or invalid backup format." }, { status: 400 })
  }

  for (const table of TABLES) {
    if (!Array.isArray(payload.tables[table])) {
      return NextResponse.json({ error: `Backup is missing the ${table} table.` }, { status: 400 })
    }
  }

  await ensureSchema()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("TRUNCATE TABLE photos, comments, dishes, admin_users, admin_credentials, site_stats, vessels CASCADE")

    for (const table of TABLES) {
      const rows = payload.tables[table] as Record<string, unknown>[]
      if (rows.length === 0) continue
      const columns = Object.keys(rows[0])
      if (columns.length === 0) continue
      const quotedColumns = columns.map((column) => `"${column.replaceAll('"', '""')}"`).join(", ")
      const values: unknown[] = []
      const placeholders = rows.map((row, rowIndex) => {
        const rowPlaceholders = columns.map((column, columnIndex) => {
          values.push(row[column] ?? null)
          return `$${rowIndex * columns.length + columnIndex + 1}`
        })
        return `(${rowPlaceholders.join(", ")})`
      })
      await client.query(
        `INSERT INTO "${table}" (${quotedColumns}) VALUES ${placeholders.join(", ")}`,
        values,
      )
    }

    await client.query("COMMIT")
    return NextResponse.json({ ok: true })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("[v0] Backup restore failed:", error)
    return NextResponse.json({ error: "Restore failed. No changes were kept." }, { status: 500 })
  } finally {
    client.release()
  }
}
