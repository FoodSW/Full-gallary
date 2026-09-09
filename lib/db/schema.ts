import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const vessels = pgTable('vessels', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  thumbnail: text('thumbnail').notNull().default('/vessel-container.png'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const dishes = pgTable('dishes', {
  id:         text('id').primaryKey(),
  vesselId:   text('vessel_id').notNull(),
  image:      text('image').notNull(),
  date:       timestamp('date').notNull(),
  thumbsUp:   integer('thumbs_up').notNull().default(0),
  thumbsDown: integer('thumbs_down').notNull().default(0),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export const comments = pgTable('comments', {
  id:        text('id').primaryKey(),
  dishId:    text('dish_id').notNull(),
  body:      text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const adminCredentials = pgTable('admin_credentials', {
  id:       integer('id').primaryKey().default(sql`1`),
  username: text('username').notNull().default('max'),
  password: text('password').notNull().default('1234567890'),
})

// Additional admin accounts beyond the root admin (kept in adminCredentials).
// role is 'administrator' or 'manager' (group manager).
export const adminUsers = pgTable('admin_users', {
  id:        text('id').primaryKey(),
  username:  text('username').notNull().unique(),
  password:  text('password').notNull(),
  role:      text('role').notNull().default('manager'),
  // JSON array of vessel names a group manager may moderate. Ignored for
  // administrators (who can moderate everything).
  vessels:   text('vessels').notNull().default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Single-row global counter for total site visits.
export const siteStats = pgTable('site_stats', {
  id:     text('id').primaryKey(),
  visits: integer('visits').notNull().default(0),
})

// Uploaded gallery photos, stored in the database so they persist on the
// published (serverless) deployment where the filesystem is ephemeral.
// `data` holds the base64-encoded image bytes; served via /api/photo/<id>.
export const photos = pgTable('photos', {
  id:        text('id').primaryKey(),
  data:      text('data').notNull(),
  mime:      text('mime').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type VesselRow            = typeof vessels.$inferSelect
export type DishRow              = typeof dishes.$inferSelect
export type CommentRow           = typeof comments.$inferSelect
export type AdminCredentialsRow  = typeof adminCredentials.$inferSelect
export type AdminUserRow         = typeof adminUsers.$inferSelect
export type SiteStatsRow         = typeof siteStats.$inferSelect
export type PhotoRow             = typeof photos.$inferSelect
