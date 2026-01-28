'use client'

import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'

export default function Omnibox() {
  const query = useDiscoveryStore((s) => s.query)
  const setQuery = useDiscoveryStore((s) => s.setQuery)
  const submit = useDiscoveryStore((s) => s.submit)
  const clear = useDiscoveryStore((s) => s.clear)
  const isSubmitting = useDiscoveryStore((s) => s.isSubmitting)
  const error = useDiscoveryStore((s) => s.error)
  const results = useDiscoveryStore((s) => s.results)
  const selectedResultId = useDiscoveryStore((s) => s.selectedResultId)
  const setResults = useDiscoveryStore((s) => s.setResults)
  const setSelectedResultId = useDiscoveryStore((s) => s.setSelectedResultId)
  const previewResult = useDiscoveryStore((s) => s.previewResult)

  return (
    <div className="pointer-events-auto">
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-2 shadow-sm">
        <input
          className="w-[min(520px,70vw)] bg-transparent text-sm outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setResults([])
            setSelectedResultId(null)
          }}
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
      {results.length ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white/95 shadow-sm">
          {results.map((result) => {
            const isSelected = selectedResultId === result.place_id
            return (
              <button
                key={result.place_id}
                type="button"
                onClick={() => previewResult(result)}
                className={`flex w-full flex-col gap-1 px-4 py-2 text-left text-xs text-gray-800 hover:bg-gray-100 ${
                  isSelected ? 'bg-gray-100' : ''
                }`}
              >
                <span className="font-medium">
                  {result.name ?? 'Untitled place'}
                </span>
                {result.address ? (
                  <span className="text-[11px] text-gray-500">
                    {result.address}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
      {error ? (
        <div className="mt-2 rounded-md border border-red-200 bg-white/95 px-3 py-2 text-xs text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}
    </div>
  )
}
