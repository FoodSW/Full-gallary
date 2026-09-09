# gallery-clone-dd

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_7AfZ6IwX2Gygd1WLfjCoWU2flZPk)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Self-hosting on Ubuntu 22.04

This app is Next.js 16 / React 19 backed by PostgreSQL (via `pg` + Drizzle) and
uses **pnpm**.

### 0. Generate a strong database password

```bash
openssl rand -base64 24 | tr -d '/+=' | cut -c1-24
```

Copy the output — referred to below as `YOUR_PASSWORD`.

### 1. Install Node.js 20 LTS (Next.js 16 needs Node 20.9+)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v      # expect v20.x
```

### 2. Install pnpm

```bash
sudo npm install -g pnpm
```

### 3. Install PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

### 4. Create the database user and database

```bash
sudo -u postgres psql -c "CREATE USER gallery WITH PASSWORD 'YOUR_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE gallery OWNER gallery;"
```

### 5. Create the tables

From the project root (this repo ships a `schema.sql`):

```bash
psql "postgresql://gallery:YOUR_PASSWORD@localhost:5432/gallery" -f schema.sql
```

### 6. Configure the environment

```bash
echo "DATABASE_URL=postgresql://gallery:YOUR_PASSWORD@localhost:5432/gallery" > .env.local
```

### 7. Install dependencies and run

```bash
pnpm install

# Development (hot reload) -> http://localhost:3000
pnpm dev

# OR production
pnpm build
pnpm start
```

### Notes

- Default admin login: username `max` / password `1234567890`. Change it in the
  admin panel immediately after first login.
- Uploaded photos are stored in the `photos` table (base64), so they persist
  across restarts and redeploys.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
