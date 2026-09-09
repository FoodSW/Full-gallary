-- Swire Bulk Gallery — database schema
-- Run once against your PostgreSQL database:
--   psql "postgresql://gallery:YOUR_PASSWORD@localhost:5432/gallery" -f schema.sql

CREATE TABLE IF NOT EXISTS vessels (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  thumbnail text NOT NULL DEFAULT '/vessel-container.png',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dishes (
  id text PRIMARY KEY,
  vessel_id text NOT NULL,
  image text NOT NULL,
  date timestamp NOT NULL,
  thumbs_up integer NOT NULL DEFAULT 0,
  thumbs_down integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  dish_id text NOT NULL,
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_credentials (
  id integer PRIMARY KEY DEFAULT 1,
  username text NOT NULL DEFAULT 'max',
  password text NOT NULL DEFAULT '1234567890'
);
INSERT INTO admin_credentials (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'manager',
  vessels text NOT NULL DEFAULT '[]',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_stats (
  id text PRIMARY KEY,
  visits integer NOT NULL DEFAULT 0
);
INSERT INTO site_stats (id, visits) VALUES ('global', 0) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS photos (
  id text PRIMARY KEY,
  data text NOT NULL,
  mime text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
