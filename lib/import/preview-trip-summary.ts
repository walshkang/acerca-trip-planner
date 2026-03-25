import type { PreviewRow, TripSummary } from '@/lib/import/contract'
import { computeTripSummary, enumerateTripDates } from '@/lib/import/compute'

export { enumerateTripDates }

export function computeImportPreviewTripSummary(
  rows: PreviewRow[],
  tripStartDate: string | undefined,
  tripEndDate: string | undefined
): TripSummary {
  return computeTripSummary(rows, tripStartDate, tripEndDate)
}
