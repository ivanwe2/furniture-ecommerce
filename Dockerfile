# syntax=docker/dockerfile:1
#
# Настех — self-hosted image. Next.js production server embedding the Payload
# admin. Data lives in the `db` (PostgreSQL) container; uploads on the `media`
# volume. Migrations run on container start, then `next start` serves the app.

# --- base: Node 24 (matches package.json engines) on Debian slim.
# Debian (glibc), not Alpine (musl), so sharp's prebuilt native binary works
# without extra compat shims.
FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--no-deprecation
# pnpm is used in the build stages only; the runtime CMD calls binaries
# directly (no pnpm/corepack at container start → no runtime registry access).
RUN corepack enable
WORKDIR /app

# --- deps: full install (incl. dev deps) for the build. pnpm-workspace.yaml
# carries onlyBuiltDependencies so sharp/esbuild may run their build scripts;
# pnpm resolves the linux sharp binary (@img/sharp-linux-x64) from the lockfile.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- build: compile the Next app. No DB is touched (site pages + sitemap are
# force-dynamic); PAYLOAD_SECRET just needs a value for config validation.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# PAYLOAD_SECRET only needs a value so config validation passes at build; the
# real one is injected at runtime. Inline (not ENV) so it isn't baked into a layer.
RUN PAYLOAD_SECRET=build-time-placeholder pnpm build

# --- runtime: built app + node_modules + source (source is needed because
# `payload migrate` loads the TS config/collections via tsconfig path aliases).
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
RUN useradd -m -u 1001 nasteh
# --chown on each COPY sets ownership inline (far faster than a recursive
# chown over node_modules).
COPY --from=deps --chown=nasteh:nasteh /app/node_modules ./node_modules
COPY --from=build --chown=nasteh:nasteh /app/.next ./.next
COPY --from=build --chown=nasteh:nasteh /app/public ./public
COPY --chown=nasteh:nasteh package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json next.config.ts ./
COPY --chown=nasteh:nasteh src ./src
# scripts/ ships too so the owner can seed sample content in the running stack:
#   docker compose exec -e SEED_ALLOW_PROD=1 app node_modules/.bin/tsx scripts/seed-dev.ts
COPY --chown=nasteh:nasteh scripts ./scripts
# Writable dir for uploads. Own /app + the media dir as the runtime user so the
# first-run `media` named volume inherits non-root ownership.
RUN mkdir -p /app/media && chown nasteh:nasteh /app /app/media
USER nasteh
EXPOSE 3000
# Apply pending migrations, then serve. `&&` stops startup if a migration
# fails (never serve against an unmigrated DB). Direct bin calls — no pnpm at
# runtime (avoids the cross-env dev dep and any corepack download on start).
CMD ["sh", "-c", "node_modules/.bin/payload migrate && node_modules/.bin/next start -H 0.0.0.0 -p 3000"]
