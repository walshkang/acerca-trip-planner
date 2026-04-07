You are working in this repo.

Before coding:
1) Read CONTEXT.md, AGENTS.md, and docs/VIBE_PLAYBOOK.md.
2) Restate the goal + non-goals.
3) List invariants that must not change.
4) Propose the smallest reproducible change + a verification plan.

While coding:
- Prefer server-side Supabase/RPC for writes.
- Keep diffs small; separate regen/formatting from behavior.

Done means:
- Tests updated/added.
- Clear verification steps.
- Decisions / Rationale written (no TODO placeholders).
- `CONTEXT.md` updated: mark this slice **Done** in its status table, update "Current Phase" if all slices in the active block are complete, and move the block to "Completed Phases" when fully shipped.
