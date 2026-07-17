# DEPLOY.md — self-hosted Docker operations

The current platform doc. Настех runs as a multi-service Docker Compose stack
(app + Postgres + Redis + mail relay + backup), fronted by the client
sysadmin's reverse proxy. Replaces the retired Cloudflare deploy
(`CLOUDFLARE.md`, legacy). See ARCHITECTURE §1-3, §11.

```
Browser ─▶ reverse proxy (nginx/Caddy — TLS) ─▶ app :3000  ┐
                                                db  (Postgres 18) ├ internal
                                                redis (rate limit) │ `backend`
                                                mail  (Postfix+DKIM)│ network
                                                backup (pg_dump+media) ┘
```

The sysadmin owns TLS, DNS, and mail-DNS (SPF/DKIM/DMARC + PTR). Only
`app:3000` is published (to loopback, for the proxy); db/redis/mail/backup are
internal-only. Persistent state = volumes `pgdata`, `media`, `maildata`,
`backups`.

---

## 1. Prerequisites (on the host)

- Docker Engine + Compose plugin (`docker compose version`).
- A reverse proxy terminating TLS for `nasteh.bg` and proxying to the app
  (see §6).
- Mail **DNS** for the domain — SPF, DKIM, DMARC (and a PTR + open outbound
  port 25, or a `RELAYHOST` smarthost). The mail server itself is in the stack;
  only its DNS is external — see §7.
- No external database/cache/mail service to provision — Postgres, Redis, and
  the Postfix relay all run as containers in the stack.

---

## 2. Configure — `.env`

```bash
cp .env.example .env
# then edit .env
```

Every key (`.env.example` is the authoritative list):

| Key | What | Notes |
|---|---|---|
| `PAYLOAD_SECRET` | admin session/JWT secret | `openssl rand -hex 32`. Keep stable — rotating logs everyone out. |
| `DATABASE_URI` | Postgres connection | `postgres://nasteh:<pw>@db:5432/nasteh` — must match the `POSTGRES_*` below. |
| `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` | `db` container init | first boot creates this role + DB on the `pgdata` volume. |
| `REDIS_URL` | rate-limit store | `redis://redis:6379`. If unset, the app falls back to an in-process limiter. |
| `MEDIA_DIR` | uploads dir | `/app/media` (the `media` volume). |
| `NEXT_PUBLIC_SITE_URL` | public URL | `https://nasteh.bg`. **Build-time** — see the note below. |
| `NEXT_PUBLIC_SHOW_BGN` | dual EUR/BGN prices | `true` until 2026-08-08, then `false`. **Build-time.** |
| `ALTCHA_HMAC_KEY` | Altcha challenge secret | `openssl rand -hex 32`. Runtime; self-hosted proof-of-work — no external service. |
| `SMTP_HOST`/`SMTP_PORT` | app → relay | `mail` / `587` (the in-stack relay, no auth). Or point at an external smarthost. |
| `SMTP_USER`/`SMTP_PASS` | mail auth | empty for the internal relay; set for an external smarthost. |
| `EMAIL_FROM` | envelope sender | `Настех <orders@nasteh.bg>` — must be under `MAIL_SENDER_DOMAINS`. |
| `ORDER_INBOX_EMAIL` | order/contact inbox | where the owner receives notifications. |
| `MAIL_HOSTNAME` | relay hostname | `mail.nasteh.bg` — used in HELO + DKIM. |
| `MAIL_SENDER_DOMAINS` | relay allowed senders | `nasteh.bg`. |
| `RELAYHOST` (+ `_USERNAME`/`_PASSWORD`) | optional smarthost | e.g. `[smtp.provider.com]:587` when outbound :25 is blocked; empty = direct delivery. |

> **`NEXT_PUBLIC_*` are baked in at `docker build`**, not read at runtime.
> If you change one, rebuild the image (`docker compose up -d --build`).
> All others (Postgres/Redis/mail/Altcha secrets) are read at runtime.

---

## 3. Build & run

```bash
docker compose up -d --build      # build the image and start
docker compose logs -f app        # watch startup (migrations then server)
```

On start the container runs `payload migrate` (idempotent) then `next start`.
The compose healthcheck polls `/robots.txt`; `docker compose ps` shows
`healthy` once it's up.

**First admin user:** open `https://nasteh.bg/admin` — Payload prompts to
create the first user on the empty DB.

Update to a new version:

```bash
git pull
docker compose up -d --build      # rebuild + restart; migrations run on boot
```

---

## 4. Data cutover — not needed

Go-live starts **fresh**: on first boot the app runs `payload migrate` against
the empty `db`, then the owner enters content via `/admin`. The retired
Cloudflare instance was a throwaway test — there is no production data to
import, and no Cloudflare/`wrangler` access is needed anywhere in this deploy.

---

## 5. Backups

The **`backup`** service already runs automatically: once a day it writes a
`pg_dump` (`db_<ts>.sql.gz`) and a media tarball (`media_<ts>.tar.gz`) to the
`backups` volume, keeping the last 14 of each.

```bash
# List the automatic backups.
docker compose exec backup ls -lh /backups

# Trigger an extra on-demand snapshot right now.
docker compose exec backup sh -c 'pg_dump | gzip > /backups/db_manual_$(date +%F).sql.gz'
```

**These live on the host — copy them OFF-box** (they don't survive host loss).
Either mount the `backups` volume to an off-host path, or sync it on a host
cron, e.g.:

```bash
docker run --rm -v <project>_backups:/b -v "$PWD":/out alpine \
  cp -r /b/. /out/nasteh-backups/          # then rsync/scp /out off the host
```

**Restore** into a fresh stack (before the app has data, or after
`docker compose down` + recreating the `db`):

```bash
# DB — pipe a dump into the db container (drops into the existing schema).
gunzip -c db_<ts>.sql.gz | docker compose exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Media — untar into the media volume.
docker run --rm -v <project>_media:/media -v "$PWD":/in alpine \
  sh -c 'tar xzf /in/media_<ts>.tar.gz -C /media'
```

---

## 6. Reverse proxy (sysadmin)

Terminate TLS and proxy to `127.0.0.1:3000`. The compose publishes the app on
**loopback only** (not exposed to the network) — a same-host proxy reaches it
directly; a proxy on another host needs the port mapping adjusted (see the
`docker-compose.yml` comment). Two things the app relies on:

- **`X-Forwarded-For`** — the checkout/contact rate limiter and logs derive
  the client IP from it (ARCHITECTURE §7). Without it every visitor shares one
  bucket.
- **`client_max_body_size` ~12M** — product image uploads in the admin
  (~10 MB cap) must not be truncated by the proxy.

nginx sketch:

```nginx
server {
  server_name nasteh.bg;
  client_max_body_size 12m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  # ... listen 443 ssl; TLS cert config ...
}
```

Caching the media route (`/api/media/file/`) at the proxy is a nice-to-have.

---

## 7. Email — the in-stack `mail` relay (§mail)

Mail is generated and sent **inside the stack**: the app relays (no auth, over
the internal Docker network) to the **`mail`** service — a send-only Postfix +
OpenDKIM relay — which **DKIM-signs** each message and delivers it (directly, or
via a `RELAYHOST` smarthost). No transactional SaaS. `EMAIL_FROM` must be an
address under `MAIL_SENDER_DOMAINS` (default `orders@nasteh.bg`).

The container is app-self-contained; **deliverability still depends on DNS the
sysadmin publishes** (receivers won't trust unauthenticated mail):

**1. DKIM** — the relay auto-generates a key on first boot (persisted on the
`maildata` volume, selector `mail`). Read the DNS record and publish it:

```bash
docker compose exec mail cat /etc/opendkim/keys/nasteh.bg.txt
# → publish a TXT record at  mail._domainkey.nasteh.bg  with the v=DKIM1;… value
```

**2. SPF** — TXT at `nasteh.bg` authorising this host to send. Direct delivery:
`v=spf1 a mx ip4:<host-public-ip> -all`. Via a smarthost: include it, e.g.
`v=spf1 include:<provider-spf> -all`.

**3. DMARC** — TXT at `_dmarc.nasteh.bg`, e.g.
`v=DMARC1; p=quarantine; rua=mailto:postmaster@nasteh.bg`.

**4. Direct delivery needs more:** a matching **PTR** (reverse DNS) on the
host's public IP, and **outbound port 25 open** (many ISPs/clouds block it).
If either isn't available, set **`RELAYHOST`** (+ `RELAYHOST_USERNAME/PASSWORD`)
in `.env` to a smarthost (the domain's mail host or a Workspace SMTP relay) and
the reputation problem goes away.

Test after wiring: place a real order and confirm both the owner and customer
emails arrive (check spam too) at a `gmail.com` and an `abv.bg` address. Watch
the relay: `docker compose logs -f mail` (look for `status=sent`).

---

## 8. Known watch-items

- **Native build scripts (sharp/esbuild).** pnpm 11 runs these only if
  approved in `pnpm-workspace.yaml` (`allowBuilds:` — NOT the older
  `onlyBuiltDependencies`), which the Dockerfile copies into the deps stage.
  Verified: the image builds on Linux with the committed (Windows-generated)
  lockfile and sharp works. If a future pnpm bump changes the approval format,
  re-run `pnpm approve-builds` and keep the file copied in the Dockerfile.
- **`NEXT_PUBLIC_*` are build-time.** Changing the site URL / BGN flag requires
  a rebuild, not just an env edit + restart. (`ALTCHA_HMAC_KEY` is a *runtime*
  server secret — no rebuild needed.)
- **2026-08-08:** flip `NEXT_PUBLIC_SHOW_BGN` to `false` and rebuild (prices
  become EUR-only). Set a reminder.
- **Single app instance.** Rate limiting is on Redis (shared-ready) and the DB
  is Postgres (concurrent writes fine), so scaling the *app* to replicas is
  feasible — but the Next.js content cache is still in-process, so revisit
  cache invalidation (ARCHITECTURE §4) before running multiple app replicas.
- **Postgres 18 volume layout.** The `db` volume mounts at
  `/var/lib/postgresql` (PG 18+ convention — data lands in a version subdir),
  NOT `/var/lib/postgresql/data`. A major Postgres upgrade needs `pg_upgrade`
  (or dump/restore via §5) — don't just bump the image tag.

---

## 9. Host & container notes (incl. Proxmox / LXC)

The app is one modest Node process, now alongside Postgres / Redis / the mail
relay; the risks below are about the host it runs on — mostly disk-fill and
memory.

- **Docker in a Proxmox LXC.** Running Docker inside an (unprivileged) LXC
  needs the LXC set up for it: `features: nesting=1` (often `keyctl=1` too), and
  a backing where Docker can use `overlay2`. On a **ZFS-backed** LXC, Docker may
  fall back to the `vfs` driver — slow and it copies whole layers (disk-hungry);
  check `docker info | grep "Storage Driver"`. If you have the choice, running
  Docker in a small **VM** instead of an LXC sidesteps all of this — a common
  choice for Docker workloads on Proxmox.
- **Give it enough RAM.** The whole stack wants ~2 GB: app ~1 GB (Next SSR +
  Payload + sharp), Postgres ~0.5 GB, Redis/mail/backup ~0.4 GB combined.
  Compose caps each service (`deploy.resources.limits.memory`) so no single one
  can OOM-kill the host — tune those caps to the LXC/VM you give it. If you cap
  tightly, also cap Node's heap for the app so it stays under its limit — Node
  doesn't always read a cgroup memory cap correctly:
  `NODE_OPTIONS=--max-old-space-size=<~75% of the app cap in MB> --no-deprecation`
  in `.env` (repeat `--no-deprecation` — `.env` replaces the image's value, it
  doesn't merge).
- **Host disk creep from image churn.** Every `docker compose up -d --build`
  leaves the previous image's layers behind; on a small host disk they add up.
  Run `docker image prune -f` after redeploys (or `docker system prune -f`
  occasionally). Container logs are already capped (§3 compose).
- **`.env` permissions.** It holds `PAYLOAD_SECRET`, the Postgres password, and
  the Altcha secret — `chmod 600 .env`.
- **Postgres durability.** Concurrent writes are handled natively (no
  serialisation). Back up via the `backup` sidecar / `pg_dump` (§5), never a raw
  copy of the data dir. `pgdata` is the only volume that must survive; losing
  `media` loses uploads (restore from §5), `maildata`/`backups` regenerate.
