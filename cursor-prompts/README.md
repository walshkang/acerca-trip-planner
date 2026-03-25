# P3-E4 Cursor Prompts

Execution prompts for Cursor Composer, one per slice. Run in order (A → H).

## Ownership Split

| Slice | Owner | Why |
|-------|-------|-----|
| **A — Contract** | Claude Code (done) | Contract doc + types already written: `docs/PHASE_3_LIST_INTERCHANGE.md` + `lib/import/contract.ts` |
| **B — Preview API** | Cursor | Route wiring + Google resolution is bounded. Follows existing patterns in `app/api/places/ingest/route.ts`. Heavy but mechanical. |
| **C — Computed fields** | Cursor | Pure functions, unit-testable, no external dependencies. Ideal for Composer. |
| **D — Commit API** | Cursor | Reuses ingest/promote pipeline. Pattern exists in `app/api/places/ingest/route.ts` + `app/api/places/promote/route.ts`. |
| **E — LLM client prompt** | Claude Code | Requires understanding the full contract semantically, not just code generation. Will write after B-D are implemented and the response shape is proven. |
| **F — Export UI** | Cursor | Straightforward UI button + download. Server path already exists. |
| **G — Import UI + chat** | Cursor (UI) / Claude Code (chat prompt design) | Cursor does the wizard/modal. Chat UI needs prompt design first (slice E). |
| **H — Verification gate** | Cursor | Test generation from contract specs. Composer handles this well. |
