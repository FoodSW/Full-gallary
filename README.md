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

## One-command install (Ubuntu 22.04 server)

The repo ships an automated installer (`install.sh`) that installs Node.js 20,
pnpm, and PostgreSQL, provisions the database, builds the app, and runs it as a
systemd service that starts on boot. On a fresh server run:

```bash
curl -fsSL https://raw.githubusercontent.com/FoodSW/Full-gallary/main/install.sh | bash
```

Re-running the script updates the app to the latest code. It is configurable via
environment variables (`APP_DIR`, `APP_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `REPO_BRANCH`, …) — see the comments at the top of `install.sh`.
The generated database password is saved to `<APP_DIR>/.db-credentials`.

For a manual, step-by-step setup instead, follow the guide below.

### Uninstall

The repo also ships `uninstall.sh`, which reverses the installer: it stops and
removes the systemd service, frees the port, and deletes the app directory.

```bash
# Remove the service and app files, but KEEP the database:
curl -fsSL https://raw.githubusercontent.com/FoodSW/Full-gallary/main/uninstall.sh | bash

# Also DROP the database and role (destroys all gallery data):
curl -fsSL https://raw.githubusercontent.com/FoodSW/Full-gallary/main/uninstall.sh | bash -s -- --purge
```

Add `--yes` to skip the confirmation prompt. It reads the same `APP_DIR`,
`APP_PORT`, `DB_NAME`, and `DB_USER` environment variables as the installer, so
pass any custom values you used at install time. Node.js, pnpm, and the
PostgreSQL server packages are intentionally left in place, since other apps may
depend on them.

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
