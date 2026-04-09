import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('PaperHeader spinner presence', () => {
  it('contains spinner markup and reads transitLoading from store', () => {
    const filePath = path.resolve(__dirname, '../../components/paper/PaperHeader.tsx')
    const src = fs.readFileSync(filePath, 'utf-8')
    expect(src.includes('progress_activity')).toBe(true)
    expect(src.includes('transitLoading')).toBe(true)
  })
})
