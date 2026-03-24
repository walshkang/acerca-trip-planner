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
    <section className="paper-panel space-y-4 p-4">
      <div>
        <h2 className="font-headline text-sm font-extrabold uppercase tracking-tighter text-paper-on-surface">
          Lists
        </h2>
        <p className="mt-1 font-body text-xs text-paper-on-surface-variant">
          Organize approved places into lightweight collections.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-3 py-2 font-body text-sm text-paper-on-surface placeholder:text-paper-on-surface-variant outline-none"
          placeholder="New list name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="button"
          onClick={createList}
          disabled={creating || !newName.trim()}
          className="paper-button-primary shrink-0 text-xs disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-paper-on-surface-variant">Loading lists…</p>
      ) : null}

      {lists.length ? (
        <div className="space-y-2">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between gap-3 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container-low px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    className="font-headline text-sm font-extrabold uppercase tracking-tight text-paper-primary underline-offset-2 hover:underline"
                    href={`/lists/${list.id}`}
                  >
                    {list.name}
                  </a>
                  {list.is_default ? (
                    <span className="inline-flex items-center rounded-[2px] border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-paper-on-surface-variant">
                      Default
                    </span>
                  ) : null}
                </div>
                {list.description ? (
                  <p className="mt-1 text-xs text-paper-on-surface-variant">
                    {list.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => deleteList(list.id)}
                disabled={list.is_default || deletingId === list.id}
                className="shrink-0 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-1 text-xs font-bold text-paper-on-surface hover:bg-paper-tertiary-fixed disabled:opacity-50"
              >
                {deletingId === list.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <p className="text-xs text-paper-on-surface-variant">No lists yet.</p>
      ) : null}

      {error ? <p className="text-xs text-paper-error">{error}</p> : null}
    </section>
  )
}
