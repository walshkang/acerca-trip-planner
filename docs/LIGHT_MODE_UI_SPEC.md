# Light Mode UI Spec (Warm Glass)

- Date: 2026-02-08
- Status: Implemented (Phase 2; verification hardening in progress)
- Scope: Phase 2 map shell overlays (`Context Panel` + `Tools Sheet`)
- Related:
  - `docs/SIGNAL_VISUAL_LANGUAGE.md`
  - `docs/UX_RULES.md`
  - `docs/PHASE_2_UI_UX_REFACTOR_PLAN.md`
  - `docs/PHASE_2_PLAN.md`

---

## 1) Goal

Define a light-mode visual contract that stays map-first:
- warm-tinted glass overlays over a live map
- strict semantic meaning for color/motion/icon choices
- no drift from the existing surface model

---

## 2) Non-goals

- No changes to the window budget or surface model.
- No routing/state contract changes (`?place=`, `?list=` semantics stay as-is).
- No schema/taxonomy changes.
- No rewrite of copy/tone conventions.

---

## 3) Invariants (must hold)

- Map is truth; pins are truth.
- One primary `Context Panel`; one secondary `Tools Sheet`.
- Semantics > decoration.
- Category iconography remains strict enum-driven identity.

---

## 4) North Star

Light mode should feel like warm-tinted glass overlays that are bounded, calm, and high-contrast over a live map.

---

## 5) Semantic Visual Contract

### Focus / Linkage
- Meaning: current selection linked across map, list, and details.
- Use: the same focus treatment on marker, list row, and details header.
- Color rule: focus blue is reserved for linkage semantics (not generic emphasis).

### Truth (Approved)
- Meaning: server-backed state that is committed.
- Use: approved marker/icon treatment and canonical place details.

### Preview / Ghost
- Meaning: candidate state not yet committed.
- Use: ghost treatment (shape/opacity/tone) must remain visually distinct from approved truth.

### Dim
- Meaning: out-of-scope for current filters/list, still exists.
- Use: reduced prominence for scoping only.

### Disabled
- Meaning: unavailable interaction right now (permissions/loading/invalid state).
- Use: non-interactive affordance treatment.
- Rule: do not use disabled styling as a proxy for dim/scoping.

### Success / Commitment
- Meaning: write completed; DB truth changed.
- Use: quiet confirmation (subtle, short-lived).

### Error
- Meaning: truth did not change.
- Use: factual and recoverable states with clear next action.

---

## 6) Token Contract (semantic roles)

Define and map roles before implementation:
- Surface roles: `surface.base`, `surface.glass`, `surface.elevated`
- Border roles: `border.subtle`, `border.strong`
- Text roles: `ink.primary`, `ink.secondary`, `ink.inverse`
- Semantic roles: `focus.link`, `focus.glow`, `preview.ghost`, `state.success`, `state.error`, `state.dim`, `state.disabled`
- Layer roles: `layer.map`, `layer.context`, `layer.tools`, `layer.toast`

Layering contract must remain:
- Map → Context Panel → Tools Sheet → transient toasts

---

## 7) Overlay Chrome Rules

- Overlays remain bounded and purposeful (no floating-window sprawl).
- Context Panel and Tools Sheet keep stable headers with independent body scroll.
- Light mode uses warm-tinted glass, not opaque paper blocks:
  - low to medium translucency
  - minimal blur (readability first)
  - crisp borders + restrained elevation
- Map remains perceptible behind overlays.

---

## 8) Iconography Rules

- Category iconography is semantic identity and must stay enum-exhaustive.
- Chrome/action icons use one cohesive utility style family.
- Tags remain chips and never compete visually with category identity.

---

## 9) Motion Rules

- Motion is calm and explanatory only: fade, gentle slide, subtle press.
- Focus transitions should read as cross-surface handoff (map ↔ list ↔ details).
- Overlay transitions must not cause map camera movement.
- Respect `prefers-reduced-motion` with reduced/none alternatives.

---

## 10) Accessibility + Contrast

- Overlays must stay readable on both light and dark base map styles.
- Interactive states (focus/hover/active/disabled) must be visually distinct.
- Keyboard focus visibility remains explicit in all overlay contexts.
- Contrast decisions prioritize legibility over decorative effect.

---

## 11) Don’ts / Guardrails

- Don’t introduce new persistent floating panels.
- Don’t style preview as if it is approved truth.
- Don’t repurpose focus blue as a generic “important” color.
- Don’t add meaning-bearing colors without a stable semantic mapping.
- Don’t blur overlays so heavily that map text or panel controls become hard to read.

---

## 12) Acceptance Checks (manual)

- Mobile cannot end up with stacked persistent drawers.
- Back/forward still toggles `?place=` predictably.
- Focus linkage is visible and consistent across marker/list/details header.
- Preview/ghost is unmistakably distinct from approved truth.
- Empty list selection does not move map camera unexpectedly.
- Overlay readability holds on both light and dark map styles.

---

## 13) Rollout Slices (completed)

1. Semantic token mapping and docs alignment.
2. Overlay chrome + icon consistency pass.
3. Motion and reduced-motion pass (`prefers-reduced-motion` honored for glass interactions).
4. Manual QA against existing Phase 2 acceptance checks.

---

## 14) Resolved Defaults

- Focus blue remains reserved for linkage semantics; primary actions use neutral glass button emphasis.
- Light-mode overlays use warm translucent glass with restrained blur and explicit border contrast.
- No destructive-action exception to focus-link blue; destructive intent relies on error/destructive tokens only.

---

## 15) Decision Log

- 2026-02-08: Adopt “warm-tinted glass” wording for light mode to preserve the existing glass contract while improving tone.
- 2026-02-25: Enforce mobile state hierarchy where URL/preview state suppresses local Tools Sheet state.
