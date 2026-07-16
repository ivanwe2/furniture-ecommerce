# DEPLOY.md — self-hosted Docker operations

The current platform doc. Настех runs as a single Docker container (Next.js
production server embedding the Payload admin), fronted by the client
sysadmin's reverse proxy. Replaces the retired Cloudflare deploy
(`CLOUDFLARE.md`, legacy). See ARCHITECTURE §1-3, §11.

```
Browser ─▶ reverse proxy (nginx/Caddy — TLS)  ─▶  app container :3000
                                                   ├─ SQLite   → `data`  volume
                                                   └─ uploads  → `media` volume
```

The sysadmin owns TLS, DNS, and mail. This stack is just the app + its data.

---

## 1. Prerequisites (on the host)

- Docker Engine + Compose plugin (`docker compose version`).
- A reverse proxy terminating TLS for `nasteh.bg` and proxying to the app
  (see §6).
- An authenticated SMTP endpoint for the domain, with SPF/DKIM/DMARC (and
  PTR + open port 25 if it's a self-run MTA) — see §7.

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
| `DATABASE_URI` | SQLite file | `file:/app/data/nasteh.db` (the `data` volume). |
| `MEDIA_DIR` | uploads dir | `/app/media` (the `media` volume). |
| `NEXT_PUBLIC_SITE_URL` | public URL | `https://nasteh.bg`. **Build-time** — see §5 note. |
| `NEXT_PUBLIC_SHOW_BGN` | dual EUR/BGN prices | `true` until 2026-08-08, then `false`. **Build-time.** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile widget id | public. **Build-time.** |
| `TURNSTILE_SECRET_KEY` | Turnstile server verify | secret, runtime. |
| `SMTP_HOST`/`SMTP_PORT` | mail relay | 465 = implicit TLS, 587 = STARTTLS. |
| `SMTP_USER`/`SMTP_PASS` | mail auth | leave empty for a no-auth local relay. |
| `EMAIL_FROM` | envelope sender | e.g. `Настех <orders@nasteh.bg>` — must be an address the relay may send as. |
| `ORDER_INBOX_EMAIL` | order/contact inbox | where the owner receives notifications. |

> **`NEXT_PUBLIC_*` are baked in at `docker build`**, not read at runtime.
> If you change one, rebuild the image (`docker compose up -d --build`).

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
create the first user on an empty DB. (If you imported existing data in §4,
the owner account comes across with it; skip this.)

Update to a new version:

```bash
git pull
docker compose up -d --build      # rebuild + restart; migrations run on boot
```

---

## 4. One-time data cutover (from the retired Cloudflare deploy)

> **Not needed for this project.** The Cloudflare instance was a throwaway
> test — there is no production data to migrate. Go-live starts fresh: the
> container creates + migrates an empty DB on first boot, and the owner enters
> content via `/admin`. No Cloudflare/`wrangler` access is required anywhere in
> this deploy. The procedure below is kept only as reference, in case a future
> deploy ever needs to import an existing D1/R2.

To bring content from an existing Cloudflare deploy (products, categories,
media, settings, orders), run from a machine with `wrangler` logged into the
account:

### 4a. Database: D1 → the SQLite `data` volume

D1 *is* SQLite, so its export loads directly.

```bash
# 1. Find the DB name, then export the full dump (schema + data + the
#    payload_migrations row).
wrangler d1 list
wrangler d1 export <D1_DATABASE_NAME> --remote --output nasteh-d1.sql

# 2. Materialise a SQLite file from the dump (needs the sqlite3 CLI).
sqlite3 nasteh.db < nasteh-d1.sql
```

Because the dump already contains the schema **and** the recorded migration
`20260709_184644_initial`, the container's start-up `payload migrate` sees it
as applied and no-ops. Load this file into the `data` volume **before** the
first `up` (or overwrite the empty one created by a first run):

```bash
# Compose names the volume <project>_data (project = the compose dir name).
docker volume ls | grep data

# Copy nasteh.db into the volume via a throwaway container.
docker run --rm -v <project>_data:/data -v "$PWD":/src alpine \
  sh -c "cp /src/nasteh.db /data/nasteh.db && chown 1001:1001 /data/nasteh.db"
```

Then `docker compose up -d`. Verify in `/admin` that products/pages are present.

### 4b. Media: R2 → the `media` volume

Download the R2 bucket, then place the files in the `media` volume. R2 is
S3-compatible, so `rclone` is the simplest path (configure a remote with the
account's R2 S3 access key/secret and endpoint):

```bash
rclone copy r2:nasteh-media ./media-download --progress

docker run --rm -v <project>_media:/media -v "$PWD/media-download":/src alpine \
  sh -c "cp -r /src/. /media/ && chown -R 1001:1001 /media"
```

(Or `wrangler r2 object get` per key for a small bucket.) Uploads then serve
from `https://nasteh.bg/api/media/file/<filename>`.

---

## 5. Backups

Two volumes hold all state.

```bash
# Database — copy the SQLite file (safe while running; add `.backup` via
# sqlite3 for a guaranteed-consistent snapshot under load).
docker run --rm -v <project>_data:/data -v "$PWD":/out alpine \
  cp /data/nasteh.db /out/nasteh-$(date +%F).db

# Media — tar the uploads.
docker run --rm -v <project>_media:/media -v "$PWD":/out alpine \
  tar czf /out/media-$(date +%F).tgz -C /media .
```

Automate both on the host (cron) and copy off-box.

---

## 6. Reverse proxy (sysadmin)

Terminate TLS and proxy to `127.0.0.1:3000`. Two things the app relies on:

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

## 7. Email deliverability (sysadmin)

The app is a plain SMTP client (`SMTP_*` in `.env`); deliverability is the
endpoint's + DNS's job:

- **SPF, DKIM, DMARC** published for `nasteh.bg` so receivers trust the mail.
- If the endpoint is a **self-run MTA** sending direct-to-recipient, it also
  needs a matching **PTR** record and **outbound port 25 open** (many
  ISPs/hosts block it). A reputable relay (the domain's mail host or a
  Workspace SMTP relay) sidesteps IP-reputation problems.
- Sending as `orders@nasteh.bg` requires the endpoint to authorise that
  address (`EMAIL_FROM`).

Test after wiring: place a real order and confirm both the owner and customer
emails arrive (check spam too), to a `gmail.com` and an `abv.bg` address.

---

## 8. Known watch-items

- **Native build scripts (sharp/esbuild).** pnpm 11 runs these only if
  approved in `pnpm-workspace.yaml` (`allowBuilds:` — NOT the older
  `onlyBuiltDependencies`), which the Dockerfile copies into the deps stage.
  Verified: the image builds on Linux with the committed (Windows-generated)
  lockfile and sharp works. If a future pnpm bump changes the approval format,
  re-run `pnpm approve-builds` and keep the file copied in the Dockerfile.
- **`NEXT_PUBLIC_*` are build-time.** Changing the site URL / Turnstile key /
  BGN flag requires a rebuild, not just an env edit + restart.
- **2026-08-08:** flip `NEXT_PUBLIC_SHOW_BGN` to `false` and rebuild (prices
  become EUR-only). Set a reminder.
- **Single instance.** The in-memory rate limiter and the SQLite single-writer
  model assume one container. Don't scale to replicas without revisiting both.
