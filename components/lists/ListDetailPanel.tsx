'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type ListSummary = {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  start_date: string | null
  end_date: string | null
  timezone: string | null
}

type PlaceSummary = {
  id: string
  name: string
  category: string
  address: string | null
  created_at: string
  user_notes: string | null
  user_tags: string[] | null
}

type ListItemRow = {
  id: string
  created_at: string
  scheduled_date: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  scheduled_order: number | null
  completed_at: string | null
  tags: string[] | null
  place: PlaceSummary | null
}

type ApiResponse = {
  list: ListSummary
  items: ListItemRow[]
}

type Props = {
  listId: string
}

function formatDateRange(list: ListSummary) {
  if (!list.start_date && !list.end_date) return null
  const start = list.start_date ?? '—'
  const end = list.end_date ?? '—'
  return `${start} → ${end}`
}

export default function ListDetailPanel({ listId }: Props) {
  const [list, setList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rangeLabel = useMemo(
    () => (list ? formatDateRange(list) : null),
    [list]
  )

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}/items`)
      const json = (await res.json().catch(() => ({}))) as Partial<ApiResponse>
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`)
        return
      }
      if (json?.list) {
        setList(json.list)
      }
      setItems((json?.items ?? []) as ListItemRow[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [listId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  if (loading && !list) {
    return <p className="text-sm text-gray-500">Loading list…</p>
  }

  if (error && !list) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <section className="space-y-6">
      {list ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{list.name}</h2>
            {list.is_default ? (
              <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                Default
              </span>
            ) : null}
          </div>
          {list.description ? (
            <p className="mt-1 text-sm text-gray-600">{list.description}</p>
          ) : null}
          {rangeLabel ? (
            <p className="mt-2 text-xs text-gray-500">Dates: {rangeLabel}</p>
          ) : null}
          {list.timezone ? (
            <p className="mt-1 text-xs text-gray-500">
              Timezone: {list.timezone}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Places</h3>
        {loading ? <p className="text-xs text-gray-500">Loading…</p> : null}
        {!loading && !items.length ? (
          <p className="text-xs text-gray-500">No places in this list yet.</p>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => {
            const place = item.place
            if (!place) return null
            return (
              <div
                key={item.id}
                className="rounded-md border border-gray-100 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {place.name}
                  </span>
                  <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                    {place.category}
                  </span>
                  {item.completed_at ? (
                    <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                      Done
                    </span>
                  ) : null}
                </div>
                {place.address ? (
                  <p className="mt-1 text-xs text-gray-500">{place.address}</p>
                ) : null}
                {item.tags && item.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </section>
  )
}
