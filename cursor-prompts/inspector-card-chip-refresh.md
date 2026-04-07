# InspectorCard — Chip & Surface Refresh

> **Read first:** `cursor-prompts/agent_task.md` — preamble, invariants, and DoD (including CONTEXT.md update requirement).

## Goal

Modernize `InspectorCard.tsx` to use the paper design token system throughout. The card currently uses a `glass-panel` / `isDark` dual-path inherited from the old glass shell era. All chips, buttons, inputs, and the card surface should match the patterns already used in `PersonaFilterChips.tsx` and the rest of the paper system.

**Do not touch behavior, state, or the commit flow.** This is a pure visual/CSS change.

---

## Read First

1. `components/stitch/InspectorCard.tsx` — the file to change
2. `components/stitch/PersonaFilterChips.tsx` — chip style reference (lines 44, 60)
3. `docs/SIGNAL_VISUAL_LANGUAGE.md` — visual language rules

---

## What's Old and Why It's Wrong

| Pattern | Problem |
|--------|---------|
| `glass-panel` wrapper class | Legacy glass shell. The card sits on paper surface now. |
| `isDark` / `tone` dual-path | Added complexity with no benefit — card is always light (paper surface). |
| `md:!border-paper-*` overrides | Means glass styles are default and paper is the override. Should be reversed — paper is the only style. |
| `glass-button`, `glass-input` | Legacy glass classes. Replace with inline paper Tailwind. |
| `md:rounded-[2px]` chip corners | Inconsistent with PersonaFilterChips which uses `rounded-full`. |
| `md:font-bold md:uppercase md:tracking-wider` chip labels | Loud, dated. Chips should be `text-xs font-medium`, no uppercase. |

---

## Target Chip Style

Match `PersonaFilterChips.tsx` exactly:

**Unselected chip:**
```
rounded-full border border-paper-tertiary-fixed bg-paper-surface-container px-2.5 py-1 text-xs font-medium text-paper-on-surface transition-colors hover:bg-paper-surface-container-high
```

**Selected chip:**
```
rounded-full border border-paper-on-surface bg-paper-on-surface px-2.5 py-1 text-xs font-medium text-paper-surface transition-colors
```

Apply to: category chips, list chips. Tag chips are display-only (no selected state) — use the unselected style.

---

## Target Button Style

**Secondary buttons** (Close, More details, + New list, Add):
```
rounded-full border border-paper-tertiary-fixed bg-paper-surface-container-low px-3 py-1 text-xs font-medium text-paper-on-surface hover:bg-paper-surface-container transition-colors
```

**Primary CTA** (Approve Pin):
```
w-full rounded-full bg-paper-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-paper-on-primary transition-colors hover:bg-paper-primary-container disabled:opacity-50
```

---

## Target Input Style

```
w-full rounded-md border border-paper-tertiary-fixed bg-paper-surface-container px-3 py-1.5 text-xs text-paper-on-surface placeholder:text-paper-on-surface-variant focus:outline-none focus:border-paper-primary
```

---

## Target Card Surface

Remove `glass-panel`. The card wrapper should be:
```
pointer-events-auto w-[min(420px,92vw)] rounded-lg border border-paper-tertiary-fixed bg-paper-surface-warm shadow-sm
```

On desktop (`md+`) it already sits in the paper rail — no extra treatment needed.

---

## Removals

- Delete the `isDark`, `tone` prop, `selectedChipClass`, `unselectedChipClass`, `listHelperClass` variables — they all go away with the single-path paper system.
- Remove all `glass-panel`, `glass-button`, `glass-input` classes.
- Remove all `md:!` overrides — paper styles should be the default, not the override.

---

## What NOT to Change

- All state logic (`commitCategory`, `includedAutoTags`, `selectedListId`, `tagInput`, etc.)
- The commit flow (`commit()`, `createList()`)
- `data-testid` attributes
- `data-onboarding` attributes
- The `onCommitted`, `onClose` props (keep the props signature, just remove `tone`)
- Wikipedia/curated section content
- All `aria-*` attributes

---

## Definition of Done

- [ ] No `glass-panel`, `glass-button`, `glass-input` classes remain in the file
- [ ] No `isDark` / `tone` logic remains
- [ ] No `md:!` overrides remain
- [ ] Category chips match PersonaFilterChips visual style
- [ ] List chips match PersonaFilterChips visual style
- [ ] Card renders cleanly on both mobile and desktop without layout shift
- [ ] `npm run check` passes
- [ ] `CONTEXT.md` updated: InspectorCard chip refresh marked **Done** under a new "Visual Refresh" entry in the active work section
