#!/bin/sh
# Container entrypoint (docs/DEPLOY.md §9).
#
# Starts as root ONLY to make sure the media folder belongs to the app user,
# then drops to that user (uid 1001) for everything else — `payload migrate`
# and `next start` never run as root. This is the pattern the official
# Postgres/Redis images use for their data directories.
#
# Why: uploads are written to MEDIA_DIR by the non-root app. A root-owned
# volume (created by an older image) or a host bind-mount breaks every image
# save with EACCES — which is exactly what happened on the first production
# import. Fixing it here means no manual `chown` on the server.
set -eu

APP_USER=nasteh
APP_UID=1001
MEDIA="${MEDIA_DIR:-/app/media}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$MEDIA" 2>/dev/null || true
  # Re-own only when something is not the app user's: a large, correctly owned
  # volume costs one directory walk per boot, not a recursive chown.
  if [ -n "$(find "$MEDIA" ! -user "$APP_UID" -print -quit 2>/dev/null)" ]; then
    if chown -R "$APP_UID:$APP_UID" "$MEDIA" 2>/dev/null; then
      echo "[entrypoint] fixed ownership of $MEDIA for $APP_USER (uid $APP_UID)"
    else
      # e.g. a host bind-mount inside an unprivileged Proxmox LXC, where even
      # container root may not chown. Start anyway — the site works, only
      # uploads fail, and the admin import screen names the problem.
      echo "[entrypoint] WARNING: $MEDIA could not be re-owned for $APP_USER (uid $APP_UID); image uploads will fail. See docs/DEPLOY.md §9." >&2
    fi
  fi
  exec env HOME="/home/$APP_USER" setpriv --reuid="$APP_USER" --regid="$APP_USER" --init-groups -- "$@"
fi

# Already non-root (e.g. `docker run --user`): nothing to fix, just run.
exec "$@"
