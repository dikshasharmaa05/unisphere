#!/usr/bin/env bash
# Runs the migrations + RLS behaviour tests against a throwaway local Postgres
# (plain Postgres with a stubbed Supabase auth schema). Usage:
#   PGHOST=/path/to/socket PGPORT=54329 PGUSER=postgres supabase/tests/run-local.sh
# The database's public/auth schemas are dropped and recreated — never point this at a real project.
set -euo pipefail
cd "$(dirname "$0")/.."
psql -q -c "drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;" \
        -c "drop role if exists anon; drop role if exists authenticated; drop role if exists service_role;" >/dev/null
psql -q -v ON_ERROR_STOP=1 -f tests/00_supabase_stub.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -f "$f"; done
psql -f tests/phase2_auth_roles.sql
