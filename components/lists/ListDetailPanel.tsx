'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ListDetailBody, {
  ListItemRow,
  ListSummary,
} from '@/components/lists/ListDetailBody'
import { distinctTagsFromItems } from '@/lib/lists/tags'

type ApiResponse = {
  list: ListSummary
  items: ListItemRow[]
  distinct_tags?: string[]
}

type Props = {
  listId: string
}

export default function ListDetailPanel({ listId }: Props) {
  const [list, setList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [distinctTags, setDistinctTags] = useState<string[]>([])
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reconcileTagFilters = useCallback((nextItems: ListItemRow[]) => {
    const nextDistinct = distinctTagsFromItems(nextItems)
    setDistinctTags(nextDistinct)
    setActiveTagFilters((prev) =>
      prev.filter((tag) => nextDistinct.includes(tag))
    )
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}/items?limit=200`)
      const json = (await res.json().catch(() => ({}))) as Partial<ApiResponse>
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`)
        return
      }
      if (json?.list) {
        setList(json.list)
      }
      const nextItems = (json?.items ?? []) as ListItemRow[]
      setItems(nextItems)
      if (Array.isArray(json?.distinct_tags)) {
        setDistinctTags(json.distinct_tags)
        setActiveTagFilters((prev) =>
          prev.filter((tag) => json.distinct_tags?.includes(tag))
        )
      } else {
        reconcileTagFilters(nextItems)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [listId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    setActiveTagFilters([])
    setDistinctTags([])
  }, [listId])

  const filteredItems = useMemo(() => {
    if (!activeTagFilters.length) return items
    return items.filter((item) => {
      const tags = item.tags ?? []
      return activeTagFilters.some((tag) => tags.includes(tag))
    })
  }, [activeTagFilters, items])

  const handleTagToggle = useCallback((tag: string) => {
    setActiveTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  const handleClearFilters = useCallback(() => {
    setActiveTagFilters([])
  }, [])

  const handleTagsUpdate = useCallback(
    async (itemId: string, tagsInput: string) => {
      const res = await fetch(`/api/lists/${listId}/items/${itemId}/tags`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tags: tagsInput }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        item?: { tags?: string[] }
        error?: string
      }
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const updatedTags = Array.isArray(json?.item?.tags)
        ? json.item.tags
        : []
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === itemId ? { ...item, tags: updatedTags } : item
        )
        reconcileTagFilters(next)
        return next
      })
      return updatedTags
    },
    [listId, reconcileTagFilters]
  )

  return (
    <ListDetailBody
      list={list}
      items={filteredItems}
      loading={loading}
      error={error}
      emptyLabel={
        activeTagFilters.length
          ? 'No places match these tags.'
          : 'No places in this list yet.'
      }
      availableTags={distinctTags}
      activeTagFilters={activeTagFilters}
      onTagFilterToggle={handleTagToggle}
      onClearTagFilters={handleClearFilters}
      onTagsUpdate={handleTagsUpdate}
    />
  )
}
