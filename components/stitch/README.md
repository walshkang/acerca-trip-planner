# Stitch presentation layer

UI components that were moved from `components/discovery/`, `components/lists/`, and `components/places/` live here as the home for map-adjacent presentation. They are wired by `components/app/ExploreShellPaper.tsx` and `components/app/PlannerShellPaper.tsx` to Zustand and existing API routes.

When regenerating layouts in Google Stitch, keep the **Playwright contract** in root `DESIGN.md` (stable `data-testid`s, roles, labels, placeholders).
