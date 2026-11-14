#!/usr/bin/env bash
# One-time setup of automatic deploys on the server (docs/DEPLOY.md §3a).
#
#   sudo scripts/deploy/install.sh
#
# Installs two systemd units — nasteh-deploy.service (runs auto-deploy.sh once)
# and nasteh-deploy.timer (every 2 minutes) — pointing at THIS checkout. Safe to
# re-run (it rewrites the units). Remove with:
#   sudo systemctl disable --now nasteh-deploy.timer
#   sudo rm /etc/systemd/system/nasteh-deploy.{service,timer} && sudo systemctl daemon-reload
set -euo pipefail

if [ "$(id -u)" != "0" ]; then
  echo "Run with sudo: sudo $0" >&2
  exit 1
fi
command -v systemctl >/dev/null || { echo "systemd not found — see DEPLOY §3a for the cron alternative." >&2; exit 1; }
command -v flock >/dev/null || { echo "flock not found (package util-linux)." >&2; exit 1; }

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[ -f "$repo_dir/docker-compose.yml" ] && [ -f "$repo_dir/.env" ] || {
  echo "Expected docker-compose.yml and .env in $repo_dir — run this from the production checkout." >&2
  exit 1
}

# Run as the checkout's owner when they can use Docker, so files the deploy
# checks out stay theirs; otherwise as root (auto-deploy.sh handles git's
# safe.directory for that case).
owner="$(stat -c %U "$repo_dir")"
if [ "$owner" = root ] || id -nG "$owner" 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
  run_as="$owner"
else
  run_as=root
  echo "Note: $owner is not in the docker group, so deploys run as root."
fi

chmod +x "$repo_dir/scripts/deploy/auto-deploy.sh"

cat > /etc/systemd/system/nasteh-deploy.service <<EOF
[Unit]
Description=Nasteh — deploy the production branch if it moved
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$run_as
WorkingDirectory=$repo_dir
ExecStart=$repo_dir/scripts/deploy/auto-deploy.sh
# A build + migrations + healthcheck can take several minutes.
TimeoutStartSec=1800
EOF

cat > /etc/systemd/system/nasteh-deploy.timer <<EOF
[Unit]
Description=Nasteh — check for a new production deploy every 2 minutes

[Timer]
OnBootSec=3min
OnUnitInactiveSec=2min
AccuracySec=15s

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now nasteh-deploy.timer
echo
echo "Installed. Checkout: $repo_dir — runs as: $run_as"
echo "Status:  systemctl list-timers nasteh-deploy.timer"
echo "Logs:    journalctl -u nasteh-deploy -f"
