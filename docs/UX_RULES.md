# UX Rules (Map-first, Mobile-first)

This document defines the **surface model** and **device rules** so the UI stays simple as Phase 2 grows.

---

## 1) Surface Model (Window Budget)

### Always
- **Map Canvas** is always present and interactive.

### Primary overlay (persistent)
- **Context Panel**: the single “working surface” for Lists + Place + Search.
  - Supports **split view** (Lists | Place) *inside the panel* when appropriate.

### Secondary overlay (transient)
- **Tools Sheet**: layers, base map style, account actions, debug toggles.

**Budget**
- **Mobile:** Map + *one* overlay at a time (Context Panel OR Tools Sheet).
- **Desktop:** Map + Context Panel, plus Tools Sheet if needed (never 3+ persistent windows).

---

## 2) Mobile Rules (Bottom Sheet First)

### Context Panel = Bottom Sheet
- Snap points: `hidden → peek → half → full`
- Header is always visible; body scrolls independently.
- Sheet must respect safe areas and on-screen keyboard.

### Mobile navigation (Bottom Tabs)
- Bottom tabs are part of the map shell (not additional windows).
- Tabs switch the Context Panel **mode**, not the underlying “map route”.
  - Suggested mapping: `Explore` (Search), `Lists`, `Plan` (Phase 2).
- Switching tabs must not stack drawers; it should set a predictable sheet state (usually `peek` or `half`).
- Tools remain a secondary overlay and must be mutually exclusive with the Context Panel on mobile.

### Back behavior (predictable)
Close in order:
1) Tools Sheet
2) Context Panel full/half → peek
3) Context Panel peek → hidden
4) Base map route

### Focus rules
- Selecting a map marker opens Place in the Context Panel.
- Selecting a list opens Lists in the Context Panel (pins update emphasis; camera stays stable unless user requests).

---

## 3) Desktop Rules (Docked, Not Floating)

- Context Panel is docked (left or right) and bounded.
- Split view is allowed inside the panel:
  - left: list context + filters
  - right: place context (preview/approved details)
- Tools Sheet is a single bounded panel (not a stack of mini-panels).

---

## 4) State & Routing Rules

### URL is UI state
- `/?place=<id>` opens the Place view (deep linkable; back/forward works).
- Prefer adding `/?list=<id>` for list selection (deep linkable).
- If both exist, show split view and highlight membership context.

### Truth boundaries
- Preview state is never treated as “saved” until approval succeeds.
- User edits never overwrite frozen enrichment fields.

---

## 5) Interaction Rules

### No surprise camera moves
- Opening/closing panels does not move the map camera.
- List selection should not re-center the map when the list is empty.

### Input locking (avoid interleavings)
- Any server write (approve, tag edit, membership change) must show a saving state and avoid double-submit.

### Accessibility
- Overlays must be keyboard navigable; close is reachable and labeled.
- Focus management: opening an overlay moves focus into it; closing returns focus to the invoking control.
- Respect `prefers-reduced-motion`.

---

## 6) Quick acceptance checks (manual)
- On mobile, you can’t end up with multiple drawers stacked.
- Back/forward toggles `?place=` cleanly without weird intermediate states.
- Ghost/preview visuals are unmistakable vs approved pins.
- Tags and Type remain visually and verbally distinct.
