#!/bin/sh
# One-shot (docker-compose.observability.yml → telemetry-db-init), run on every
# `docker compose up`; idempotent.
#
# 1. Generates the two monitoring passwords into the obs-secrets volume on the
#    first run (nothing for the sysadmin to set).
# 2. Creates/refreshes the roles:
#    - grafana_reader: SELECT on the `telemetry` schema ONLY — the dashboards
#      can never read orders, customers or users (public schema);
#    - metrics: pg_monitor, for Alloy's Postgres exporter (server statistics,
#      no table data).
set -eu
umask 022

gen() {
  f="/secrets/$1"
  if [ ! -s "$f" ]; then
    head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$f"
  fi
  # Readable by Grafana (uid 472) inside this private volume.
  chmod 0444 "$f"
}
gen grafana_reader_password
gen metrics_password

until pg_isready -q; do sleep 1; done

psql -v ON_ERROR_STOP=1 -q \
  -v grafana_pw="$(cat /secrets/grafana_reader_password)" \
  -v metrics_pw="$(cat /secrets/metrics_password)" \
  -v db="$PGDATABASE" \
  -v owner="$PGUSER" <<'SQL'
SELECT 'CREATE ROLE grafana_reader LOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'grafana_reader') \gexec
SELECT 'CREATE ROLE metrics LOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metrics') \gexec
ALTER ROLE grafana_reader WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'grafana_pw';
ALTER ROLE metrics WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'metrics_pw';
GRANT pg_monitor TO metrics;
GRANT CONNECT ON DATABASE :"db" TO grafana_reader, metrics;
-- The app's migration creates the schema too; whichever runs first wins.
CREATE SCHEMA IF NOT EXISTS telemetry AUTHORIZATION :"owner";
GRANT USAGE ON SCHEMA telemetry TO grafana_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA telemetry TO grafana_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA telemetry GRANT SELECT ON TABLES TO grafana_reader;
SQL
echo "[telemetry-db-init] roles grafana_reader + metrics ready"
