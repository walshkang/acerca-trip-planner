import dynamic from 'next/dynamic'

// AppShell reads ?mode= from window.location at init time (unavailable on server).
// Skipping SSR prevents the server→client mismatch when mode !== 'explore'.
const AppShell = dynamic(() => import('@/components/app/AppShell'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-slate-600">Loading…</p>
    </div>
  ),
})

export default function Home() {
  return <AppShell />
}
