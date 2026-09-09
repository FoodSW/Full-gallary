'use server'

import { revalidatePath } from 'next/cache'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { dishes, vessels, adminCredentials, comments, adminUsers, siteStats } from '@/lib/db/schema'
import type { Vessel, Dish, AdminRole, AdminUser } from '@/lib/gallery-data'

// ---------------------------------------------------------------------------
// Visitor counter
// ---------------------------------------------------------------------------

/** Return the current total visit count without incrementing. */
export async function getVisitCount(): Promise<number> {
  const [row] = await db.select().from(siteStats).where(eq(siteStats.id, 'global'))
  return row?.visits ?? 0
}

/**
 * Increment the global visit counter by one and return the new total. Uses an
 * upsert so the row is created on first hit, and a single atomic UPDATE so
 * concurrent visits can't lose counts.
 */
export async function recordVisit(): Promise<number> {
  const [row] = await db
    .insert(siteStats)
    .values({ id: 'global', visits: 1 })
    .onConflictDoUpdate({
      target: siteStats.id,
      set: { visits: sql`${siteStats.visits} + 1` },
    })
    .returning({ visits: siteStats.visits })
  return row?.visits ?? 0
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map raw DB rows into the Vessel shape the UI consumes. */
function buildVessels(
  vesselRows: { id: string; name: string; thumbnail: string }[],
  dishRows: {
    id: string
    vesselId: string
    image: string
    date: Date
    thumbsUp: number
    thumbsDown: number
  }[],
  commentRows: { id: string; dishId: string; body: string; createdAt: Date }[] = [],
): Vessel[] {
  return vesselRows.map((v) => {
    const vDishes: Dish[] = dishRows
      .filter((d) => d.vesselId === v.id)
      .map((d) => ({
        id: d.id,
        image: d.image,
        date: d.date.toISOString(),
        thumbsUp: d.thumbsUp,
        thumbsDown: d.thumbsDown,
        comments: commentRows
          .filter((c) => c.dishId === d.id)
          .map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString() })),
      }))

    const rank = vDishes.reduce((s, d) => s + (d.thumbsUp - d.thumbsDown), 0)

    return {
      name: v.name,
      thumbnail: v.thumbnail,
      rank,
      photoCount: vDishes.length,
      dishes: vDishes,
    }
  })
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getVessels(): Promise<Vessel[]> {
  const [vesselRows, dishRows, commentRows] = await Promise.all([
    db.select().from(vessels).orderBy(vessels.createdAt),
    db.select().from(dishes).orderBy(dishes.createdAt),
    db.select().from(comments).orderBy(comments.createdAt),
  ])
  return buildVessels(
    vesselRows,
    dishRows as Parameters<typeof buildVessels>[1],
    commentRows as Parameters<typeof buildVessels>[2],
  )
}

// ---------------------------------------------------------------------------
// Vessel CRUD
// ---------------------------------------------------------------------------

export async function addVessel(name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  await db.insert(vessels).values({
    id: `v-${nanoid(8)}`,
    name: trimmed,
    thumbnail: '/vessel-container.png',
  }).onConflictDoNothing()
  revalidatePath('/')
  revalidatePath('/admin')
}

export async function renameVessel(oldName: string, newName: string): Promise<void> {
  const trimmed = newName.trim()
  if (!trimmed || trimmed === oldName) return
  await db.update(vessels).set({ name: trimmed }).where(eq(vessels.name, oldName))
  revalidatePath('/')
  revalidatePath('/admin')
}

export async function updateVesselThumbnail(name: string, thumbnail: string): Promise<void> {
  await db.update(vessels).set({ thumbnail }).where(eq(vessels.name, name))
  revalidatePath('/')
  revalidatePath('/admin')
}

export async function deleteVessel(name: string): Promise<void> {
  const [vessel] = await db.select({ id: vessels.id }).from(vessels).where(eq(vessels.name, name))
  if (!vessel) return
  const vDishes = await db.select({ id: dishes.id }).from(dishes).where(eq(dishes.vesselId, vessel.id))
  for (const d of vDishes) {
    await db.delete(comments).where(eq(comments.dishId, d.id))
  }
  await db.delete(dishes).where(eq(dishes.vesselId, vessel.id))
  await db.delete(vessels).where(eq(vessels.id, vessel.id))
  revalidatePath('/')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------------------
// Dish CRUD
// ---------------------------------------------------------------------------

export async function addDish(
  vesselName: string,
  input: { image: string; date: string },
): Promise<void> {
  const [vessel] = await db
    .select({ id: vessels.id })
    .from(vessels)
    .where(eq(vessels.name, vesselName))
  if (!vessel) return
  await db.insert(dishes).values({
    id: `d-${nanoid(8)}`,
    vesselId: vessel.id,
    image: input.image,
    date: new Date(input.date),
    thumbsUp: 0,
    thumbsDown: 0,
  })
  revalidatePath('/')
  revalidatePath('/admin')
}

export async function deleteDish(dishId: string): Promise<void> {
  await db.delete(comments).where(eq(comments.dishId, dishId))
  await db.delete(dishes).where(eq(dishes.id, dishId))
  revalidatePath('/')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function addComment(
  dishId: string,
  body: string,
): Promise<{ ok: boolean; comment?: { id: string; body: string; createdAt: string } }> {
  const trimmed = body.trim()
  if (!trimmed) return { ok: false }
  // Cap length to keep the UI tidy and prevent abuse.
  const clean = trimmed.slice(0, 500)
  const id = `c-${nanoid(10)}`
  const createdAt = new Date()
  await db.insert(comments).values({ id, dishId, body: clean, createdAt })
  revalidatePath('/')
  return { ok: true, comment: { id, body: clean, createdAt: createdAt.toISOString() } }
}

// ---------------------------------------------------------------------------
// Admin credentials
// ---------------------------------------------------------------------------

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<{ ok: boolean; username?: string; role?: AdminRole }> {
  const uname = username.trim()

  // Root admin (always an administrator).
  const [row] = await db.select().from(adminCredentials).where(eq(adminCredentials.id, 1))
  const root = row ?? { username: 'max', password: '1234567890' }
  if (uname === root.username && password === root.password) {
    return { ok: true, username: root.username, role: 'administrator' }
  }

  // Additional accounts added by an administrator.
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, uname))
  if (user && user.password === password) {
    return { ok: true, username: user.username, role: user.role as AdminRole }
  }

  return { ok: false }
}

// ---------------------------------------------------------------------------
// Admin team (additional administrators & group managers)
// ---------------------------------------------------------------------------

export async function listAdminUsers(): Promise<AdminUser[]> {
  const rows = await db.select().from(adminUsers).orderBy(adminUsers.createdAt)
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role as AdminRole,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function addAdminUser(
  username: string,
  password: string,
  role: AdminRole,
): Promise<{ ok: boolean; error?: string }> {
  const uname = username.trim()
  if (!uname) return { ok: false, error: 'Username is required.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
  if (role !== 'administrator' && role !== 'manager') {
    return { ok: false, error: 'Invalid role.' }
  }

  // Avoid clashing with the root admin username.
  const [row] = await db.select().from(adminCredentials).where(eq(adminCredentials.id, 1))
  const rootUsername = row?.username ?? 'max'
  if (uname.toLowerCase() === rootUsername.toLowerCase()) {
    return { ok: false, error: 'That username is already taken.' }
  }

  const existing = await db.select().from(adminUsers).where(eq(adminUsers.username, uname))
  if (existing.length > 0) {
    return { ok: false, error: 'That username is already taken.' }
  }

  await db.insert(adminUsers).values({
    id: `au-${nanoid(8)}`,
    username: uname,
    password,
    role,
  })
  revalidatePath('/admin')
  return { ok: true }
}

export async function deleteAdminUser(id: string): Promise<void> {
  await db.delete(adminUsers).where(eq(adminUsers.id, id))
  revalidatePath('/admin')
}

export async function getAdminUsername(): Promise<string> {
  const [row] = await db.select({ username: adminCredentials.username }).from(adminCredentials).where(eq(adminCredentials.id, 1))
  return row?.username ?? 'max'
}

export async function updateAdminCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const [row] = await db.select().from(adminCredentials).where(eq(adminCredentials.id, 1))
  const existing = row ?? { username: 'max', password: '1234567890' }

  if (existing.password !== currentPassword) {
    return { ok: false, error: 'Current password is incorrect.' }
  }
  const trimUser = newUsername.trim()
  if (!trimUser) return { ok: false, error: 'Username cannot be empty.' }
  if (newPassword.length > 0 && newPassword.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' }
  }

  await db
    .insert(adminCredentials)
    .values({
      id: 1,
      username: trimUser,
      password: newPassword || existing.password,
    })
    .onConflictDoUpdate({
      target: adminCredentials.id,
      set: {
        username: trimUser,
        password: newPassword || existing.password,
      },
    })

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Ranking (thumbs up / down)
// ---------------------------------------------------------------------------

/**
 * Apply thumbs deltas to a dish. Deltas may be negative (toggling a vote off or
 * switching direction); counts are floored at zero. Done in one UPDATE so it is
 * safe against concurrent votes.
 */
export async function voteDish(
  dishId: string,
  deltaUp: number,
  deltaDown: number,
): Promise<void> {
  await db
    .update(dishes)
    .set({
      thumbsUp: sql`GREATEST(${dishes.thumbsUp} + ${deltaUp}, 0)`,
      thumbsDown: sql`GREATEST(${dishes.thumbsDown} + ${deltaDown}, 0)`,
    })
    .where(eq(dishes.id, dishId))
  revalidatePath('/')
}
