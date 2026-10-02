#!/usr/bin/env bash
#
# SQLite-Sicherung über die Online-Backup-API aus node:sqlite. Die läuft
# neben dem laufenden Server, sperrt die Datenbank nicht und kommt mit WAL
# zurecht – ein simples `cp` einer WAL-Datei wäre inkonsistent.
#
#   ./deploy/backup.sh
#   PULLUP_DB=... BACKUP_DIR=... KEEP_DAYS=... ./deploy/backup.sh
#
# Als Timer laufen lassen: deploy/pullup-backup.timer + .service

set -euo pipefail

DB="${PULLUP_DB:-/var/lib/pullup-trainer/pullup.db}"
DEST="${BACKUP_DIR:-/var/backups/pullup}"
KEEP="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/pullup-$STAMP.db"

[ -f "$DB" ] || { echo "Keine Datenbank unter $DB" >&2; exit 1; }
mkdir -p "$DEST"

node --input-type=module -e '
  import { DatabaseSync, backup } from "node:sqlite";
  const [, src, dest] = process.argv;   // argv[0] = node, argv[1] = erster Pfad
  const db = new DatabaseSync(src, { readOnly: true });
  await backup(db, dest);
  db.close();
' "$DB" "$OUT"

# Erst komprimieren, wenn die Kopie wirklich in Ordnung ist.
gzip -9 "$OUT"
echo "Sicherung: $OUT.gz ($(du -h "$OUT.gz" | cut -f1))"

find "$DEST" -name 'pullup-*.db.gz' -type f -mtime "+$KEEP" -delete
