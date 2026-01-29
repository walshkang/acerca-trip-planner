import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlaceUserMetaForm from '@/components/places/PlaceUserMetaForm'
import PlaceListMembershipEditor from '@/components/places/PlaceListMembershipEditor'
import { getEnrichmentById } from '@/lib/server/places/getPlaceEnrichment'
import { assertValidWikiCuratedData, type WikiCuratedData } from '@/lib/enrichment/wikiCurated'

type NormalizedData = {
  category: string
  energy?: string | null
  tags: string[]
  vibe?: string | null
}

function safeWikiCurated(v: unknown): WikiCuratedData | null {
  try {
    assertValidWikiCuratedData(v)
    return v as WikiCuratedData
  } catch {
    return null
  }
}

function safeNormalizedData(v: unknown): NormalizedData | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const d = v as any
  if (typeof d.category !== 'string') return null
  if (!Array.isArray(d.tags) || d.tags.some((t: any) => typeof t !== 'string')) return null
  if (d.energy !== undefined && d.energy !== null && typeof d.energy !== 'string') return null
  if (d.vibe !== undefined && d.vibe !== null && typeof d.vibe !== 'string') return null
  return d as NormalizedData
}

export default async function PlaceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/places/${params.id}`)}`)
  }

  const { data: place, error } = await supabase
    .from('places')
    .select(
      'id, name, address, category, energy, user_notes, user_tags, enrichment_id, created_at, updated_at'
    )
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !place) {
    redirect('/')
  }

  const { data: listItems } = await supabase
    .from('list_items')
    .select('lists ( id, name, is_default )')
    .eq('place_id', place.id)

  const lists = ((listItems ?? []) as Array<{
    lists: { id: string; name: string; is_default: boolean } | null
  }>)
    .map((row) => row.lists)
    .filter((list): list is { id: string; name: string; is_default: boolean } =>
      Boolean(list)
    )
  const listIds = lists.map((list) => list.id)

  const enrichment = place.enrichment_id
    ? await getEnrichmentById(place.enrichment_id)
    : null

  const normalized = safeNormalizedData(enrichment?.normalized_data ?? null)
  const wikiCurated = safeWikiCurated(enrichment?.curated_data ?? null)

  const rawSources = enrichment?.raw_sources as any
  const fallbackSummary =
    typeof rawSources?.wikipediaSummary?.summary === 'string'
      ? rawSources.wikipediaSummary.summary
      : null
  const fallbackThumbnail =
    typeof rawSources?.wikipediaSummary?.thumbnail_url === 'string'
      ? rawSources.wikipediaSummary.thumbnail_url
      : null

  const summary = wikiCurated?.summary ?? fallbackSummary
  const thumbnailUrl = wikiCurated?.thumbnail_url ?? fallbackThumbnail

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a className="text-sm underline text-gray-700" href="/">
              ← Back to map
            </a>
            <h1 className="mt-2 text-2xl font-semibold">{place.name}</h1>
            <p className="mt-1 text-sm text-gray-600">{place.address}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-gray-200 px-3 py-1 text-xs">
                {place.category}
              </span>
              {place.energy ? (
                <span className="rounded-full border border-gray-200 px-3 py-1 text-xs">
                  Energy: {place.energy}
                </span>
              ) : null}
            </div>
          </div>

          <form action="/auth/sign-out" method="post">
            <button
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Wikipedia</h2>
          {summary || thumbnailUrl || wikiCurated?.primary_fact_pairs?.length ? (
            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <div className="flex gap-4">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt={wikiCurated?.wikipedia_title ?? place.name}
                    className="h-20 w-20 shrink-0 rounded-md object-cover bg-gray-50"
                  />
                ) : null}
                <div className="space-y-2">
                  {wikiCurated?.wikipedia_title ? (
                    <p className="text-xs text-gray-500">
                      {wikiCurated.wikipedia_title}{' '}
                      {wikiCurated.wikidata_qid ? `· ${wikiCurated.wikidata_qid}` : ''}
                    </p>
                  ) : null}
                  {summary ? <p className="text-sm leading-6">{summary}</p> : null}
                </div>
              </div>

              {Array.isArray(wikiCurated?.primary_fact_pairs) &&
              wikiCurated.primary_fact_pairs.length ? (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {wikiCurated.primary_fact_pairs.map((p) => (
                    <div key={`${p.label}:${p.value}`} className="flex gap-2">
                      <dt className="text-gray-500">{p.label}:</dt>
                      <dd className="text-gray-900">{p.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              No curated Wikipedia data yet.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Frozen enrichment
          </h2>
          {normalized ? (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div>
                <span className="font-medium">Category:</span>{' '}
                {normalized.category}
              </div>
              {normalized.energy ? (
                <div>
                  <span className="font-medium">Energy:</span>{' '}
                  {normalized.energy}
                </div>
              ) : null}
              {normalized.vibe ? (
                <div>
                  <span className="font-medium">Vibe:</span> {normalized.vibe}
                </div>
              ) : null}
              {Array.isArray(normalized.tags) && normalized.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {normalized.tags.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No tags yet.</p>
              )}
              <p className="pt-2 text-xs text-gray-500">
                Model: {enrichment?.model} · Prompt: {enrichment?.prompt_version}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              No enrichment attached yet. Run enrichment on the candidate, then
              promote.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Your notes & tags
          </h2>
          <div className="mt-3">
            <PlaceUserMetaForm
              placeId={place.id}
              initialNotes={place.user_notes ?? null}
              initialTags={place.user_tags ?? null}
            />
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Lists</h2>
          <div className="mt-3">
            <PlaceListMembershipEditor
              placeId={place.id}
              initialSelectedIds={listIds}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
