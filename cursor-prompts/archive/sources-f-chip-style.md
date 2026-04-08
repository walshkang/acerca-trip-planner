# Sources F — Chip visual refresh (gray + rounded)

## Goal

`paper-chip-active` (used for callout pills on source place cards) is currently near-black (`#1b1c15`) with `border-radius: 2px`. Change it to a warm medium gray with more rounded corners. Also bump the base `paper-chip` corner radius to match.

---

## Changes — `app/globals.css`

### `paper-chip` (base chip)

Change `border-radius` from `2px` → `6px`.

Before:
```css
.paper-chip {
  @apply inline-flex items-center px-3 py-1 text-[11px] font-bold uppercase tracking-wider;
  border: 1px solid #e2e3e1;
  border-radius: 2px;
  background-color: #efeee3;
  color: #1b1c15;
}
```

After:
```css
.paper-chip {
  @apply inline-flex items-center px-3 py-1 text-[11px] font-bold uppercase tracking-wider;
  border: 1px solid #e2e3e1;
  border-radius: 6px;
  background-color: #efeee3;
  color: #1b1c15;
}
```

### `paper-chip-active` (active/callout state)

Change from black fill to warm medium gray. Keep dark text for readability (light text on gray is harder to read at small sizes).

Before:
```css
.paper-chip-active {
  background-color: #1b1c15;
  border-color: #1b1c15;
  color: #fbfaee;
}
```

After:
```css
.paper-chip-active {
  background-color: #9a9b92;
  border-color: #7c7d75;
  color: #1b1c15;
  border-radius: 6px;
}
```

`#9a9b92` is a warm neutral gray that fits the paper palette (desaturated olive-gray family). Dark text (`#1b1c15`) gives solid contrast at the small sizes used on callout pills.

---

## Context

`paper-chip-active` is applied in `SourcesPanel.tsx` on callout pills:

```tsx
<span className="paper-chip-active py-0.5 text-[10px]">
  {calloutPrefix(callout.type)} {callout.text}
</span>
```

`paper-chip` (base) is used for category badges and platform chips throughout Sources and Explore.

---

## What NOT to change

- `paper-button-primary`, `paper-button-ghost` — no changes
- Any component files — CSS only
- The `py-0.5 text-[10px]` overrides on individual chips — leave as-is

---

## Verification

After applying: visually confirm callout pills (dish/drink/activity/tip) in `SourcesPanel` render in gray with rounded corners, not black. Run `npm run check` before committing.
