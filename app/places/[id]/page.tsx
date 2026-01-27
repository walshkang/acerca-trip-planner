import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlaceUserMetaForm from '@/components/places/PlaceUserMetaForm'
import { getEnrichmentById } from '@/lib/server/places/getPlaceEnrichment'

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

  const enrichment = place.enrichment_id
    ? await getEnrichmentById(place.enrichment_id)
    : null

  const normalized = enrichment?.normalized_data ?? null

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
      </div>
    </main>
  )
}

