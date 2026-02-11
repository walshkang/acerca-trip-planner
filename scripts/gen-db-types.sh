#!/usr/bin/env bash
set -euo pipefail

OUT_FILE="lib/supabase/types.ts"
TMP_FILE="$(mktemp -t supabase-types.XXXXXX)"

cleanup() {
  rm -f "${TMP_FILE}"
}
trap cleanup EXIT

write_types() {
  local label="$1"
  shift
  echo "Generating Supabase types from ${label} -> ${OUT_FILE}"
  "$@" > "${TMP_FILE}"

  if [[ ! -s "${TMP_FILE}" ]]; then
    echo "✗ Type generation produced an empty file; leaving ${OUT_FILE} unchanged."
    exit 1
  fi

  mv "${TMP_FILE}" "${OUT_FILE}"
  echo "✓ Wrote ${OUT_FILE}"
}

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  write_types "SUPABASE_DB_URL" supabase gen types typescript --db-url "${SUPABASE_DB_URL}"
  exit 0
fi

if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  if command -v supabase >/dev/null 2>&1; then
    write_types "SUPABASE_PROJECT_REF" supabase gen types typescript --project-id "${SUPABASE_PROJECT_REF}" --schema public
  else
    write_types "SUPABASE_PROJECT_REF" npx --yes supabase gen types typescript --project-id "${SUPABASE_PROJECT_REF}" --schema public
  fi
  exit 0
fi

echo "SUPABASE_DB_URL and SUPABASE_PROJECT_REF are not set."
echo "Options:"
echo "  1) Set SUPABASE_DB_URL to your project's Postgres connection string."
echo "  2) Set SUPABASE_PROJECT_REF to generate via the Supabase CLI (no Docker)."
echo "  3) If you have a local Supabase stack running (Docker), you can generate via:"
echo "     supabase gen types typescript --local > ${OUT_FILE}"
exit 1
