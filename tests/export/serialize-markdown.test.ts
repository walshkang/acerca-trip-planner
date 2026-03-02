import { describe, expect, it } from 'vitest'
import { serializeMarkdown } from '@/lib/export/serialize-markdown'
import type { ExportRow } from '@/lib/export/contract'

function makeRow(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    place_name: 'Lilia',
    place_category: 'Food',
    place_energy: null,
    place_address: '567 Union Ave, Williamsburg, Brooklyn, NY 11211',
    place_neighborhood: 'Williamsburg',
    place_user_notes: null,
    place_user_tags: [],
    place_lat: 40.714,
    place_lng: -73.951,
    google_maps_url: 'https://maps.example.com/lilia',
    website: null,
    item_tags: [],
    scheduled_date: null,
    scheduled_slot: null,
    status: 'backlog',
    ...overrides,
  }
}

const LIST = { name: 'Brooklyn Trip', start_date: null, end_date: null }

describe('serializeMarkdown', () => {
  it('includes a top-level heading with list name', () => {
    const md = serializeMarkdown([makeRow()], LIST)
    expect(md).toContain('# Brooklyn Trip')
  })

  it('includes By Neighborhood and By Category sections', () => {
    const md = serializeMarkdown([makeRow()], LIST)
    expect(md).toContain('## By Neighborhood')
    expect(md).toContain('## By Category')
  })

  it('groups places under neighborhood headings', () => {
    const md = serializeMarkdown(
      [
        makeRow({ place_name: 'Lilia', place_neighborhood: 'Williamsburg' }),
        makeRow({
          place_name: 'Karczma',
          place_neighborhood: 'Greenpoint',
          place_category: 'Food',
        }),
      ],
      LIST
    )
    expect(md).toContain('### 📍 Williamsburg')
    expect(md).toContain('### 📍 Greenpoint')
  })

  it('uses "Unknown Neighborhood" for null neighborhood', () => {
    const md = serializeMarkdown([makeRow({ place_neighborhood: null })], LIST)
    expect(md).toContain('### 📍 Unknown Neighborhood')
  })

  it('renders place links as markdown', () => {
    const md = serializeMarkdown([makeRow()], LIST)
    expect(md).toContain('[Google Maps](https://maps.example.com/lilia)')
  })

  it('renders website link when present', () => {
    const md = serializeMarkdown(
      [makeRow({ website: 'https://www.lilia.com' })],
      LIST
    )
    expect(md).toContain('[Website](https://www.lilia.com)')
  })

  it('renders user notes as a blockquote', () => {
    const md = serializeMarkdown(
      [makeRow({ place_user_notes: 'Great pasta, go early' })],
      LIST
    )
    expect(md).toContain('> Great pasta, go early')
  })

  it('groups places under category headings in section 2', () => {
    const md = serializeMarkdown(
      [
        makeRow({ place_category: 'Food' }),
        makeRow({ place_name: 'Devoción', place_category: 'Coffee', google_maps_url: null }),
      ],
      LIST
    )
    expect(md).toContain('### 🍽️ Food')
    expect(md).toContain('### ☕ Coffee')
  })

  it('renders scheduled date and slot for scheduled items', () => {
    const md = serializeMarkdown(
      [
        makeRow({
          scheduled_date: '2026-03-10',
          scheduled_slot: 'morning',
          status: 'scheduled',
        }),
      ],
      LIST
    )
    expect(md).toContain('2026-03-10')
    expect(md).toContain('Morning')
  })

  it('renders place tags as inline code badges', () => {
    const md = serializeMarkdown(
      [makeRow({ place_user_tags: ['pasta', 'romantic'] })],
      LIST
    )
    expect(md).toContain('`pasta`')
  })
})
