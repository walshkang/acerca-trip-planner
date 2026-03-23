import dynamic from 'next/dynamic'

const MapInset = dynamic(() => import('./MapInset'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-lg bg-slate-200" />
  ),
})

export default MapInset
