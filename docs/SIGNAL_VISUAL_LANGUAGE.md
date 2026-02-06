# Signal Visual Language (Acerca)

**Purpose**
Define a consistent UI language for a **map-first planner** so the interface communicates *truth, focus, and state* without becoming a pile of floating windows—especially on mobile.

---

## 1) Core Thesis

> The map is truth, and pins are state.

Visuals should make it obvious:
- what is **approved truth** vs **preview**
- what is **selected/focused** vs **dimmed**
- what is **actionable now** vs **background context**

---

## 2) Visual Principles (Non‑Negotiables)

### A. Map-First, Panel-Second
- The map is always visible behind overlays.
- Overlays must be *bounded* and *purposeful* (no “window manager” feel).

### B. One Primary Panel
- Prefer **one Context Panel** that can change modes (Lists / Place / Search) over multiple independent drawers.
- If split view is needed, it happens **inside** the Context Panel.

### C. Calm, Glass, High Contrast
- Glass surfaces are for overlays only; the map stays the visual anchor.
- Text and controls must stay readable over both light and dark base maps.

### D. Semantics > Decoration
- Every visual flourish maps to meaning (focus, truth, preview, error).
- If it doesn’t change meaning, it doesn’t ship.

---

## 3) State Semantics (What Colors/Effects Mean)

### Focus Glow
**Meaning:** “this place is the current focus and is linked across surfaces.”
- Apply the same glow to the focused map marker **and** the focused list row **and** the Place view header.
- Never use glow for generic hover states.

### Dim
**Meaning:** “not in the active set (filters/list scope), but still exists.”
- Dim is for *scoping*, not for “disabled” or “broken.”

### Ghost / Preview
**Meaning:** “not yet approved; not truth.”
- Ghost pins must be visually distinct from approved pins (shape, opacity, or treatment).
- The UI must avoid presenting preview facts as permanent (“Saved”, “In your map”) until approval.

### Success / Commitment
**Meaning:** “a write happened and the DB is now truth.”
- Use a subtle confirmation state (no confetti).
- Default to quiet success; reserve strong emphasis for irreversible actions.

### Error
**Meaning:** “server truth didn’t change.”
- Errors are factual and recoverable: what failed + what to do next.

---

## 4) Iconography & Taxonomy Rules

### Category Icons
- Category is a **strict enum** and must map 1:1 to iconography.
- Approved pins always render using category icon/emoji (e.g., Food/Coffee/Sights/Shop/Activity).
- Never invent new category visuals without updating the enum + exhaustive checks.

### Tags
- Tags are *user/list-scoped* labels, not categories.
- Tags should be shown as chips and never compete visually with category icons.

---

## 5) Overlay Chrome (Shared Across Panels)

### Context Panel (Primary)
- Bounded surface with a clear header (title + close/back affordance).
- Body scrolls; header stays stable.
- Split view (Lists | Place) is an internal layout, not separate windows.

### Tools Sheet (Secondary)
- A transient surface for “Layers”, base map style, and account actions.
- Collapses cleanly; does not fight with the Context Panel for attention.

### Layering Guardrails
- Prefer **one z-stack**: Map → Context Panel → Tools Sheet → transient toasts.
- Avoid having to “measure” one overlay to position another (minimize offset choreography).

---

## 6) Motion & Interaction
- Calm only: fade, gentle slide, subtle press states.
- Respect `prefers-reduced-motion`.
- Overlay transitions should never cause map camera movement as a side effect.

---

## 7) Don’ts (Hard Guardrails)
- Don’t create new persistent floating panels without a strong reason.
- Don’t use the same visual treatment for preview and approved truth.
- Don’t turn tags into a second taxonomy that competes with categories.
- Don’t add “importance colors” without mapping them to a stable semantic meaning.

