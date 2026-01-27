import MapContainer from '@/components/map/MapContainer'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in?next=/')
  }

  return (
    <main className="w-full h-screen">
      <MapContainer />
    </main>
  )
}
