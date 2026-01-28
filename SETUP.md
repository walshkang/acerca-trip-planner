# Setup Instructions

## Read First
- `AGENTS.md` for invariants + Definition of Done.
- `docs/VIBE_PLAYBOOK.md` for the workflow checklist.
- `CONTEXT.md` for current phase and blockers.

## Prerequisites

1. Node.js 18+ installed
2. Supabase CLI installed (see https://supabase.com/docs/guides/cli)
3. Supabase project created (via dashboard or CLI)

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Then fill in your actual API keys:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` - Get from https://account.mapbox.com/
   - `NEXT_PUBLIC_SUPABASE_URL` - From your Supabase project settings
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From your Supabase project settings
   - `GOOGLE_PLACES_API_KEY` - From Google Cloud Console
   - `SUPABASE_SERVICE_ROLE_KEY` - From your Supabase project settings (keep secret!)
   - `OPENAI_API_KEY` - From OpenAI (or use GEMINI_API_KEY)

3. **Initialize Supabase locally (optional, for local development):**
   ```bash
   supabase init
   supabase start
   ```

4. **Link to remote Supabase project:**
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

5. **Run database migrations:**
   ```bash
   supabase db push
   ```
   Or apply migrations manually via Supabase dashboard SQL editor.

6. **Generate TypeScript types:**
   ```bash
   npm run db:types
   ```
   Or manually (local or remote):
   ```bash
   supabase gen types typescript --local > lib/supabase/types.ts
   # or
   supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
   ```

7. **Start development server:**
   ```bash
   npm run dev
   ```

## Supabase CLI (no Docker) quickstart

Use this when you want a fresh terminal window ready for DB types + CLI work.

1. Open a new terminal and `cd` into the repo:
   ```bash
   cd /Users/walsh.kang/documents/github/acerca-trip-planner
   ```

2. Export your project ref (use the ref from your Supabase dashboard URL):
   ```bash
   export SUPABASE_PROJECT_REF="<project-ref>"
   ```

3. Login once (opens a browser):
   ```bash
   npx supabase login
   ```
   Or set a token for non-interactive usage:
   ```bash
   export SUPABASE_ACCESS_TOKEN="<token>"
   ```

4. Generate types via the script:
   ```bash
   npm run db:types
   ```

Notes:
- `npx supabase` stores a local CLI cache under `supabase/.temp/`.
- If types already match the current schema, `git status` will show no changes.

## Database Migrations

Migrations are located in `supabase/migrations/` and should be applied in order:
1. `20240125000001_enable_postgis.sql` - Enable PostGIS extension
2. `20240125000002_create_enums.sql` - Create Category and Energy enums
3. `20240125000003_create_place_candidates.sql` - Create staging table
4. `20240125000004_create_enrichments.sql` - Create enrichments table
5. `20240125000004b_add_enrichment_fkey.sql` - Add foreign key constraint
6. `20240125000005_create_places.sql` - Create canonical places table
7. `20240125000006_create_updated_at_trigger.sql` - Create updated_at trigger
8. `20240125000007_setup_rls.sql` - RLS policies (already in table migrations)

## Testing

Run tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

Run repo checks:
```bash
npm run check
```

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - React components (map, places, UI)
- `lib/` - Library code (Supabase clients, enrichment, staging, types)
- `supabase/migrations/` - Database migration files
- `public/icons/` - SVG icon assets
- `tests/` - Test files

## Key Architectural Principles

1. **Deterministic Runtime Boundary**: Client/UI reads only from `places` table (canonical layer). External sources write to `place_candidates` (staging layer).

2. **Enrich Once, Read Forever**: Enrichment happens once at ingestion, frozen with hash-based versioning.

3. **User Edit Precedence**: Canonical fields (`name`, `address`, `category`, `energy`) are never overwritten by AI.

4. **Strict Taxonomy**: Enums defined in database, TypeScript enums derived from DB (single source of truth).

## Next Steps

1. Implement LLM enrichment normalization (see `lib/server/enrichment/normalize.ts`)
2. Implement Google Places API integration (see `lib/places/google-places.ts`)
3. Implement Wikipedia/Wikidata fetching + curation (see `lib/enrichment/sources.ts` and `lib/enrichment/curation.ts`)
4. Add place detail view component
5. Add place list component
6. Implement drag-and-drop itinerary planning (Phase 2)

## Wikipedia/Wikidata curated fields

Enrichment stores a UI-safe curated object in `enrichments.curated_data` (and includes it in the `source_hash` snapshot for freezing/versioning).

Shape (frozen):
- `summary` / `thumbnail_url`: from Wikipedia `w/api.php` `extracts|pageimages` (`fetchWikipediaSummary`)
- `wikipedia_title`: best match selected from GeoSearch (`selectBestWikipediaMatch`)
- `wikidata_qid`: from Wikipedia pageprops `wikibase_item`
- `primary_fact_pairs`: extracted from Wikidata EntityData with stable mapping (`extractPrimaryWikidataFactPairs`)
  - `Founded`: `P571` (inception) → year
  - `Architect`: `P84` → label (fallback to QID)
  - `Elevation`: `P2044` → number + unit (meters when unit `Q11573`)
  - `Website`: `P856` (official website)
