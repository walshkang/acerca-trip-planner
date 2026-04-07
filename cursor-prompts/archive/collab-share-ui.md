# Collaboration — Share UI + Join Flow

## What to build

1. **Share button** in the planner toolbar so the list owner can generate and copy a share link
2. **Join flow page** so a collaborator opening a share link gets admitted to the list
3. **Collaborator indicator** showing who has access

## Prerequisites

- Migration `20260326000002_create_list_shares_and_collaborators.sql` must be applied
- API routes exist:
  - `POST /api/lists/[id]/share` — creates share, returns `{ id, token, url, permission, ... }`
  - `GET /api/lists/[id]/share` — lists shares for owner, returns `{ shares: [...] }`
  - `DELETE /api/lists/[id]/share/[shareId]` — revokes a share
  - `POST /api/lists/join` — body `{ token }`, creates anonymous session if needed, returns `{ list_id, permission }`

## Files to reference (read these first)

- `app/api/lists/[id]/share/route.ts` — share API (response shapes)
- `app/api/lists/join/route.ts` — join API (response shape + anonymous sign-in flow)
- `components/app/PlannerShellPaper.tsx` — planner layout, where share button goes
- `components/paper/PaperHeader.tsx` — header actions area
- `lib/supabase/types.ts` — `list_shares` and `list_collaborators` types

## Implementation steps

### 1. Share button + modal in PlannerShellPaper

**File:** `components/planner/ShareListButton.tsx` (new)

A button that opens a popover/modal for sharing:

```
┌────────────────────────────────────┐
│  Share this trip                   │
│                                    │
│  [🔗 Copy share link]             │
│                                    │
│  Active shares:                    │
│  • Created Mar 26 — [Revoke]      │
│                                    │
│  Shared with 1 person             │
└────────────────────────────────────┘
```

**Behavior:**
- On mount: `GET /api/lists/[id]/share` to fetch existing shares
- "Copy share link" button:
  - If no share exists yet, `POST /api/lists/[id]/share` first
  - Copy the returned URL to clipboard
  - Show brief "Copied!" feedback
- Each share row has a "Revoke" button → `DELETE /api/lists/[id]/share/[shareId]`
- Only rendered when the current user is the list owner

**Placement:** Add to the PlannerShellPaper toolbar area, near the export/settings buttons. Use a `share` Material Symbol icon.

### 2. Join flow page

**File:** `app/lists/join/page.tsx` (new)

This page handles the redirect when someone opens a share link `/lists/[listId]?token=[token]`.

**Option A (simpler):** Handle it in the existing list page. In the list page component, detect `?token=` in search params. If present:
1. Call `POST /api/lists/join` with the token
2. On success: remove the `?token` param from the URL (replace state), continue loading the list
3. On error: show a message ("This link is invalid or expired")

**Option B:** Dedicated `/lists/join?token=X` page with a "Join this trip" button. More explicit but adds a page.

**Recommend Option A** — it's seamless. The collaborator opens the link and just sees the list.

**Implementation (Option A):**
- In the component that loads a list by ID (likely in `app/lists/[id]/page.tsx` or the shell that wraps it), add an effect:

```typescript
const token = searchParams.get('token')

useEffect(() => {
  if (!token) return
  fetch('/api/lists/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.list_id) {
        // Success — clean the URL
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        window.history.replaceState({}, '', url.toString())
      }
    })
    .catch(console.error)
}, [token])
```

### 3. Owner detection

The share button should only appear for the list owner. You'll need to compare `list.user_id` against the current auth user.

Check how auth is accessed in other components — likely via Supabase client:
```typescript
const supabase = getSupabase()
const { data: { user } } = await supabase.auth.getUser()
const isOwner = user?.id === list.user_id
```

Or pass `isOwner` as a prop from the parent that already has this info.

### 4. Collaborator indicator (stretch)

Small detail in the planner toolbar:
- Fetch collaborator count: query `list_collaborators` where `list_id = activeListId`
- Show: "Shared with N people" or small avatar circles
- This is polish — skip if time is tight

## What NOT to do

- Don't implement realtime sync — that's Phase 4
- Don't add a full user profile/avatar system — just show counts or initials
- Don't modify the share/join API routes — they're already built
- Don't add email invitations — link sharing only for now
