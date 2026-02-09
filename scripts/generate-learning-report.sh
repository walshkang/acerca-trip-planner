#!/usr/bin/env bash
set -euo pipefail

root_dir="$(git rev-parse --show-toplevel)"
cd "$root_dir"

# Skip report generation if the commit only touched docs/reports.
if git diff-tree --no-commit-id --name-only -r HEAD | grep -q -v '^docs/reports/'; then
  :
else
  exit 0
fi

report_dir="docs/reports"
mkdir -p "$report_dir"

date_str="$(date +%Y-%m-%d)"
commit_hash="$(git rev-parse HEAD)"
short_hash="$(git rev-parse --short HEAD)"
subject="$(git log -1 --pretty=%s)"

slug="$(printf "%s" "$subject" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
if [ -z "$slug" ]; then
  slug="commit"
fi

report_file="${report_dir}/${date_str}__${short_hash}__${slug}.md"
if [ -f "$report_file" ]; then
  i=2
  while [ -f "${report_file%.md}__${i}.md" ]; do
    i=$((i + 1))
  done
  report_file="${report_file%.md}__${i}.md"
fi

author="$(git log -1 --pretty=%an)"
commit_date="$(git log -1 --pretty=%ad --date=short)"
name_status="$(git show -1 --name-status --pretty=format:)"
stats="$(git show -1 --stat --pretty=format:)"

cat > "$report_file" <<EOF
# Learning Report: $subject

- Date: $commit_date
- Commit: $commit_hash
- Author: $author

## Summary
- Auto-generated report for learning and review.
- Commit message: "$subject"

## What Changed
\`\`\`
$name_status
\`\`\`

## File Stats
\`\`\`
$stats
\`\`\`

## Decisions / Rationale
- Auto-generated from commit metadata. If this report is included in a PR, replace this line with concrete rationale and tradeoffs from the implementation.

## Best Practices: Backend Connections
- Use server-side clients for privileged operations; avoid admin/service keys in client code.
- Keep anon keys in \`NEXT_PUBLIC_...\` and service role in server-only env vars.
- Prefer RPC or server routes for writes; keep validation server-side.
- Centralize client creation and reuse helpers (\`lib/supabase/server.ts\`, \`lib/supabase/client.ts\`).

Example (server-side Supabase):
\`\`\`ts
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase.rpc('promote_place_candidate', {
  p_candidate_id: candidateId,
})
\`\`\`

## Efficiency Tips
- Start with smallest reproducible change, then expand.
- Add tight tests for new logic and edge cases.
- Capture TODOs in commit message or report immediately.

## Next Steps
- No follow-up actions were captured automatically.
EOF

echo "Learning report saved to: $report_file"
