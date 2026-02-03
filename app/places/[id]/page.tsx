import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlaceUserMetaForm from '@/components/places/PlaceUserMetaForm'
import PlaceListMembershipEditor from '@/components/places/PlaceListMembershipEditor'
import PlaceListTagsEditor from '@/components/places/PlaceListTagsEditor'
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
      'id, name, address, category, energy, user_notes, enrichment_id, created_at, updated_at'
    )
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !place) {
    redirect('/')
  }

  const { data: listItems } = await supabase
    .from('list_items')
    .select('id, tags, lists ( id, name, is_default )')
    .eq('place_id', place.id)

  const listEntries = ((listItems ?? []) as Array<{
    id: string
    tags: string[] | null
    lists: { id: string; name: string; is_default: boolean } | null
  }>)
    .map((row) => ({
      list: row.lists,
      itemId: row.id,
      tags: Array.isArray(row.tags) ? row.tags : [],
    }))
    .filter(
      (
        row
      ): row is {
        list: { id: string; name: string; is_default: boolean }
        itemId: string
        tags: string[]
      } => Boolean(row.list)
    )
  const listIds = listEntries.map((entry) => entry.list.id)

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
  const showWiki = place.category === 'Sights'

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a className="text-sm underline text-slate-300" href="/">
              ← Back to map
            </a>
            <h1 className="mt-2 text-2xl font-semibold">{place.name}</h1>
            <p className="mt-1 text-sm text-slate-300">{place.address}</p>
          </div>

          <form action="/auth/sign-out" method="post">
            <button
              className="glass-button rounded-md px-3 py-2 text-xs"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>

        <section className="glass-panel rounded-lg p-4">
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-300">Type</p>
                <p className="text-[11px] text-slate-400">
                  The fixed category that sets this place&apos;s map icon.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-100">
                    {place.category}
                  </span>
                  {place.energy ? (
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                      Energy: {place.energy}
                    </span>
                  ) : null}
                  {normalized?.vibe ? (
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                      Vibe: {normalized.vibe}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

        {showWiki ? (
          <section className="glass-panel rounded-lg p-4">
            <h2 className="text-sm font-semibold text-slate-100">Wikipedia</h2>
            {summary || thumbnailUrl || wikiCurated?.primary_fact_pairs?.length ? (
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <div className="flex gap-4">
                  {thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrl}
                      alt={wikiCurated?.wikipedia_title ?? place.name}
                      className="h-20 w-20 shrink-0 rounded-md object-cover bg-slate-800"
                    />
                  ) : null}
                  <div className="space-y-2">
                    {wikiCurated?.wikipedia_title ? (
                      <p className="text-xs text-slate-400">
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
                        <dt className="text-slate-400">{p.label}:</dt>
                        <dd className="text-slate-100">{p.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                No curated Wikipedia data yet.
              </p>
            )}
          </section>
        ) : null}

        <section className="glass-panel rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-100">Notes</h2>
          <div className="mt-3">
            <PlaceUserMetaForm
              placeId={place.id}
              initialNotes={place.user_notes ?? null}
              tone="dark"
            />
          </div>
        </section>

        <section className="glass-panel rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-100">Lists</h2>
          <div className="mt-3">
            <PlaceListMembershipEditor
              placeId={place.id}
              initialSelectedIds={listIds}
              tone="dark"
            />
          </div>
          <div className="mt-4">
            <PlaceListTagsEditor entries={listEntries} tone="dark" />
          </div>
        </section>
      </div>
    </main>
  )
}
