'use client'

import type { ResolvedCandidate } from '@/lib/import/contract'

type Props = {
  candidates: ResolvedCandidate[]
  value: string | null
  onPick: (google_place_id: string) => void
  disabled?: boolean
}

export default function ImportAmbiguousPicker({
  candidates,
  value,
  onPick,
  disabled = false,
}: Props) {
  return (
    <div className="min-w-[200px] max-w-full">
      <label className="sr-only" htmlFor="import-ambiguous-pick">
        Choose matching place
      </label>
      <select
        id="import-ambiguous-pick"
        className="w-full rounded-md border border-amber-200/80 bg-white px-2 py-1.5 text-xs text-gray-900 shadow-sm disabled:opacity-50"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value
          if (v) onPick(v)
        }}
      >
        <option value="">Select a place…</option>
        {candidates.map((c) => (
          <option key={c.google_place_id} value={c.google_place_id}>
            {c.place_name}
            {c.address ? ` — ${c.address}` : ''}
            {c.google_rating != null ? ` ★${c.google_rating.toFixed(1)}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
