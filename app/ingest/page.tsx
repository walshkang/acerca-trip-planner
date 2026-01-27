import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IngestForm from '@/components/ingest/IngestForm'

export default async function IngestPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in?next=/ingest')
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a className="text-sm underline text-gray-700" href="/">
              ← Back to map
            </a>
            <h1 className="mt-2 text-2xl font-semibold">Ingest place</h1>
            <p className="mt-1 text-sm text-gray-600">
              Paste a Google Maps URL, a Google Place ID, or a plain-text name.
            </p>
          </div>
          <a className="text-sm underline text-gray-700" href="/candidates">
            View candidates →
          </a>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <IngestForm />
        </section>
      </div>
    </main>
  )
}

