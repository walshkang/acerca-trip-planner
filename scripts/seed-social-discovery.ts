import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'
import { PERSONA_VALUES, PLATFORM_VALUES } from '../lib/social/extraction-contract'

type SeedSource = {
  url: string
  platform: (typeof PLATFORM_VALUES)[number]
  author_name: string
  author_persona: (typeof PERSONA_VALUES)[number]
  title: string
  raw_transcript: string
}

type SeedPlace = {
  name: string
  category: Database['public']['Enums']['category_enum']
  lat: number
  lng: number
  google_place_id: string
}

type SeedMentionTuple = [number, number, string, 'positive' | 'neutral' | 'mixed']

type DiscoverSocialPlace = {
  place_id: string
  name: string
  mention_count: number
}

loadEnv({ path: path.join(process.cwd(), '.env.local') })

const sources: SeedSource[] = [
  {
    url: 'https://youtube.com/watch?v=seed-bangkok-food-1',
    platform: 'youtube',
    author_name: 'Mark Wiens',
    author_persona: 'foodie',
    title: 'BEST Street Food in Bangkok',
    raw_transcript: 'Today we are visiting the legendary Jay Fai and following up with old town classics.',
  },
  {
    url: 'https://tiktok.com/@designnomad/seed-bangkok-cafes',
    platform: 'tiktok',
    author_name: 'Design Nomad',
    author_persona: 'design',
    title: 'Hidden design cafes in Bangkok',
    raw_transcript: 'This minimalist cafe in Ari is everything, and Warehouse 30 is a must-stop creative district.',
  },
  {
    url: 'https://blog.example.com/bangkok-local-guide',
    platform: 'blog',
    author_name: 'Pim Techamuanvivit',
    author_persona: 'local',
    title: "A Local's Guide to Old Town Bangkok",
    raw_transcript: 'Forget Khao San Road. Start at Thip Samai, then head to Wat Arun at sunrise.',
  },
]

const places: SeedPlace[] = [
  { name: 'Jay Fai', category: 'Food', lat: 13.7563, lng: 100.5018, google_place_id: 'seed_jay_fai' },
  { name: 'Thip Samai', category: 'Food', lat: 13.7535, lng: 100.5064, google_place_id: 'seed_thip_samai' },
  { name: 'Roots Coffee', category: 'Coffee', lat: 13.7841, lng: 100.5447, google_place_id: 'seed_roots_coffee' },
  { name: 'Kaizen Coffee', category: 'Coffee', lat: 13.7299, lng: 100.5291, google_place_id: 'seed_kaizen_coffee' },
  { name: 'Wat Arun', category: 'Sights', lat: 13.7437, lng: 100.4888, google_place_id: 'seed_wat_arun' },
  { name: 'Chatuchak Market', category: 'Shop', lat: 13.7999, lng: 100.5503, google_place_id: 'seed_chatuchak' },
  { name: 'SEEN Restaurant', category: 'Food', lat: 13.7228, lng: 100.5277, google_place_id: 'seed_seen' },
  { name: 'Warehouse 30', category: 'Sights', lat: 13.7221, lng: 100.5143, google_place_id: 'seed_warehouse30' },
]

const mentions: SeedMentionTuple[] = [
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

function assertSeedEnums() {
  for (const source of sources) {
    if (!PLATFORM_VALUES.includes(source.platform)) {
      throw new Error(`Invalid platform in seed data: ${source.platform}`)
    }
    if (!PERSONA_VALUES.includes(source.author_persona)) {
      throw new Error(`Invalid persona in seed data: ${source.author_persona}`)
    }
  }
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function createSeedClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const systemUserId = requireEnv('SOCIAL_SYSTEM_USER_ID')

  const supabase = createClient<Database>(url, serviceRoleKey)
  return { supabase, systemUserId }
}

async function upsertPlaces(supabaseClient: SupabaseClient<Database>, systemUserId: string) {
  const idsByIndex: Array<string | null> = new Array(places.length).fill(null)
  let successCount = 0

  for (const [index, place] of places.entries()) {
    const sourceId = `google:${place.google_place_id}`
    const { data: existingPlace, error: existingPlaceError } = await supabaseClient
      .from('places')
      .select('id')
      .eq('user_id', systemUserId)
      .eq('source', 'social')
      .eq('source_id', sourceId)
      .maybeSingle()

    if (existingPlaceError) {
      throw new Error(`Failed to lookup existing place "${place.name}": ${existingPlaceError.message}`)
    }

    const payload = {
      user_id: systemUserId,
      name: place.name,
      category: place.category,
      source: 'social' as const,
      source_id: sourceId,
      google_place_id: place.google_place_id,
      dedupe_key: sourceId,
      enrichment_source_hash: 'social-seed',
      location: `SRID=4326;POINT(${place.lng} ${place.lat})`,
    }

    const query = existingPlace
      ? supabaseClient.from('places').update(payload).eq('id', existingPlace.id)
      : supabaseClient.from('places').insert(payload)

    const { data, error } = await query
      .select('id')
      .single()

    if (error) {
      const fkHint = error.message.includes('places_user_id_fkey')
        ? ' Ensure SOCIAL_SYSTEM_USER_ID is set to an existing auth user UUID.'
        : ''
      throw new Error(
        `Failed to upsert place "${place.name}": ${error.message}.${fkHint} If this is a geography parsing issue, insert location via ST_SetSRID(ST_MakePoint(lng, lat), 4326).`
      )
    }

    idsByIndex[index] = data.id
    successCount += 1
  }

  return { idsByIndex, successCount }
}

async function upsertSources(supabaseClient: SupabaseClient<Database>) {
  const idsByIndex: Array<string | null> = new Array(sources.length).fill(null)
  let successCount = 0

  for (const [index, source] of sources.entries()) {
    const { data, error } = await supabaseClient
      .from('social_sources')
      .upsert(source, { onConflict: 'url' })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to upsert source "${source.author_name}": ${error.message}`)
    }

    idsByIndex[index] = data.id
    successCount += 1
  }

  return { idsByIndex, successCount }
}

async function upsertMentions(
  supabaseClient: SupabaseClient<Database>,
  sourceIdsByIndex: Array<string | null>,
  placeIdsByIndex: Array<string | null>
) {
  let successCount = 0
  let skippedCount = 0

  for (const [sourceIndex, placeIndex, snippet, sentiment] of mentions) {
    const sourceId = sourceIdsByIndex[sourceIndex]
    const placeId = placeIdsByIndex[placeIndex]
    if (!sourceId || !placeId) {
      skippedCount += 1
      continue
    }

    const { error } = await supabaseClient
      .from('social_mentions')
      .upsert(
        {
          source_id: sourceId,
          place_id: placeId,
          snippet,
          sentiment,
        },
        { onConflict: 'source_id,place_id' }
      )

    if (error) {
      throw new Error(
        `Failed to upsert mention (source index ${sourceIndex}, place index ${placeIndex}): ${error.message}`
      )
    }

    successCount += 1
  }

  return { successCount, skippedCount }
}

async function rpcSanityCheck(supabaseClient: SupabaseClient<Database>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not yet in generated types
  const { data, error } = await (supabaseClient as any).rpc('discover_social_places')
  if (error) {
    throw new Error(`RPC discover_social_places failed: ${error.message}`)
  }

  const results = (data ?? []) as DiscoverSocialPlace[]
  const jayFaiMentions = results.find((row) => row.name === 'Jay Fai')?.mention_count ?? 0
  const thipSamaiMentions = results.find((row) => row.name === 'Thip Samai')?.mention_count ?? 0

  console.log(`RPC returns ${results.length} place rows`)
  console.log(`Jay Fai mention_count=${jayFaiMentions}, Thip Samai mention_count=${thipSamaiMentions}`)
}

async function seed() {
  assertSeedEnums()
  const { supabase: supabaseClient, systemUserId } = createSeedClient()
  console.log('Seeding social discovery data...')

  const placeResult = await upsertPlaces(supabaseClient, systemUserId)
  const sourceResult = await upsertSources(supabaseClient)
  const mentionResult = await upsertMentions(supabaseClient, sourceResult.idsByIndex, placeResult.idsByIndex)

  console.log(
    `Upsert complete: ${placeResult.successCount} places, ${sourceResult.successCount} sources, ${mentionResult.successCount} mentions (${mentionResult.skippedCount} skipped)`
  )

  await rpcSanityCheck(supabaseClient)
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Seed failed: ${message}`)
  process.exit(1)
})
