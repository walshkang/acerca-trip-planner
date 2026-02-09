# p2-e2-filter-schema

## Goal
- Define a server-owned, runtime-validated filter JSON contract for planner/discovery reads.
- Keep filter semantics deterministic and aligned with existing taxonomy and planner slots.

## Non-Goals
- No client-side ad hoc filter contract branching.
- No enrichment refresh changes.
- No schema migration in this plan artifact itself.

## Invariants
- DB remains source of truth.
- LLM labels/intent translation only; deterministic retrieval and filtering.
- Strict taxonomy remains exhaustive and deterministic.
- User edits never overwrite frozen AI enrichment.

## Verification
- Validate artifacts: `npm run plan:validate`.
- Implementation phase should add contract tests for parser/validator and route-level behavior.
