import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ListDetailPanel from '@/components/lists/ListDetailPanel'

export default async function ListDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/sign-in?next=/lists/${params.id}`)
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <a className="text-sm underline text-gray-700" href="/lists">
            ← Back to lists
          </a>
          <h1 className="mt-2 text-2xl font-semibold">List detail</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review everything saved in this list.
          </p>
        </div>

        <ListDetailPanel listId={params.id} />
      </div>
    </main>
  )
}
