#!/usr/bin/env bash
#
# Swire Bulk Gallery — uninstaller for Ubuntu 22.04 server
# --------------------------------------------------------
# Reverses install.sh: stops and removes the systemd service, frees the port,
# and deletes the app directory. With --purge it also drops the PostgreSQL
# database and role (this destroys all gallery data — vessels, photos, users).
#
# Usage (as a user with sudo):
#   ./uninstall.sh              # remove service + app files, keep the database
#   ./uninstall.sh --purge      # also drop the database and role (DESTRUCTIVE)
#   ./uninstall.sh --purge --yes    # skip the confirmation prompt
#
# Or straight from GitHub:
#   curl -fsSL https://raw.githubusercontent.com/FoodSW/Full-gallary/main/uninstall.sh | bash -s -- --purge
#
# What it does NOT remove: Node.js, pnpm, and the PostgreSQL server packages,
# since those are shared system tools other apps may rely on. Remove them
# manually with apt if you truly want them gone.
#
# Configurable via environment variables (must match your install values):
#   APP_DIR      Install location          (default: /opt/swire-gallery)
#   APP_PORT     Port the app listens on   (default: 3000)
#   DB_NAME      PostgreSQL database name  (default: gallery)
#   DB_USER      PostgreSQL user           (default: gallery)
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_DIR="${APP_DIR:-/opt/swire-gallery}"
APP_PORT="${APP_PORT:-3000}"
DB_NAME="${DB_NAME:-gallery}"
DB_USER="${DB_USER:-gallery}"
SERVICE_NAME="swire-gallery"

PURGE=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --purge)      PURGE=1 ;;
    --yes|-y)     ASSUME_YES=1 ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) printf 'Unknown option: %s\n' "$arg" >&2; exit 1 ;;
  esac
done

log()  { printf '\n\033[1;36m==>\033[0m \033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

# sudo helper — works whether or not we are already root.
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi
command -v sudo >/dev/null 2>&1 || [ "$(id -u)" -eq 0 ] || die "sudo is required but not installed."

# run_as USER cmd… — run a command as another user. Uses runuser when already
# root (so no bogus empty-token before -u) and sudo -u otherwise.
run_as() {
  local u="$1"; shift
  if [ "$(id -u)" -eq 0 ]; then
    runuser -u "$u" -- "$@"
  else
    sudo -u "$u" "$@"
  fi
}

# ---------------------------------------------------------------------------
# Confirmation
# ---------------------------------------------------------------------------
if [ "$PURGE" -eq 1 ] && [ "$ASSUME_YES" -eq 0 ]; then
  warn "This will PERMANENTLY delete the '${DB_NAME}' database and all gallery data."
  # Read from the terminal even when the script is piped in via curl | bash.
  if [ -r /dev/tty ]; then
    printf 'Type "yes" to continue: '
    read -r reply </dev/tty
  else
    reply="no"
  fi
  [ "$reply" = "yes" ] || die "Aborted. Nothing was purged."
fi

# ---------------------------------------------------------------------------
# 1. Stop and remove the systemd service
# ---------------------------------------------------------------------------
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
if [ -f "$UNIT_FILE" ] || $SUDO systemctl list-unit-files 2>/dev/null | grep -q "^${SERVICE_NAME}.service"; then
  log "Stopping and disabling systemd service '${SERVICE_NAME}'…"
  $SUDO systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
  $SUDO systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
  $SUDO rm -f "$UNIT_FILE"
  $SUDO systemctl daemon-reload
  $SUDO systemctl reset-failed "${SERVICE_NAME}" 2>/dev/null || true
else
  warn "Service '${SERVICE_NAME}' not found; skipping."
fi

# Free the port in case an orphaned listener is still holding it.
log "Freeing port ${APP_PORT} (if held)…"
$SUDO fuser -k "${APP_PORT}/tcp" 2>/dev/null || true

# ---------------------------------------------------------------------------
# 2. Remove the application directory
# ---------------------------------------------------------------------------
if [ -d "$APP_DIR" ]; then
  log "Removing application directory ${APP_DIR}…"
  $SUDO rm -rf "$APP_DIR"
else
  warn "App directory ${APP_DIR} not found; skipping."
fi

# ---------------------------------------------------------------------------
# 3. Drop the database and role (only with --purge)
# ---------------------------------------------------------------------------
if [ "$PURGE" -eq 1 ]; then
  if command -v psql >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
    log "Dropping database '${DB_NAME}'…"
    # Terminate any open connections so DROP DATABASE can proceed.
    run_as postgres psql -d template1 -v ON_ERROR_STOP=1 <<SQL || warn "Could not drop database (it may not exist)."
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DB_NAME};
DROP ROLE IF EXISTS ${DB_USER};
SQL
  else
    warn "PostgreSQL not available; skipping database purge."
  fi
else
  warn "Database '${DB_NAME}' was kept. Re-run with --purge to remove it."
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
log "Uninstall complete."
printf '\n'
printf '  Removed: systemd service, app directory (%s)\n' "$APP_DIR"
if [ "$PURGE" -eq 1 ]; then
  printf '  Removed: database "%s" and role "%s"\n' "$DB_NAME" "$DB_USER"
else
  printf '  Kept:    database "%s" (use --purge to remove)\n' "$DB_NAME"
fi
printf '  Kept:    Node.js, pnpm, PostgreSQL server (shared system packages)\n\n'
