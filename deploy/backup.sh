#!/bin/sh
# Nightly Postgres backup for the expense tracker. Intended to run via cron on
# the Pi host, e.g.:
#   0 3 * * * /home/pi/expense-tracker/deploy/backup.sh >> /home/pi/expense-tracker/deploy/backup.log 2>&1
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
KEEP_DAYS=14
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

cd "$SCRIPT_DIR"
# shellcheck disable=SC1091
. ./.env

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-expense_tracker}" "${POSTGRES_DB:-expense_tracker}" \
  | gzip > "$BACKUP_DIR/expense_tracker-$TIMESTAMP.sql.gz"

find "$BACKUP_DIR" -name "expense_tracker-*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "Backup written to $BACKUP_DIR/expense_tracker-$TIMESTAMP.sql.gz"
