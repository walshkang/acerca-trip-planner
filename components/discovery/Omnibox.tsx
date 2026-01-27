'use client'

import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'

export default function Omnibox() {
  const query = useDiscoveryStore((s) => s.query)
  const setQuery = useDiscoveryStore((s) => s.setQuery)
  const submit = useDiscoveryStore((s) => s.submit)
  const clear = useDiscoveryStore((s) => s.clear)
  const isSubmitting = useDiscoveryStore((s) => s.isSubmitting)
  const error = useDiscoveryStore((s) => s.error)

  return (
    <div className="pointer-events-auto">
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-2 shadow-sm">
        <input
          className="w-[min(520px,70vw)] bg-transparent text-sm outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Paste Google Maps link or search…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              clear()
            }
          }}
        />
        {query ? (
          <button
            type="button"
            onClick={clear}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700"
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="rounded-full bg-black px-4 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Searching…' : 'Search'}
        </button>
      </div>
      {error ? (
        <div className="mt-2 rounded-md border border-red-200 bg-white/95 px-3 py-2 text-xs text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}
    </div>
  )
}

