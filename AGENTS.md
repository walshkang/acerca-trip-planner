# AGENTS.md

This file is the single source of truth for how we build here. It applies to humans and agents.

## Read First
- CONTEXT.md (active phase, immediate blockers)
- docs/VIBE_PLAYBOOK.md (checklists and patterns)

## Invariants (do not violate)
- DB is source of truth; map pins are truth.
- LLMs label/translate intent; deterministic systems retrieve/compute.
- Enrich once, read forever; refresh only by versioning.
- Strict taxonomy: AI outputs must match UI icon sets exactly.
- User edits never overwrite frozen AI enrichment.

## Definition of Done
- Tests updated/added for behavior changes.
- Verification steps listed and run when possible.
- Migrations + type regeneration (`npm run db:types`) when schema changes.
- Decisions / Rationale and Next Steps are filled (no TODO placeholders).

## Diff Hygiene
- Separate behavior changes from regen/formatting churn.
- Keep diffs minimal; avoid drive-by refactors.

## Preferred Patterns
- Server-side Supabase for privileged operations; no service role keys in client code.
- Use RPC or server routes for writes.
- Centralize client creation (`lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/admin.ts`).

If you must break an invariant, note it explicitly in the PR and update this file.
