#!/usr/bin/env bash
#
# Swire Bulk Gallery — automated installer for Ubuntu 22.04 server
# -----------------------------------------------------------------
# Downloads the app from GitHub, installs Node.js 20 + pnpm + PostgreSQL,
# provisions the database, builds the app, and runs it as a systemd service
# that starts on boot.
#
# Usage (as a user with sudo):
#   curl -fsSL https://raw.githubusercontent.com/FoodSW/Full-gallary/main/install.sh | bash
# or:
#   wget https://raw.githubusercontent.com/FoodSW/Full-gallary/main/install.sh
#   chmod +x install.sh
#   ./install.sh
#
# Re-running is safe: every step is idempotent.
#
# Configurable via environment variables (all optional):
#   REPO_URL     Git repository to clone   (default: https://github.com/FoodSW/Full-gallary.git)
#   REPO_BRANCH  Branch to check out       (default: main)
#   APP_DIR      Install location          (default: /opt/swire-gallery)
#   APP_PORT     Port the app listens on   (default: 3000)
#   DB_NAME      PostgreSQL database name  (default: gallery)
#   DB_USER      PostgreSQL user           (default: gallery)
#   DB_PASSWORD  PostgreSQL password       (default: auto-generated)
#   SERVICE_USER System user to run as     (default: current sudo user)
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPO_URL="${REPO_URL:-https://github.com/FoodSW/Full-gallary.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/swire-gallery}"
APP_PORT="${APP_PORT:-3000}"
DB_NAME="${DB_NAME:-gallery}"
DB_USER="${DB_USER:-gallery}"
DB_PASSWORD="${DB_PASSWORD:-}"
SERVICE_NAME="swire-gallery"
# The unprivileged user the service runs as: the invoking sudo user, else current user.
SERVICE_USER="${SERVICE_USER:-${SUDO_USER:-$(id -un)}}"

log()  { printf '\n\033[1;36m==>\033[0m \033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

# sudo helper — works whether or not we are already root.
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi
command -v sudo >/dev/null 2>&1 || [ "$(id -u)" -eq 0 ] || die "sudo is required but not installed."

# run_as USER cmd… — run a command as another user. Uses `runuser` when we are
# already root (so no bogus empty-token before `-u`) and `sudo -u` otherwise.
run_as() {
  local u="$1"; shift
  if [ "$(id -u)" -eq 0 ]; then
    runuser -u "$u" -- "$@"
  else
    sudo -u "$u" "$@"
  fi
}

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------
log "Updating apt and installing base packages (git, curl, ca-certificates)…"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y
$SUDO apt-get install -y git curl ca-certificates gnupg openssl

# ---------------------------------------------------------------------------
# 2. Node.js 20 LTS (Next.js 16 requires Node >= 20.9)
# ---------------------------------------------------------------------------
if command -v node >/dev/null 2>&1 && node -e 'process.exit(parseInt(process.versions.node)>=20?0:1)'; then
  log "Node.js $(node -v) already present — skipping."
else
  log "Installing Node.js 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi
log "Node: $(node -v),  npm: $(npm -v)"

# ---------------------------------------------------------------------------
# 3. pnpm
# ---------------------------------------------------------------------------
if command -v pnpm >/dev/null 2>&1; then
  log "pnpm $(pnpm -v) already present — skipping."
else
  log "Installing pnpm…"
  $SUDO npm install -g pnpm
fi

# ---------------------------------------------------------------------------
# 4. PostgreSQL
# ---------------------------------------------------------------------------
if command -v psql >/dev/null 2>&1; then
  log "PostgreSQL already present — skipping install."
else
  log "Installing PostgreSQL…"
  $SUDO apt-get install -y postgresql postgresql-contrib
fi
$SUDO systemctl enable --now postgresql

# ---------------------------------------------------------------------------
# 5. Database + user provisioning
# ---------------------------------------------------------------------------
# Generate a password only if one wasn't supplied and we haven't created it before.
CREDS_FILE="${APP_DIR}/.db-credentials"
if [ -z "$DB_PASSWORD" ] && [ -f "$CREDS_FILE" ]; then
  # Reuse the previously generated password on re-run.
  DB_PASSWORD="$($SUDO cat "$CREDS_FILE" 2>/dev/null | sed -n 's/^DB_PASSWORD=//p')"
fi
if [ -z "$DB_PASSWORD" ]; then
  DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  log "Generated a new database password."
fi

log "Provisioning PostgreSQL role '${DB_USER}' and database '${DB_NAME}'…"
# Create/idempotently update the role.
run_as postgres psql -d template1 -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL
# Create the database if missing (CREATE DATABASE can't run inside a DO block).
if ! run_as postgres psql -d template1 -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  run_as postgres createdb --maintenance-db=template1 -O "${DB_USER}" "${DB_NAME}"
fi

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# ---------------------------------------------------------------------------
# 6. Clone or update the repository
# ---------------------------------------------------------------------------
if [ -d "${APP_DIR}/.git" ]; then
  log "Updating existing checkout in ${APP_DIR}…"
  $SUDO git -C "${APP_DIR}" fetch --all --prune
  $SUDO git -C "${APP_DIR}" checkout "${REPO_BRANCH}"
  $SUDO git -C "${APP_DIR}" reset --hard "origin/${REPO_BRANCH}"
else
  log "Cloning ${REPO_URL} (branch ${REPO_BRANCH}) into ${APP_DIR}…"
  $SUDO mkdir -p "${APP_DIR}"
  $SUDO git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

# Ensure the service user owns the app directory.
$SUDO chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}"

# ---------------------------------------------------------------------------
# 7. Environment file + saved credentials
# ---------------------------------------------------------------------------
log "Writing ${APP_DIR}/.env.local…"
$SUDO tee "${APP_DIR}/.env.local" >/dev/null <<ENV
DATABASE_URL=${DATABASE_URL}
NODE_ENV=production
PORT=${APP_PORT}
ENV
# Persist the DB password so re-runs reuse it.
$SUDO tee "${CREDS_FILE}" >/dev/null <<CREDS
DB_PASSWORD=${DB_PASSWORD}
CREDS
$SUDO chown "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}/.env.local" "${CREDS_FILE}"
$SUDO chmod 600 "${APP_DIR}/.env.local" "${CREDS_FILE}"

# ---------------------------------------------------------------------------
# 8. Apply the database schema
# ---------------------------------------------------------------------------
if [ -f "${APP_DIR}/schema.sql" ]; then
  log "Applying database schema…"
  PGPASSWORD="${DB_PASSWORD}" psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${APP_DIR}/schema.sql"
else
  warn "schema.sql not found — the app will create tables on first run."
fi

# ---------------------------------------------------------------------------
# 9. Install dependencies and build (run as the service user)
# ---------------------------------------------------------------------------
log "Installing dependencies (pnpm install)…"
# Native build scripts (sharp, msw) are approved via onlyBuiltDependencies in
# pnpm-workspace.yaml. A node_modules left over from an earlier run (created
# before that approval existed) records those builds as "ignored" and is reused
# on re-install, so ERR_PNPM_IGNORED_BUILDS keeps recurring. Remove node_modules
# first so the corrected build-approval config always takes effect, then run the
# approved build scripts explicitly as a belt-and-suspenders step.
run_as "${SERVICE_USER}" bash -lc "cd '${APP_DIR}' && rm -rf node_modules && (pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile) && pnpm rebuild sharp msw 2>/dev/null || true"

log "Building the app (pnpm build)…"
run_as "${SERVICE_USER}" bash -lc "cd '${APP_DIR}' && pnpm build"

# ---------------------------------------------------------------------------
# 10. systemd service (auto-start on boot, restart on failure)
# ---------------------------------------------------------------------------
PNPM_BIN="$(command -v pnpm)"
log "Creating systemd service '${SERVICE_NAME}'…"
$SUDO tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<UNIT
[Unit]
Description=Swire Bulk Gallery (Next.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env.local
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
ExecStart=${PNPM_BIN} start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

$SUDO systemctl daemon-reload
$SUDO systemctl enable "${SERVICE_NAME}"
$SUDO systemctl restart "${SERVICE_NAME}"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
IP_ADDR="$(hostname -I 2>/dev/null | awk '{print $1}')"
log "Installation complete."
cat <<SUMMARY

  ------------------------------------------------------------------
  Swire Bulk Gallery is now running as a systemd service.

  App URL      : http://${IP_ADDR:-localhost}:${APP_PORT}
  Admin login  : username 'max'  /  password '1234567890'
                 (change it in the admin panel after first login)

  Install dir  : ${APP_DIR}
  Database     : ${DB_NAME}  (user: ${DB_USER})
  DB password  : saved to ${CREDS_FILE}

  Useful commands:
    sudo systemctl status  ${SERVICE_NAME}
    sudo systemctl restart ${SERVICE_NAME}
    sudo journalctl -u ${SERVICE_NAME} -f      # live logs

  To update later, just re-run this script.
  ------------------------------------------------------------------

SUMMARY
