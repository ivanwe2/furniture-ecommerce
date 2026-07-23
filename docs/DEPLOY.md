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

**Stack versions (current):** Next.js 16.2.11 · Payload 3.86.0 · React 19.2.8 ·
Node 24 · Postgres 18 · Redis 7 · pnpm 11.10. No cutover/data import (§4) —
go-live starts on an empty DB.

---

## 0. Go-live checklist (first deploy, in order)

Each step links to the detailed section below. Tick as you go.

- [ ] **Host ready** — Docker Engine + Compose plugin; ~2 GB RAM for the whole
      stack; storage driver `overlay2` (§1, §9).
- [ ] **Get the code + `.env`** — clone the repo, `cp .env.example .env`, fill
      **every** key. Generate the two secrets fresh: `PAYLOAD_SECRET` and
      `ALTCHA_HMAC_KEY` (`openssl rand -hex 32` each); set a strong
      `POSTGRES_PASSWORD` and make `DATABASE_URI` match it; set
      `NEXT_PUBLIC_SITE_URL=https://nasteh.bg`, `NEXT_PUBLIC_SHOW_BGN=true`,
      `EMAIL_FROM`, `ORDER_INBOX_EMAIL`, `MAIL_HOSTNAME`, `MAIL_SENDER_DOMAINS`
      (+ `RELAYHOST*` if outbound :25 is blocked). `chmod 600 .env` (§2, §9).
- [ ] **DNS — web** — `A`/`AAAA` for `nasteh.bg` → the host (through the proxy).
- [ ] **Build & run** — `docker compose up -d --build`; watch
      `docker compose logs -f app` (migrations then server); `docker compose ps`
      shows `healthy` (§3).
- [ ] **Reverse proxy + TLS** — terminate TLS, proxy to `127.0.0.1:3000`, pass
      `X-Forwarded-For`, set `client_max_body_size 12m` (§6).
- [ ] **First admin user** — open `https://nasteh.bg/admin`, create it. (Optional:
      seed demo content, then change the seeded admin password.) (§3)
- [ ] **DNS — mail (sending)** — publish DKIM (read it after first boot, §7
      step 1), SPF, DMARC; ensure a matching PTR + open outbound :25, **or** set
      `RELAYHOST` (§7).
- [ ] **DNS — mail (receiving)** — add an MX + forwarding rule at the registrar
      (or ImprovMX) so `orders@`/`info@nasteh.bg` reach the owner's real inbox;
      set `ORDER_INBOX_EMAIL` accordingly (§7 · Receiving).
- [ ] **Email test** — place a real order; confirm owner **and** customer mail
      arrive (check spam) at a `gmail.com` and an `abv.bg` address;
      `docker compose logs -f mail` shows `status=sent` (§7).
- [ ] **Smoke test** — homepage, a product page, add-to-cart, place a full
      cash-on-delivery order; edit a product in `/admin` and confirm it appears
      on the site.
- [ ] **Backups off-box** — confirm the `backup` sidecar wrote snapshots and set
      up an off-host copy (§5).
- [ ] **Set a reminder — 2026-08-08:** flip `NEXT_PUBLIC_SHOW_BGN=false` and
      rebuild (prices go EUR-only) (§8).

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

**Optional — seed sample content** (a demo catalogue: categories, brands, ~23
products) into the running stack. Opt-in (`SEED_ALLOW_PROD=1`) so nothing seeds
by accident; edit or replace it via the admin afterwards:

```bash
docker compose exec -e SEED_ALLOW_PROD=1 -e SKIP_REVALIDATE=1 \
  app node_modules/.bin/tsx scripts/seed-dev.ts
docker compose up -d --force-recreate app   # clear the cache so seeded data shows
```

`SKIP_REVALIDATE=1` is required (a standalone script has no request context for
`revalidateTag`); the recreate then clears Next's tag cache so the new content
appears. It's idempotent (re-running updates by slug) and also seeds an admin
user (`admin@nasteh.bg` / `password123` — **change it**, or set
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

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

- **`X-Real-IP` (+ `X-Forwarded-For`)** — the checkout/contact rate limiter
  derives the client IP from these (ARCHITECTURE §7). The app **prefers
  `X-Real-IP`** because a client cannot forge it — set it to `$remote_addr`. It
  falls back to the *last* `X-Forwarded-For` hop; do **not** rely on the first
  hop, which is client-supplied. Without either header, every visitor shares one
  rate-limit bucket.
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
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  # ... listen 443 ssl; TLS cert config ...
}
```

Caching the media route (`/api/media/file/`) at the proxy is a nice-to-have.

---

## 7. Email — the in-stack `mail` relay (§mail)

> **Local testing (Mailpit).** You can't send real mail from a dev box —
> outbound `:25` is blocked, so the `mail` relay just queues (`mailq`) and never
> delivers. To *see* order/contact emails locally, start the stack with the
> dev overlay, which adds a **Mailpit** catcher and points the app's SMTP at it:
> `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`,
> then open **http://localhost:8025**. Production ignores this file.

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
the reputation problem goes away. **Check whether the target host allows outbound
:25 before choosing** — it decides direct-vs-`RELAYHOST`.

### Receiving (mail sent *to* the domain)

The `mail` relay is **send-only** — it does not accept inbound mail, and it is
not a mailbox. So mail addressed to `orders@` / `info@nasteh.bg` (e.g. a customer
replying to their confirmation) needs an **email-forwarding** setup — the app's
DNS does not create inboxes:

- At the **domain registrar** (or a forwarder such as ImprovMX), add an **MX**
  record + a rule forwarding `orders@nasteh.bg` and `info@nasteh.bg` to the real
  inbox the owner reads (e.g. `nastehsales@gmail.com`).
- Then set `ORDER_INBOX_EMAIL=orders@nasteh.bg` — order/contact notifications
  land in that inbox via the forward, and customer replies do too. (You *can*
  point `ORDER_INBOX_EMAIL` straight at the gmail to skip the forward for the
  app's own notifications, but you still want forwarding for replies.)

> A personal `@gmail.com` cannot host `@nasteh.bg` addresses — hence the
> forwarder. A Google **Workspace** account on the domain would instead make
> `orders@` a real mailbox (no forwarder needed).

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
- **Media volume must be writable by uid 1001.** The app runs as the non-root
  `nasteh` user (uid 1001) and writes uploads (+ their WebP variants) to
  `/app/media`. A *fresh* named `media` volume inherits the image dir's 1001
  ownership, so the default compose setup just works. But a volume created
  root-owned by an earlier image, or a **host bind-mount** in place of the named
  volume, will be root-owned → uploads fail in the admin with `EACCES` and a
  **400 Bad Request**. Fix by chowning the mount to the app user:
  `docker compose exec -u root app chown -R 1001:1001 /app/media` (or, for a
  bind-mount, `chown -R 1001:1001 <hostpath>` on the host). Ownership persists,
  so this is a one-time fix per volume.

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
