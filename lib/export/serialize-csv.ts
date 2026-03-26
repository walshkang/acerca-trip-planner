import { PLANNER_SLOT_LABEL } from '@/lib/lists/planner'
import type { ExportRow } from './contract'

const CSV_HEADERS = [
  'Name',
  'Category',
  'Energy',
  'Neighborhood',
  'Address',
  'Place Tags',
  'Item Tags',
  'Day',
  'Slot',
  'Status',
  'Google Maps',
  'Website',
  'Notes',
  'Lat',
  'Lng',
  'Place ID',
  'Google Place ID',
]

/**
 * Escape a CSV field value per RFC 4180.
 * Fields containing commas, double-quotes, or newlines are quoted.
 * Double-quotes inside values are escaped by doubling them.
 */
function csvField(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Serialize export rows as RFC 4180 CSV.
 *
 * Headers: Name,Category,Energy,Neighborhood,Address,Place Tags,Item Tags,
 *          Day,Slot,Status,Google Maps,Website,Notes,Lat,Lng,Place ID,Google Place ID
 *
 * Tags are semicolon-separated within their cell.
 */
export function serializeCsv(rows: ExportRow[]): string {
  const outputLines: string[] = [CSV_HEADERS.map(csvField).join(',')]

  for (const row of rows) {
    const slotLabel = row.scheduled_slot ? PLANNER_SLOT_LABEL[row.scheduled_slot] : ''
    const fields = [
      row.place_name,
      row.place_category,
      row.place_energy ?? '',
      row.place_neighborhood ?? '',
      row.place_address ?? '',
      row.place_user_tags.join(';'),
      row.item_tags.join(';'),
      row.scheduled_date ?? '',
      slotLabel,
      row.status,
      row.google_maps_url ?? '',
      row.website ?? '',
      row.place_user_notes ?? '',
      row.place_lat != null ? row.place_lat : '',
      row.place_lng != null ? row.place_lng : '',
      row.place_id ?? '',
      row.google_place_id ?? '',
    ]
    outputLines.push(fields.map(csvField).join(','))
  }

  return outputLines.join('\r\n') + '\r\n'
}
