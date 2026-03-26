# Multi-User List Collaboration — Slices

> Shape Up style: phased rollout, escalating commitment.
> Lets multiple users edit the same trip list via shared links.

## Architecture Target

```
Sharing flow:
Owner → generates share link → collaborator opens link
  → anonymous sign-in (invisible) → sees list → edits persist

Data model:
lists (existing)
└── list_shares (NEW)
    ├── id, list_id, token, permission ('edit'), created_by, created_at, expires_at
    └── RLS: owner can CRUD; token-holder can read share → access list

Realtime (Phase 4):
Supabase Realtime → subscribe to list_items changes → live UI updates
Supabase Presence → show active collaborators
```

---

## Phase 1 — Share Link Generation (Claude Code)

**Goal:** Owner can generate a shareable URL for any list. Backend + schema only.

> **Claude Code** — Supabase migration, RLS policies, API route. Foundation for everything else.

### Tasks

1. **Migration: `list_shares` table**
   ```sql
   create table list_shares (
     id uuid primary key default gen_random_uuid(),
     list_id uuid references lists(id) on delete cascade not null,
     token text unique not null default encode(gen_random_bytes(24), 'hex'),
     permission text not null default 'edit' check (permission in ('view', 'edit')),
     created_by uuid references auth.users(id) not null,
     created_at timestamptz default now(),
     expires_at timestamptz -- null = never expires
   );
   ```

2. **RLS policies on `list_shares`**
   - Owner (created_by = auth.uid()) can SELECT, INSERT, DELETE
   - Any authenticated user (including anonymous) can SELECT where they know the token (for link resolution)

3. **RLS policy updates on `lists` and `list_items`**
   - Add policy: user can SELECT/UPDATE/INSERT/DELETE on `lists` if a `list_shares` row exists for that list and the user has been "admitted" (see Phase 2 for how admission works)
   - Same pattern for `list_items`

4. **API routes**
   - `POST /api/lists/[id]/share` — creates a share, returns `{ token, url }`
   - `GET /api/lists/[id]/share` — returns existing shares for owner
   - `DELETE /api/lists/[id]/share/[shareId]` — revoke

5. **Share URL format:** `/lists/[listId]?token=[token]`

### Acceptance
- [ ] Owner can create a share link via API
- [ ] Share token is cryptographically random (24 bytes hex)
- [ ] RLS prevents non-owners from managing shares
- [ ] Revoking a share invalidates the link

---

## Phase 2 — Anonymous Access (Claude Code + Cursor)

**Goal:** Collaborator opens share link → gets anonymous Supabase session → can see and edit the list.

### Claude Code tasks (auth + data layer)

1. **Enable Supabase anonymous sign-in** in project settings (if not already)
2. **Admission flow:**
   - New table or column: `list_collaborators (list_id, user_id, joined_via_share_id, created_at)`
   - When a user opens a share link, API validates token → creates `list_collaborators` row for their (anonymous) uid
   - RLS on `lists` / `list_items` checks: `auth.uid() in (select user_id from list_collaborators where list_id = ...)`
3. **API route:** `POST /api/lists/join?token=[token]` — validates token, signs in anonymously if needed, creates collaborator row, redirects to list

### Cursor tasks (UI)

1. **Share button in PlannerToolbar**
   - Icon button → modal/popover with:
     - "Copy link" button (calls POST share API, copies URL)
     - List of active shares with revoke buttons
   - Only visible to list owner

2. **Join flow page** (`/lists/join`)
   - Landing page when opening a share link
   - Shows list name + "Join this trip" button
   - On click: calls join API → redirects to `/lists/[id]`
   - If already a collaborator, skip straight to the list

3. **Collaborator indicator**
   - Small avatars/initials in PlannerToolbar showing who has access
   - Tooltip: "Shared with 2 people"

### Acceptance
- [ ] Unauthenticated user opens share link → gets anonymous session → sees the list
- [ ] Anonymous user can add/remove/schedule items
- [ ] Owner sees share controls; collaborators don't
- [ ] Revoking a share removes collaborator access

---

## Phase 3 — Async Sync (Cursor)

**Goal:** Edits from any collaborator persist and appear on refresh. This mostly "just works" once P1+P2 land — the remaining work is UX polish.

### Cursor tasks

1. **Freshness indicator**
   - Show "Last updated: 2 min ago" or "Updated by someone else" banner when list data is stale
   - On focus/visibility change, refetch list items

2. **Optimistic UI hardening**
   - Ensure all mutations (add item, schedule, delete) work correctly for collaborators, not just the owner
   - Test: two browser tabs, different users, edit the same list

3. **Conflict UX**
   - Last write wins (no merge logic)
   - If a refetch shows an item was deleted that the user is viewing, gracefully close the detail panel

### Acceptance
- [ ] Two users editing same list — both see each other's changes on refresh
- [ ] No errors when concurrent edits happen to the same item
- [ ] Page refetches on tab focus

---

## Phase 4 — Realtime Sync (Claude Code + Cursor)

**Goal:** Live edits without refresh, Google Docs style.

> **Escalating commitment checkpoint:** Only start this after P1–P3 are solid and tested.

### Claude Code tasks

1. **Enable Supabase Realtime** on `list_items` and `lists` tables
2. **RLS for Realtime:** Ensure realtime subscriptions respect the same collaborator-based RLS
3. **Presence channel:** Set up a Supabase Realtime channel per list for presence (who's online)

### Cursor tasks

1. **Realtime subscription hook**
   - `useRealtimeListItems(listId)` — subscribes to INSERT/UPDATE/DELETE on `list_items` where `list_id = listId`
   - Merges incoming changes into `useTripStore` without full refetch
   - Unsubscribes on unmount

2. **Presence UI**
   - Show colored dots / initials for active collaborators
   - "Walsh is viewing" / "2 people editing"
   - Uses Supabase Presence to track who's on the list page

3. **Live cursor / selection hints** (stretch)
   - Show which item another user is currently editing
   - Subtle highlight, not blocking

### Acceptance
- [ ] Adding an item in one browser appears in another within ~1s
- [ ] Presence shows who's currently viewing the list
- [ ] No duplicate items from race conditions
- [ ] Unsubscribes cleanly (no memory leaks)
