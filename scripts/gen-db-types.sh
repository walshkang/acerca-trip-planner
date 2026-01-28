#!/usr/bin/env bash
set -euo pipefail

OUT_FILE="lib/supabase/types.ts"

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  echo "Generating Supabase types from SUPABASE_DB_URL -> ${OUT_FILE}"
  supabase gen types typescript --db-url "${SUPABASE_DB_URL}" > "${OUT_FILE}"
  echo "✓ Wrote ${OUT_FILE}"
  exit 0
fi

if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Generating Supabase types from SUPABASE_PROJECT_REF -> ${OUT_FILE}"
  npx supabase gen types typescript --project-id "${SUPABASE_PROJECT_REF}" --schema public > "${OUT_FILE}"
  echo "✓ Wrote ${OUT_FILE}"
  exit 0
fi

echo "SUPABASE_DB_URL and SUPABASE_PROJECT_REF are not set."
echo "Options:"
echo "  1) Set SUPABASE_DB_URL to your project's Postgres connection string."
echo "  2) Set SUPABASE_PROJECT_REF to generate via the Supabase CLI (no Docker)."
echo "  3) If you have a local Supabase stack running (Docker), you can generate via:"
echo "     supabase gen types typescript --local > ${OUT_FILE}"
exit 1
