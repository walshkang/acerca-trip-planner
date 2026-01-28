import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ListsPanel from '@/components/lists/ListsPanel'

export default async function ListsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in?next=/lists')
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <a className="text-sm underline text-gray-700" href="/">
            ← Back to map
          </a>
          <h1 className="mt-2 text-2xl font-semibold">Lists</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage your saved collections.
          </p>
        </div>

        <ListsPanel />
      </div>
    </main>
  )
}
