'use client'

import { useCallback, useEffect, useState } from 'react'
import ListDetailBody, {
  ListItemRow,
  ListSummary,
} from '@/components/lists/ListDetailBody'

type ApiResponse = {
  list: ListSummary
  items: ListItemRow[]
}

type Props = {
  listId: string
}

export default function ListDetailPanel({ listId }: Props) {
  const [list, setList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <ListDetailBody
      list={list}
      items={items}
      loading={loading}
      error={error}
    />
  )
}
