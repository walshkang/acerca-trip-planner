'use client'

import { useCallback, useEffect, useState } from 'react'

type ListSummary = {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
}

export default function ListsPanel() {
  const [lists, setLists] = useState<ListSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchLists = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/lists')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`)
        return
      }
      setLists((json?.lists ?? []) as ListSummary[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  async function createList() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`)
        return
      }
      const list = json?.list as ListSummary | undefined
      if (list) {
        setLists((prev) => [...prev, list])
        setNewName('')
      } else {
        await fetchLists()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setCreating(false)
    }
  }

  async function deleteList(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`)
        return
      }
      setLists((prev) => prev.filter((l) => l.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Lists</h2>
        <p className="mt-1 text-xs text-gray-500">
          Organize approved places into lightweight collections.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-full flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="New list name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="button"
          onClick={createList}
          disabled={creating || !newName.trim()}
          className="rounded-md bg-black px-3 py-2 text-xs text-white disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </div>

      {loading ? <p className="text-xs text-gray-500">Loading lists…</p> : null}

      {lists.length ? (
        <div className="space-y-2">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between gap-3 rounded-md border border-gray-100 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {list.name}
                  </span>
                  {list.is_default ? (
                    <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                      Default
                    </span>
                  ) : null}
                </div>
                {list.description ? (
                  <p className="text-xs text-gray-500">{list.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => deleteList(list.id)}
                disabled={list.is_default || deletingId === list.id}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
              >
                {deletingId === list.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <p className="text-xs text-gray-500">No lists yet.</p>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </section>
  )
}
