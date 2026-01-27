#!/usr/bin/env bash
set -euo pipefail

OUT_FILE="lib/supabase/types.ts"

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  echo "Generating Supabase types from SUPABASE_DB_URL -> ${OUT_FILE}"
  supabase gen types typescript --db-url "${SUPABASE_DB_URL}" > "${OUT_FILE}"
  echo "✓ Wrote ${OUT_FILE}"
  exit 0
fi

echo "SUPABASE_DB_URL is not set."
echo "If you have a local Supabase stack running (Docker), you can generate via:"
echo "  supabase gen types typescript --local > ${OUT_FILE}"
echo
echo "Or set SUPABASE_DB_URL to your project's Postgres connection string."
exit 1

