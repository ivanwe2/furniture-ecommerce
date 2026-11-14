#!/usr/bin/env bash
# Pull-based production deploy (docs/DEPLOY.md §3a).
#
# Run every 2 minutes by the nasteh-deploy systemd timer (scripts/deploy/
# install.sh). It watches the `production` branch on GitHub — which only Ivan,
# or the "Deploy" workflow after Ivan approves it, can move — and when it moves:
#
#   1. pg_dump into the backups volume (the rollback point for data)
#   2. tag the running image nasteh-bg:previous (the rollback point for code)
#   3. check out the new commit, build with --pull, pull service images, up -d
#   4. wait for the app healthcheck; unhealthy → put the previous image and
#      commit back, and never retry that same target automatically
#
# No inbound ports, no tokens on the server: the repository is public, so a
# plain `git fetch` is enough. Logs go to the journal (journalctl -u
# nasteh-deploy) and to .deploy/deploy.log; an optional email goes out through
# the stack's own mail relay (DEPLOY_NOTIFY_EMAIL in .env).
#
# Everything lives inside main(), called on the last line: `git checkout`
# replaces this very file mid-run, and bash reads scripts incrementally —
# a function is parsed whole before it runs.
set -euo pipefail

main() {
  local repo_dir branch state_dir health_timeout
  repo_dir="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
  branch="${DEPLOY_BRANCH:-production}"
  state_dir="${STATE_DIR:-$repo_dir/.deploy}"
  health_timeout="${HEALTH_TIMEOUT:-600}"

  cd "$repo_dir"
  mkdir -p "$state_dir"

  # One deploy at a time (a slow build can outlast the 2-minute timer).
  exec 9>"$state_dir/lock"
  flock -n 9 || exit 0

  # When run as root on a checkout owned by someone else (install.sh falls
  # back to that if the owner is not in the docker group).
  git() { command git -c safe.directory="$repo_dir" "$@"; }

  # The branch appears with the first press of „Deploy"; until then, nothing.
  if ! git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
    exit 0
  fi
  git fetch --quiet origin "+refs/heads/$branch:refs/remotes/origin/$branch"

  local target current
  target="$(git rev-parse "origin/$branch")"
  current="$(cat "$state_dir/deployed" 2>/dev/null || git rev-parse HEAD)"
  [ "$target" = "$current" ] && exit 0
  # A target that already failed is not retried every 2 minutes; the next
  # „Deploy" (a new commit on the branch) is.
  [ "$target" = "$(cat "$state_dir/failed" 2>/dev/null || true)" ] && exit 0

  if ! git diff --quiet || ! git diff --cached --quiet; then
    log "ERROR: tracked files were edited on the server — refusing to deploy $target. Commit through GitHub, or 'git stash' them."
    notify "FAILED" "Tracked files were edited on the server; nothing was deployed."
    echo "$target" > "$state_dir/failed"
    exit 1
  fi

  local previous
  previous="$(git rev-parse HEAD)"
  log "deploying ${target:0:12} (running ${previous:0:12})"

  if ! docker compose exec -T backup sh -c \
    "pg_dump | gzip > /backups/db_pre-deploy_$(date -u +%Y%m%dT%H%M%SZ)_${target:0:7}.sql.gz"; then
    log "ERROR: pre-deploy database backup failed — not deploying."
    notify "FAILED" "The pre-deploy database backup failed, so nothing was deployed."
    exit 1
  fi
  if docker image inspect nasteh-bg:latest >/dev/null 2>&1; then
    docker tag nasteh-bg:latest nasteh-bg:previous
  fi

  git checkout --quiet --detach "$target"
  if ! docker compose build --pull app; then
    log "ERROR: build failed — staying on ${previous:0:12}."
    git checkout --quiet --detach "$previous"
    echo "$target" > "$state_dir/failed"
    notify "FAILED" "The image build failed. The site still runs ${previous:0:12}."
    exit 1
  fi
  docker compose pull --ignore-buildable --quiet || log "warning: could not pull service images; using the cached ones"
  docker compose up -d

  if wait_healthy "$health_timeout"; then
    echo "$target" > "$state_dir/deployed"
    rm -f "$state_dir/failed"
    log "deployed ${target:0:12}"
    notify "OK" "Deployed $(git log -1 --format='%h %s' "$target")"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi

  log "ERROR: the app did not become healthy — rolling back to ${previous:0:12}."
  git checkout --quiet --detach "$previous"
  if docker image inspect nasteh-bg:previous >/dev/null 2>&1; then
    docker tag nasteh-bg:previous nasteh-bg:latest
  fi
  docker compose up -d
  echo "$target" > "$state_dir/failed"
  if wait_healthy "$health_timeout"; then
    log "rolled back to ${previous:0:12}"
    notify "ROLLED BACK" "${target:0:12} never became healthy; the site is back on ${previous:0:12}. Database changes made by its migrations are NOT undone — the pre-deploy dump is in the backups volume."
  else
    log "ERROR: still unhealthy after the rollback — needs a human."
    notify "DOWN" "${target:0:12} failed and the rollback to ${previous:0:12} is not healthy either. Check: docker compose logs app"
  fi
  exit 1
}

log() {
  local line
  line="$(date -u +%FT%TZ) [deploy] $*"
  echo "$line"
  echo "$line" >> "${STATE_DIR:-.deploy}/deploy.log" 2>/dev/null || true
}

# The app container's own healthcheck (docker-compose.yml) — migrations included.
wait_healthy() {
  local timeout="$1" waited=0 id status
  while [ "$waited" -lt "$timeout" ]; do
    id="$(docker compose ps -q app 2>/dev/null || true)"
    status="$( [ -n "$id" ] && docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo missing)"
    [ "$status" = healthy ] && return 0
    sleep 5
    waited=$((waited + 5))
  done
  return 1
}

# Optional: DEPLOY_NOTIFY_EMAIL (and EMAIL_FROM) from .env, sent through the
# stack's mail relay. Never fails the deploy.
notify() {
  local state="$1" body="$2" to from
  to="$(sed -n 's/^DEPLOY_NOTIFY_EMAIL=//p' .env 2>/dev/null | tail -1 | tr -d '"'"'"' ')"
  [ -n "$to" ] || return 0
  from="$(sed -n 's/^EMAIL_FROM=//p' .env 2>/dev/null | tail -1 | sed 's/.*<\(.*\)>.*/\1/' | tr -d '"'"'"' ')"
  from="${from:-no-reply@nasteh.bg}"
  printf 'From: %s\nTo: %s\nSubject: [nasteh deploy] %s\n\n%s\n\nHost: %s\n' \
    "$from" "$to" "$state" "$body" "$(hostname)" |
    docker compose exec -T mail sendmail -f "$from" "$to" >/dev/null 2>&1 || log "warning: notification email not sent"
}

main "$@"
