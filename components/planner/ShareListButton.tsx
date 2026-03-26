'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { getSupabase } from '@/lib/supabase/client'

type ShareRow = {
  id: string
  token: string
  permission: string
  created_at: string
  expires_at: string | null
  url: string
}

function formatShareDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function ShareListButton({ listId }: { listId: string }) {
  const dialogId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [shares, setShares] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [collaboratorCount, setCollaboratorCount] = useState<number | null>(
    null
  )

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data: list, error } = await supabase
        .from('lists')
        .select('user_id')
        .eq('id', listId)
        .single()
      if (cancelled) return
      if (error || !list) {
        setIsOwner(false)
        return
      }
      setIsOwner(Boolean(user?.id && user.id === list.user_id))
    })()
    return () => {
      cancelled = true
    }
  }, [listId])

  const fetchShares = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/lists/${listId}/share`)
      const data = (await res.json()) as {
        shares?: ShareRow[]
        error?: string
      }
      if (!res.ok) {
        setLoadError(data.error ?? 'Could not load shares')
        setShares([])
        return
      }
      setShares(data.shares ?? [])
    } catch {
      setLoadError('Could not load shares')
      setShares([])
    } finally {
      setLoading(false)
    }
  }, [listId])

  const fetchCollaboratorCount = useCallback(async () => {
    const supabase = getSupabase()
    const { count, error } = await supabase
      .from('list_collaborators')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId)
    if (!error && typeof count === 'number') setCollaboratorCount(count)
  }, [listId])

  useEffect(() => {
    if (!open || !isOwner) return
    void fetchShares()
    void fetchCollaboratorCount()
  }, [open, isOwner, fetchShares, fetchCollaboratorCount])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current
      if (root && !root.contains(e.target as Node)) close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const copyAbsoluteUrl = useCallback((relativeUrl: string) => {
    const absolute = new URL(relativeUrl, window.location.origin).href
    void navigator.clipboard.writeText(absolute).then(() => {
      setCopyFeedback('Copied!')
      window.setTimeout(() => setCopyFeedback(null), 2000)
    })
  }, [])

  const handleCopyLink = useCallback(async () => {
    setLoadError(null)
    try {
      if (shares.length > 0) {
        const first = shares[0]
        if (first?.url) copyAbsoluteUrl(first.url)
        return
      }
      const res = await fetch(`/api/lists/${listId}/share`, {
        method: 'POST',
      })
      const data = (await res.json()) as ShareRow & {
        error?: string
        url?: string
      }
      if (!res.ok || !data.url) {
        setLoadError(data.error ?? 'Could not create share link')
        return
      }
      copyAbsoluteUrl(data.url)
      await fetchShares()
    } catch {
      setLoadError('Could not copy link')
    }
  }, [listId, shares, copyAbsoluteUrl, fetchShares])

  const handleRevoke = useCallback(
    async (shareId: string) => {
      setRevokingId(shareId)
      setLoadError(null)
      try {
        const res = await fetch(`/api/lists/${listId}/share/${shareId}`, {
          method: 'DELETE',
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setLoadError(data.error ?? 'Could not revoke')
          return
        }
        await fetchShares()
        await fetchCollaboratorCount()
      } catch {
        setLoadError('Could not revoke')
      } finally {
        setRevokingId(null)
      }
    },
    [listId, fetchShares, fetchCollaboratorCount]
  )

  if (isOwner === false) return null
  if (isOwner === null) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container-low px-3 py-1.5 text-xs font-medium text-paper-on-surface transition hover:bg-paper-tertiary-fixed"
        aria-label="Share trip"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base leading-none">
            share
          </span>
          Share
        </span>
      </button>
      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-label="Share this trip"
          className="absolute right-0 top-full z-[60] mt-1 w-[min(100vw-2rem,20rem)] rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface p-3 shadow-lg"
        >
          <p className="font-headline text-xs font-bold text-paper-primary">
            Share this trip
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="flex items-center justify-center gap-2 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container-low px-3 py-2 text-xs font-medium text-paper-on-surface transition hover:bg-paper-tertiary-fixed"
            >
              <span className="material-symbols-outlined text-base">link</span>
              {copyFeedback ?? 'Copy share link'}
            </button>
            {loadError ? (
              <p className="text-[11px] text-red-600 dark:text-red-300" role="alert">
                {loadError}
              </p>
            ) : null}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-paper-secondary">
                Active shares
              </p>
              {loading ? (
                <p className="mt-1 text-xs text-paper-on-surface-variant">
                  Loading…
                </p>
              ) : shares.length === 0 ? (
                <p className="mt-1 text-xs text-paper-on-surface-variant">
                  No links yet — copy to create one.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {shares.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 text-xs text-paper-on-surface"
                    >
                      <span className="min-w-0 truncate">
                        Created {formatShareDate(s.created_at)}
                      </span>
                      <button
                        type="button"
                        disabled={revokingId === s.id}
                        onClick={() => void handleRevoke(s.id)}
                        className="shrink-0 rounded-[4px] border border-paper-tertiary-fixed px-2 py-0.5 text-[11px] font-medium text-paper-secondary transition hover:bg-paper-tertiary-fixed disabled:opacity-50"
                      >
                        {revokingId === s.id ? '…' : 'Revoke'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {collaboratorCount != null ? (
              <p className="text-[11px] text-paper-on-surface-variant">
                Shared with {collaboratorCount}{' '}
                {collaboratorCount === 1 ? 'person' : 'people'}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
