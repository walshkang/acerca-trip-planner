import { describe, it, expect } from 'vitest'
import { CategoryEnum } from '@/lib/types/enums'
import { CATEGORY_ICON_MAP } from '@/lib/icons/mapping'

describe('Icon mapping', () => {
  it('should have an icon for every CategoryEnum value', () => {
    const categories: CategoryEnum[] = ['Food', 'Coffee', 'Sights', 'Shop', 'Activity']
    
    categories.forEach((category) => {
      expect(CATEGORY_ICON_MAP).toHaveProperty(category)
      expect(CATEGORY_ICON_MAP[category]).toBeTruthy()
    })
  })
  
  it('should map all enum values to valid SVG paths', () => {
    Object.values(CATEGORY_ICON_MAP).forEach((iconPath) => {
      expect(iconPath).toMatch(/^\/icons\/.*\.svg$/)
    })
  })
})
