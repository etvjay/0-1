#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${ZERO_ONE_REPO_URL:-https://github.com/etvjay/0-1.git}"
APP_DIR="${ZERO_ONE_APP_DIR:-/opt/zero-one}"
SERVICE_USER="${ZERO_ONE_SERVICE_USER:-zero-one}"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/install-ubuntu.sh" >&2
  exit 1
fi

apt-get update
apt-get install -y git curl ca-certificates

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'Number(process.versions.node.split(`.`)[0])' 2>/dev/null || echo 0)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$SERVICE_USER"
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch --all --prune
  git -C "$APP_DIR" pull --ff-only
fi

mkdir -p "$APP_DIR/data/runtime" "$APP_DIR/data/hunt/reports" "$APP_DIR/data/hunt/research"
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"

sudo -u "$SERVICE_USER" bash -lc "cd '$APP_DIR' && npm install && npm run check"

if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  chown "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo "Created $APP_DIR/.env. Fill credentials and signer settings before enabling live trading."
fi

cp "$APP_DIR/deploy/systemd/zero-one.service" /etc/systemd/system/zero-one.service
systemctl daemon-reload
systemctl enable zero-one.service

echo "Installed. After editing $APP_DIR/.env, run: sudo systemctl restart zero-one"
echo "Logs: journalctl -u zero-one -f"
