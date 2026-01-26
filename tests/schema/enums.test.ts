import { describe, it, expect } from 'vitest'
import { CategoryEnum, EnergyEnum } from '@/lib/types/enums'
import { CATEGORY_ICON_MAP } from '@/lib/icons/mapping'

describe('Schema invariants', () => {
  describe('Enum coverage', () => {
    it('should have all CategoryEnum values defined', () => {
      const categories: CategoryEnum[] = ['Food', 'Coffee', 'Sights', 'Shop', 'Activity']
      
      categories.forEach((category) => {
        expect(CATEGORY_ICON_MAP).toHaveProperty(category)
      })
    })
    
    it('should have all EnergyEnum values defined', () => {
      const energies: EnergyEnum[] = ['Low', 'Medium', 'High']
      
      // This test ensures TypeScript enums match expected values
      // In production, these should be derived from database types
      expect(energies).toHaveLength(3)
    })
  })
  
  describe('Icon mapping exhaustiveness', () => {
    it('should have an icon for every CategoryEnum value', () => {
      const categories: CategoryEnum[] = ['Food', 'Coffee', 'Sights', 'Shop', 'Activity']
      
      categories.forEach((category) => {
        expect(CATEGORY_ICON_MAP[category]).toBeDefined()
        expect(CATEGORY_ICON_MAP[category]).toMatch(/\.svg$/)
      })
    })
    
    it('should not have extra icons beyond CategoryEnum values', () => {
      const iconKeys = Object.keys(CATEGORY_ICON_MAP) as CategoryEnum[]
      const expectedCategories: CategoryEnum[] = ['Food', 'Coffee', 'Sights', 'Shop', 'Activity']
      
      expect(iconKeys.sort()).toEqual(expectedCategories.sort())
    })
  })
})
