import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CandidatesClient, {
  type CandidateRow,
} from '@/components/ingest/CandidatesClient'
import { promotePlaceCandidate } from '@/lib/staging/promotion'
import { revalidatePath } from 'next/cache'
import { redirect as nextRedirect } from 'next/navigation'

export default async function CandidatesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in?next=/candidates')
  }

  const { data, error } = await supabase
    .from('place_candidates')
    .select('id, name, address, status, enrichment_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  async function promoteAction(formData: FormData) {
    'use server'
    const candidateId = String(formData.get('candidate_id') ?? '')
    if (!candidateId) throw new Error('candidate_id is required')
    const placeId = await promotePlaceCandidate(candidateId)
    revalidatePath('/candidates')
    nextRedirect(`/places/${placeId}`)
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a className="text-sm underline text-gray-700" href="/">
              ← Back to map
            </a>
            <h1 className="mt-2 text-2xl font-semibold">Candidates</h1>
            <p className="mt-1 text-sm text-gray-600">
              Run enrichment, then promote to the canonical `places` table.
            </p>
          </div>
          <a className="text-sm underline text-gray-700" href="/ingest">
            + Ingest
          </a>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <CandidatesClient
            candidates={(data ?? []) as unknown as CandidateRow[]}
            promoteAction={promoteAction}
          />
        </section>
      </div>
    </main>
  )
}

