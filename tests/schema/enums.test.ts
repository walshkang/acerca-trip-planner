import { describe, it, expect } from 'vitest'
import { CATEGORY_ENUM_VALUES, ENERGY_ENUM_VALUES } from '@/lib/types/enums'
import { CATEGORY_ICON_MAP } from '@/lib/icons/mapping'

describe('Schema invariants', () => {
  describe('Enum coverage', () => {
    it('should have all CategoryEnum values defined', () => {
      CATEGORY_ENUM_VALUES.forEach((category) => {
        expect(CATEGORY_ICON_MAP).toHaveProperty(category)
      })
    })
    
    it('should have all EnergyEnum values defined', () => {
      expect(ENERGY_ENUM_VALUES).toHaveLength(3)
    })
  })
  
  describe('Icon mapping exhaustiveness', () => {
    it('should have an icon for every CategoryEnum value', () => {
      CATEGORY_ENUM_VALUES.forEach((category) => {
        expect(CATEGORY_ICON_MAP[category]).toBeDefined()
        expect(CATEGORY_ICON_MAP[category]).toMatch(/\.svg$/)
      })
    })
    
    it('should not have extra icons beyond CategoryEnum values', () => {
      const iconKeys = Object.keys(CATEGORY_ICON_MAP).sort()
      const expected = [...CATEGORY_ENUM_VALUES].sort()
      expect(iconKeys).toEqual(expected)
    })
  })
})
