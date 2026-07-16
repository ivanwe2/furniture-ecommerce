# syntax=docker/dockerfile:1
#
# Настех — self-hosted image. Next.js production server embedding the Payload
# admin. SQLite lives on the `data` volume, uploads on the `media` volume.
# Migrations run on container start, then `next start` serves the app.

# --- base: Node 24 (matches package.json engines) on Debian slim.
# Debian (glibc), not Alpine (musl), so sharp's prebuilt native binary works
# without extra compat shims.
FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--no-deprecation
RUN corepack enable
WORKDIR /app

# --- deps: full install (incl. dev deps) for the build. pnpm resolves the
# linux sharp binary (@img/sharp-linux-x64) from the lockfile's optional deps.
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- build: compile the Next app. No DB is touched (site pages + sitemap are
# force-dynamic); PAYLOAD_SECRET just needs a value for config validation.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV PAYLOAD_SECRET=build-time-placeholder
RUN pnpm build

# --- runtime: built app + node_modules + source (source is needed because
# `payload migrate` loads the TS config/collections via tsconfig path aliases).
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json pnpm-lock.yaml tsconfig.json next.config.ts ./
COPY src ./src
# Writable dirs for the SQLite db + uploads. chown BEFORE declaring the volume
# mount points so first-run named volumes inherit the non-root ownership.
RUN mkdir -p /app/data /app/media \
    && useradd -m -u 1001 nasteh \
    && chown -R nasteh:nasteh /app
USER nasteh
EXPOSE 3000
# Apply pending migrations, then serve. `&&` stops startup if a migration
# fails (never serve against an unmigrated DB). `pnpm exec` runs the local
# bins directly, avoiding the cross-env dev dependency the npm scripts use.
CMD ["sh", "-c", "pnpm exec payload migrate && pnpm exec next start -H 0.0.0.0 -p 3000"]
