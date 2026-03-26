# AGENTS.md

This file is the single source of truth for how we build here. It applies to humans and all AI agents.

## Read First
- `DESIGN.md` — UI/UX source of truth (layout, interaction, visual system, component inventory)
- `CONTEXT.md` — active phase, immediate blockers, implementation memory
- `docs/VIBE_PLAYBOOK.md` — checklists and patterns
- `docs/QUALITY_GATES.md` — quality gates and acceptance criteria
- Starting a new task? Use `prompts/agent_task.md`.

## Human Instructions
- Use the PR template and document goal, non-goals, tradeoffs, and verification.
- Run `npm run check` before pushing when possible.
- If you create/update learning reports, fill Decisions / Rationale and Next Steps (no TODO placeholders).
- Update this file when you change invariants or workflow.

## Invariants (do not violate)
- DB is source of truth; map pins are truth.
- LLMs label/translate intent; deterministic systems retrieve/compute.
- Enrich once, read forever; refresh only by versioning.
- Strict taxonomy: AI outputs must match UI icon sets exactly.
- User edits never overwrite frozen AI enrichment.

If you must break an invariant, note it explicitly in the PR and update this file.

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

---

## Multi-Agent Routing

We use multiple AI agents and tools. Each agent should self-assess whether it is the right tool for the current task, execute if so, or recommend delegating if not. This section is the shared contract all agents read.

### Agent Tiers

Agents self-assign to a tier based on what they can actually do in this session — not by product name. Claude Code, Cursor Composer, Gemini CLI, Copilot CLI, and others all fit somewhere here.

| Tier | Capability | Fits When |
|------|-----------|-----------|
| **Deep** | Cross-file reasoning, architecture, planning, debugging across boundaries, running tests/migrations | You can read 5+ files, run shell commands, hold the full context of a contract change |
| **Bounded** | Implementing against an existing contract, component work, pattern-following, unit tests | The contract/interface already exists; you need 1–3 files to execute |
| **Quick** | Trivial edits, renames, type fixes, one-liners, lint | Single file, no design decisions |

### Self-Assessment: "Should I do this or delegate?"

Before starting work, ask these questions:

**1. Does this task cross architectural boundaries?**
Boundaries in this codebase: migrations ↔ types ↔ contracts (`lib/*/contract.ts`, `docs/PHASE_3_*.md`) ↔ API routes (`app/api/`) ↔ hooks ↔ components ↔ Zustand stores.
- Crosses 3+ boundaries → **Deep** tier plans it, may delegate slices to Bounded.
- Crosses 1–2 boundaries → **Bounded** can execute if the contract/interface already exists.
- Stays within one file or layer → **Quick** is fine.

**2. Does it require inventing a new contract, schema, or data model?**
New migrations, new `docs/PHASE_*` contract docs, new type hierarchies, new Zustand store slices, or new API route shapes.
- Yes → **Deep**. Bounded must not invent contracts; it implements them.
- No, just implementing against an existing contract → **Bounded**.

**3. Does it require reading 5+ files to understand the change?**
- Yes → **Deep** (can hold the full context and reason across files).
- No → **Bounded** or lower.

**4. Is it debugging a cross-boundary failure?**
RLS + RPC + client interaction, OSRM adapter + route handler + hook, or Zustand state + URL params + component rendering.
- Yes → **Deep** (can run tests, read errors, iterate).
- No, isolated bug in one layer → **Bounded**.

**5. Is it a known pattern with a clear example in the codebase?**
Adding a new `stitch/` component following existing ones, adding a vitest unit test following `tests/routing/contract.test.ts`, adding a new enum value through the existing exhaustive pipeline.
- Yes → **Bounded**. Point it at the example file.
- No precedent exists → **Deep** creates the first instance, then Bounded follows the pattern.

### Task Routing Reference

#### Deep Tier (plan + execute or plan + delegate)
- New database migrations and `npm run db:types` regen
- New or modified contract docs (`docs/PHASE_3_*.md`, `lib/*/contract.ts`)
- New API route design (request/response shape, error semantics, invariants)
- `WorkspaceContainer` / `ContextPanel` orchestration logic (touches stores + hooks + components)
- Multi-file refactors (e.g., moving from kanban columns → day grid architecture)
- Test strategy design (what to test, edge cases, acceptance criteria matrix)
- Debugging failures that span server → client → DB
- Reviewing other agents' output for invariant violations
- Updating `AGENTS.md`, `CONTEXT.md` when scope changes (`roadmap.json` is deprecated; `CONTEXT.md` is the single source of truth)

#### Bounded Tier (execute against existing contracts)
- Individual `components/stitch/` component implementation (when design spec exists in `DESIGN.md`)
- API route handler implementation (when contract types are defined in `lib/*/contract.ts`)
- Unit tests following existing patterns (`tests/routing/`, `tests/discovery/`)
- Playwright E2E test scaffolding following `tests/e2e/` patterns
- CSS / Tailwind / responsive styling per `docs/SIGNAL_VISUAL_LANGUAGE.md`
- React hook implementation (when the data flow is already designed)
- Adding new items to existing exhaustive pipelines (enum value → icon → test)
- `docs/reports/` learning report creation

#### Quick Tier (no design decisions)
- Inline type fixes, import cleanup, rename refactors
- Adding a single enum case to an existing switch
- Fixing lint / prettier issues
- Small copy changes per `docs/COPY_TONE.md`
- Boilerplate completions (filling out a test skeleton that Deep tier outlined)

### Parallel Workflow

When a task can be split:

1. **Deep tier plans.** Read `CONTEXT.md` and the relevant contract docs. Produce a plan that lists:
   - Files to change and why
   - Which slices are safe for Bounded (bounded, contract exists, pattern exists)
   - Which slices Deep must own (cross-boundary, new contract, architectural)
   - Intermediate checkpoints (where to sync)

2. **Split and execute in parallel.**
   - Deep works on contract/schema/orchestration changes.
   - Bounded works on component/test/styling slices.
   - Neither should block-wait for the other; work on independent slices.

3. **Converge and verify.**
   - Deep reviews Bounded output against invariants (especially: did the agent invent a new pattern instead of following an existing one?).
   - Run `npm run check` and `npm test`.
   - If Playwright-relevant, run seeded E2E per `docs/PLAYWRIGHT.md`.

### Delegation Protocol

When delegating, produce a **handoff block** the human can paste into the other agent's context:

```
## Handoff: [task summary]
**From:** [Deep / Bounded]
**To:** [Deep / Bounded]
**Context:** [1-2 sentences on what's already done]
**Task:** [specific bounded task]
**Contract:** [file path to the contract/types/interface to implement against]
**Pattern:** [file path to an example of the pattern to follow]
**Constraints:**
- Do not modify [specific files/contracts]
- Follow [specific doc] for [specific concern]
**Verify:** [how to check the work, e.g., `npm test -- tests/routing/`]
```

### Red Lines (any agent)

Stop and re-route if:

- Any agent creating a new file in `docs/PHASE_*` → must be Deep tier.
- Any agent modifying `lib/*/contract.ts` types without a contract doc → must be Deep tier.
- Any agent adding a new Supabase migration → must be Deep tier.
- Any agent restructuring component hierarchy or Zustand store shape → must be Deep tier.
- Deep tier spending time on single-file CSS tweaks or lint fixes → delegate to Quick.
- Deep tier writing boilerplate tests that follow an existing pattern exactly → delegate to Bounded.
- Any agent violating an invariant from the Invariants section above → stop, flag it, re-route.
