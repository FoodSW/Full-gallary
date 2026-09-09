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

export const adminCredentials = pgTable('admin_credentials', {
  id:       integer('id').primaryKey().default(sql`1`),
  username: text('username').notNull().default('max'),
  password: text('password').notNull().default('1234567890'),
})

export type VesselRow            = typeof vessels.$inferSelect
export type DishRow              = typeof dishes.$inferSelect
export type AdminCredentialsRow  = typeof adminCredentials.$inferSelect
