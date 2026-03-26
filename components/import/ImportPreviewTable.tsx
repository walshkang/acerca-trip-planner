'use client'

import { AlertTriangle, Check, X } from 'lucide-react'
import type {
  ComputedFields,
  PreviewRow,
  TripSummary,
} from '@/lib/import/contract'
import type { EnergyEnum } from '@/lib/types/enums'
import { PLANNER_SLOT_LABEL } from '@/lib/lists/planner'
import ImportAmbiguousPicker from '@/components/import/ImportAmbiguousPicker'

function maxConsecutiveHigh(seq: EnergyEnum[]): number {
  let run = 0
  let maxRun = 0
  for (const e of seq) {
    if (e === 'High') {
      run += 1
      maxRun = Math.max(maxRun, run)
    } else {
      run = 0
    }
  }
  return maxRun
}

export function computedWarnings(computed: ComputedFields | null): string[] {
  if (!computed) return []
  const w: string[] = []
  if (computed.open_during_slot === false) {
    w.push('May be closed during this slot')
  }
  if (
    computed.travel_time_minutes != null &&
    computed.travel_time_minutes > 20
  ) {
    const n = Math.round(computed.travel_time_minutes)
    w.push(`~${n} min walk from previous stop`)
  }
  if (computed.slot_conflict) {
    w.push('Conflicts with another item in this slot')
  }
  const highRun = maxConsecutiveHigh(computed.energy_sequence)
  if (highRun >= 3) {
    w.push('3+ high-energy stops in a row')
  }
  return w
}

function StatusIcon({ status }: { status: PreviewRow['status'] }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex text-emerald-600" title="Resolved">
        <Check className="h-4 w-4" aria-hidden />
      </span>
    )
  }
  if (status === 'ambiguous') {
    return (
      <span className="inline-flex text-amber-600" title="Pick a match">
        <AlertTriangle className="h-4 w-4" aria-hidden />
      </span>
    )
  }
  return (
    <span className="inline-flex text-red-600" title="Error">
      <X className="h-4 w-4" aria-hidden />
    </span>
  )
}

type Props = {
  rows: PreviewRow[]
  tripSummary: TripSummary
  selectedIndices: Set<number>
  onToggleSelected: (rowIndex: number, next: boolean) => void
  ambiguousPicks: Record<number, string>
  onAmbiguousPick: (rowIndex: number, googlePlaceId: string) => void
}

export default function ImportPreviewTable({
  rows,
  tripSummary,
  selectedIndices,
  onToggleSelected,
  ambiguousPicks,
  onAmbiguousPick,
}: Props) {
  return (
    <div className="space-y-4">
      <section
        className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 text-xs text-gray-800"
        aria-label="Trip summary"
      >
        <p className="font-semibold text-gray-900">Trip summary</p>
        <p className="mt-1">
          <span className="text-gray-600">Total days:</span>{' '}
          {tripSummary.total_days}
        </p>
        {tripSummary.empty_slots.length > 0 ? (
          <p className="mt-1">
            <span className="text-gray-600">Empty slots:</span>{' '}
            {tripSummary.empty_slots
              .map(
                (s) =>
                  `${s.date} (${PLANNER_SLOT_LABEL[s.slot]})`
              )
              .join(', ')}
          </p>
        ) : null}
        {tripSummary.warnings.length > 0 ? (
          <ul className="mt-2 list-disc pl-4 text-amber-800">
            {tripSummary.warnings.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="-mx-1 overflow-x-auto md:mx-0">
        <table className="min-w-[720px] w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-600">
              <th className="px-2 py-2 font-medium"> </th>
              <th className="px-2 py-2 font-medium">Place</th>
              <th className="px-2 py-2 font-medium">Category</th>
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Slot</th>
              <th className="px-2 py-2 font-medium">Area</th>
              <th className="px-2 py-2 font-medium">Rating</th>
              <th className="px-2 py-2 font-medium">Warnings</th>
              <th className="px-2 py-2 font-medium">Import</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const warnings = computedWarnings(row.computed)
              const isError = row.status === 'error'
              const isAmbiguous = row.status === 'ambiguous'
              const pick = ambiguousPicks[row.row_index] ?? null
              const canSelect =
                !isError &&
                (row.status === 'ok' ||
                  (isAmbiguous && Boolean(pick)))
              const checked = selectedIndices.has(row.row_index)
              const namePrimary = row.input.place_name
              const nameResolved = row.resolved?.place_name

              return (
                <tr
                  key={row.row_index}
                  className={`border-b border-gray-100 ${
                    isError
                      ? 'bg-red-50/40'
                      : isAmbiguous
                        ? 'bg-amber-50/30'
                        : ''
                  }`}
                >
                  <td className="px-2 py-2 align-top">
                    <StatusIcon status={row.status} />
                  </td>
                  <td className="px-2 py-2 align-top text-gray-900">
                    <div className="max-w-[200px] font-medium break-words">
                      {namePrimary}
                    </div>
                    {nameResolved && nameResolved !== namePrimary ? (
                      <div className="mt-0.5 text-gray-500">
                        → {nameResolved}
                      </div>
                    ) : null}
                    {isError && row.error_message ? (
                      <p className="mt-1 text-red-700">{row.error_message}</p>
                    ) : null}
                    {isAmbiguous && row.candidates ? (
                      <div className="mt-2">
                        <ImportAmbiguousPicker
                          candidates={row.candidates}
                          value={pick}
                          onPick={(id) => onAmbiguousPick(row.row_index, id)}
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top text-gray-700">
                    {row.resolved?.category ?? row.input.place_category ?? '—'}
                  </td>
                  <td className="px-2 py-2 align-top text-gray-700">
                    {row.input.scheduled_date ?? '—'}
                  </td>
                  <td className="px-2 py-2 align-top text-gray-700">
                    {row.input.scheduled_slot
                      ? PLANNER_SLOT_LABEL[row.input.scheduled_slot]
                      : '—'}
                  </td>
                  <td className="px-2 py-2 align-top text-gray-700">
                    {row.resolved?.neighborhood ?? '—'}
                  </td>
                  <td className="px-2 py-2 align-top text-gray-700">
                    {row.resolved?.google_rating != null
                      ? row.resolved.google_rating.toFixed(1)
                      : '—'}
                  </td>
                  <td className="px-2 py-2 align-top text-gray-600">
                    {warnings.length ? (
                      <ul className="max-w-[180px] list-disc pl-3">
                        {warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={checked}
                      disabled={!canSelect}
                      onChange={(e) =>
                        onToggleSelected(row.row_index, e.target.checked)
                      }
                      aria-label={`Import row ${row.row_index + 1}`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
