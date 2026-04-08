# Sources Research Workspace S9 — UI: Triage and Spatial Querying

## Prerequisite

S7 (schema) and S8 (RPC) must be applied and `npm run db:types` must have run. The `discover_research_places` RPC and `research_votes` table must exist in the generated types before wiring.

## What to build

Three tightly coupled UI pieces for the research workspace:

1. **"Search this area" button** — wire the map viewport bounds to the `discover_research_places` RPC call
2. **+/- voting on place cards** — upsert/delete rows in `research_votes` per user interaction
3. **Overlap-scaled map markers** — marker size driven by `overlap_count` (mirrors the existing `mention_count` scaling in `discover_social_places`)

## Files to read first

- `CONTEXT.md`, `AGENTS.md`, `docs/VIBE_PLAYBOOK.md`, `DESIGN.md`
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — Slice 9 spec
- `components/stitch/README.md` — component library reference
- `lib/supabase/types.ts` — verify `discover_research_places` and `research_votes` are present after S7/S8
- `app/api/` — existing API route patterns for Supabase mutations
- Existing social discovery store: search for `useDiscoveryStore` or `useSocialDiscoveryStore` — understand how `discover_social_places` is called today so the new RPC follows the same pattern

## Scope

### 1. Zustand state for research workspace

Locate or extend the appropriate store (likely near `useDiscoveryStore`). Add:

```typescript
// Research workspace state
researchListId: string | null;         // which research list is active
researchPlaces: DiscoverResearchPlace[]; // results from discover_research_places
researchBounds: BBox | null;           // current map viewport when "Search this area" is active
isResearchLoading: boolean;
researchError: string | null;

// Actions
setResearchListId: (id: string | null) => void;
fetchResearchPlaces: (listId: string, bounds?: BBox) => Promise<void>;
castVote: (listId: string, placeId: string, value: 1 | -1 | null) => Promise<void>;
```

`DiscoverResearchPlace` should match the RPC return shape from `lib/supabase/types.ts`.

`castVote(value: null)` deletes the row (clears the vote).

### 2. "Search this area" button

- Show the button when the map has moved and `researchListId` is set (research mode active)
- Position: centered above the map, same pattern as any existing floating map control
- On click: call `fetchResearchPlaces(researchListId, currentViewportBounds)`
- Pass bounds as `ST_MakeEnvelope(west, south, east, north, 4326)` — derive from Mapbox `map.getBounds()`
- After results load, hide the button until the map moves again

### 3. +/- voting on place cards

Place cards in the research workspace panel show two controls:

```
[▲ +3] [▼]   Place Name
```

- Up arrow: `castVote(listId, placeId, 1)`
- Down arrow: `castVote(listId, placeId, -1)`
- If `user_vote === 1`, up arrow is filled/active; if `user_vote === -1`, down arrow is active
- Clicking the active vote again calls `castVote(listId, placeId, null)` (toggle off / delete row)
- Net score shown between the two arrows
- Net-negative places (`net_score < 0`) render at reduced opacity (0.5) to visually de-emphasize them — no hiding

### 4. Overlap-scaled map markers (research layer)

Research workspace places render on the map with size driven by `overlap_count`. Use the same breakpoints as the existing `mention_count` scaling:

| `overlap_count` | Marker size |
|---|---|
| 1 | 36px (standard) |
| 2–3 | 44px |
| 4+ | 52px + subtle glow ring |

These markers are only visible when `researchListId` is set (research mode). They do not replace or interfere with the standard social discovery markers.

### 5. API route for voting

Create `app/api/research/vote/route.ts`:

```typescript
// POST: upsert vote
// DELETE: clear vote (pass value: null)
// Body: { list_id, place_id, vote_value: 1 | -1 | null }
```

Use the Supabase server client (service role not needed — RLS handles per-user writes). Validate input with Zod. Return `{ ok: true }` on success.

## What NOT to do

- Don't build the "Add to Trip" mutation here — that's S10
- Don't add real-time vote sync — polling on re-focus is sufficient for MVP
- Don't modify the existing social discovery persona chips or `discover_social_places` RPC wiring
- Don't add a separate map layer for research places — merge with the existing marker layer, gated by `researchListId`

## Verification

1. Set `researchListId` to a list with attached sources — research place markers appear on map
2. Move the map — "Search this area" button appears
3. Click "Search this area" — markers update to viewport
4. Click ▲ on a place card — vote row created, score increments, button fills
5. Click ▲ again — vote row deleted, score decrements
6. Click ▼ — downvote created, card fades to 50% opacity
7. Persona chips and trip-list markers are unaffected
8. `npm test` passes; no regression on existing Playwright flows

## Update CONTEXT.md

Mark S9 as **Done** in the Sources Research Workspace slice table.
