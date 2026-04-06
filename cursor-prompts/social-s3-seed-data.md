# Social Discovery S3.3 — Seed Script for Local Dev

## What to build

A seed script that inserts fake social sources, places, and mentions into the local Supabase database. This unblocks S4 (map UI) development — Cursor can build the UI against real data without needing the ingestion pipeline.

## Files to create

- `scripts/seed-social-discovery.ts` — executable via `npx tsx scripts/seed-social-discovery.ts`

## Files to reference (read these first)

- `supabase/migrations/` — the social schema migration (S1) for exact table/column names
- `.env.example` — for `SOCIAL_SYSTEM_USER_ID` and Supabase connection vars
- `lib/social/extraction-contract.ts` — `PERSONA_VALUES` and `PLATFORM_VALUES` for valid enum values

## Implementation

The script should insert **3 social sources** and **8-10 places** across a single city (Bangkok is a good default — existing test data uses it). Each source mentions 2-4 places, creating realistic overlap (some places mentioned by multiple sources).

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const SYSTEM_USER_ID = process.env.SOCIAL_SYSTEM_USER_ID!

// --- Sources ---
const sources = [
  {
    url: 'https://youtube.com/watch?v=seed-bangkok-food-1',
    platform: 'youtube',
    author_name: 'Mark Wiens',
    author_persona: 'foodie',
    title: 'BEST Street Food in Bangkok',
    raw_transcript: 'Today we are visiting the legendary Jay Fai...',
  },
  {
    url: 'https://tiktok.com/@designnomad/seed-bangkok-cafes',
    platform: 'tiktok',
    author_name: 'Design Nomad',
    author_persona: 'design',
    title: 'Hidden design cafes in Bangkok',
    raw_transcript: 'This minimalist café in Ari is everything...',
  },
  {
    url: 'https://blog.example.com/bangkok-local-guide',
    platform: 'blog',
    author_name: 'Pim Techamuanvivit',
    author_persona: 'local',
    title: 'A Local\'s Guide to Old Town Bangkok',
    raw_transcript: 'Forget Khao San Road. Start at Thip Samai...',
  },
]

// --- Places (Bangkok, realistic coords) ---
const places = [
  { name: 'Jay Fai', category: 'Food', lat: 13.7563, lng: 100.5018, google_place_id: 'seed_jay_fai' },
  { name: 'Thip Samai', category: 'Food', lat: 13.7535, lng: 100.5064, google_place_id: 'seed_thip_samai' },
  { name: 'Roots Coffee', category: 'Coffee', lat: 13.7841, lng: 100.5447, google_place_id: 'seed_roots_coffee' },
  { name: 'Kaizen Coffee', category: 'Coffee', lat: 13.7299, lng: 100.5291, google_place_id: 'seed_kaizen_coffee' },
  { name: 'Wat Arun', category: 'Sights', lat: 13.7437, lng: 100.4888, google_place_id: 'seed_wat_arun' },
  { name: 'Chatuchak Market', category: 'Shop', lat: 13.7999, lng: 100.5503, google_place_id: 'seed_chatuchak' },
  { name: 'SEEN Restaurant', category: 'Food', lat: 13.7228, lng: 100.5277, google_place_id: 'seed_seen' },
  { name: 'Warehouse 30', category: 'Sights', lat: 13.7221, lng: 100.5143, google_place_id: 'seed_warehouse30' },
]

// --- Mentions (who mentioned what) ---
// Each tuple: [source_index, place_index, snippet, sentiment]
const mentions: [number, number, string, string][] = [
  [0, 0, 'Jay Fai is the only Michelin-starred street food chef in the world', 'positive'],
  [0, 1, 'Thip Samai has the best pad thai I have ever tasted', 'positive'],
  [0, 6, 'SEEN has incredible views but the food is just okay', 'mixed'],
  [1, 2, 'Roots Coffee in Ari is peak specialty coffee', 'positive'],
  [1, 3, 'Kaizen has this perfect minimalist interior', 'positive'],
  [1, 7, 'Warehouse 30 is an old WWII warehouse turned creative space', 'positive'],
  [2, 0, 'Even locals queue for Jay Fai — go at 3pm to beat the line', 'positive'],
  [2, 1, 'Thip Samai is where real Bangkok people eat pad thai', 'positive'],
  [2, 4, 'Wat Arun at sunrise before the tourists arrive', 'positive'],
  [2, 5, 'Chatuchak on Friday evening is the move, skip the weekend crowds', 'neutral'],
]

async function seed() {
  console.log('Seeding social discovery data...')

  // Insert places (system user owns them)
  const placeIds: string[] = []
  for (const p of places) {
    const { data, error } = await supabase
      .from('places')
      .upsert({
        user_id: SYSTEM_USER_ID,
        name: p.name,
        category: p.category,
        source: 'social',
        source_id: `google:${p.google_place_id}`,
        location: `SRID=4326;POINT(${p.lng} ${p.lat})`,
      }, { onConflict: 'user_id,source,source_id' })
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to insert place ${p.name}:`, error.message)
      continue
    }
    placeIds.push(data.id)
  }

  // Insert sources
  const sourceIds: string[] = []
  for (const s of sources) {
    const { data, error } = await supabase
      .from('social_sources')
      .upsert(s, { onConflict: 'url' })
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to insert source ${s.author_name}:`, error.message)
      continue
    }
    sourceIds.push(data.id)
  }

  // Insert mentions
  for (const [si, pi, snippet, sentiment] of mentions) {
    if (!sourceIds[si] || !placeIds[pi]) continue
    const { error } = await supabase
      .from('social_mentions')
      .upsert({
        source_id: sourceIds[si],
        place_id: placeIds[pi],
        snippet,
        sentiment,
      }, { onConflict: 'source_id,place_id' })

    if (error) {
      console.error(`Failed to insert mention:`, error.message)
    }
  }

  console.log(`Seeded: ${placeIds.length} places, ${sourceIds.length} sources, ${mentions.length} mentions`)

  // Verify with RPC
  const { data: results } = await supabase.rpc('discover_social_places')
  console.log(`RPC returns ${results?.length ?? 0} places. Jay Fai mention count:`,
    results?.find((r: any) => r.name === 'Jay Fai')?.mention_count ?? 'not found')
}

seed().catch(console.error)
```

**Important:** The `location` column uses PostGIS geography type. The `SRID=4326;POINT(lng lat)` format should work for EWKT inserts. If Supabase rejects this format for geography columns, use the `st_point` function via raw SQL instead:

```typescript
await supabase.rpc('exec_sql', {
  sql: `INSERT INTO places (user_id, name, category, source, source_id, location)
        VALUES ($1, $2, $3, 'social', $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
        ON CONFLICT (user_id, source, source_id) WHERE source_id IS NOT NULL DO NOTHING
        RETURNING id`,
  params: [SYSTEM_USER_ID, p.name, p.category, `google:${p.google_place_id}`, p.lng, p.lat]
})
```

## What NOT to do

- Don't use real Google Place IDs — these are fake seed data, prefixed with `seed_`
- Don't modify any production code or migrations
- Don't add this to `package.json` scripts — it's a one-off dev tool

## Verification

After running the script:
1. Check Supabase dashboard → `social_sources` table has 3 rows
2. Check `places` table has 8 new rows with `source = 'social'`
3. Check `social_mentions` table has 10 rows
4. Run `SELECT * FROM discover_social_places()` in SQL editor — should return places with mention counts (Jay Fai = 2, Thip Samai = 2, etc.)
