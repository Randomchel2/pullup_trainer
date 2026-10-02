#!/usr/bin/env bash
#
# Richtet den Dienst auf einem frischen Debian/Ubuntu-Server ein.
# Erwartet, dass der Quellcode bereits unter /opt/pullup-trainer liegt.
#
#   sudo ./deploy/install.sh
#
set -euo pipefail

SRC_DIR="${SRC_DIR:-/opt/pullup-trainer}"
DB_DIR=/var/lib/pullup-trainer
BACKUP_DIR=/var/backups/pullup

if [ "$(id -u)" -ne 0 ]; then
  echo "Bitte mit sudo ausführen." >&2
  exit 1
fi

# 1. Node 24+ (Ubuntu 24.04/25.04 liefert ihn schon, sonst via NodeSource)
if ! command -v node >/dev/null; then
  apt-get update && apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -e 'const [j]=process.versions.node.split(".").map(Number);
  if (j < 24) { console.error("Node 24+ nötig, gefunden "+process.versions.node); process.exit(1); }'

# 2. Abhängigkeiten (auf dem Server reicht express; der Rest ist dev-only)
cd "$SRC_DIR"
npm ci --omit=dev --workspace server --include-workspace-root || npm install --omit=dev

# 3. Nutzer und Verzeichnisse
id -u pullup >/dev/null 2>&1 || useradd --system --home "$SRC_DIR" --shell /usr/sbin/nologin pullup
mkdir -p "$DB_DIR" "$BACKUP_DIR"
chown -R pullup:pullup "$DB_DIR" "$BACKUP_DIR"
chmod 750 "$DB_DIR"

# 4. Frontend einmalig bauen (auf kleinen VMs lieber lokal bauen und
#    client/dist hochladen – sonst läuft Vite in den OOM-Killer)
if [ ! -f client/dist/index.html ]; then
  echo "Baue Frontend …"
  npm ci
  npm run build
fi

# 5. Dienste
install -m 644 "$SRC_DIR/deploy/pullup-trainer.service" /etc/systemd/system/
install -m 644 "$SRC_DIR/deploy/pullup-backup.service" /etc/systemd/system/
install -m 644 "$SRC_DIR/deploy/pullup-backup.timer" /etc/systemd/system/
chmod 755 "$SRC_DIR/deploy/backup.sh"

systemctl daemon-reload
systemctl enable --now pullup-trainer.service
systemctl enable --now pullup-backup.timer

# 6. Caddy als Reverse Proxy
if ! command -v caddy >/dev/null; then
  echo "Caddy fehlt – installiere ihn und trage deine Domain in deploy/Caddyfile ein:"
  echo "  apt install -y caddy"
  echo "  cp $SRC_DIR/deploy/Caddyfile /etc/caddy/Caddyfile && sed -i 's/pullup.example.com/DEINE.DOMAIN/' /etc/caddy/Caddyfile"
  echo "  systemctl reload caddy"
else
  echo "Caddy ist da – bitte Domain in deploy/Caddyfile anpassen und: cp deploy/Caddyfile /etc/caddy/Caddyfile"
fi

echo
echo "Status:  systemctl status pullup-trainer"
echo "Log:     journalctl -u pullup-trainer -f"
echo "Backup:  ls $BACKUP_DIR"
echo "Health:  curl -s localhost:3001/api/health"
