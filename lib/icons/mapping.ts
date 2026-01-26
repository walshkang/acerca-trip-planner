import { CategoryEnum } from '@/lib/types/enums'

export const CATEGORY_ICON_MAP: Record<CategoryEnum, string> = {
  Food: '/icons/food.svg',
  Coffee: '/icons/coffee.svg',
  Sights: '/icons/sights.svg',
  Shop: '/icons/shop.svg',
  Activity: '/icons/activity.svg',
}

// Build-time validation: ensure exhaustiveness
// This will cause a TypeScript error if any CategoryEnum value is missing
const _exhaustivenessCheck: Record<CategoryEnum, true> = Object.keys(CATEGORY_ICON_MAP).reduce(
  (acc, key) => ({ ...acc, [key as CategoryEnum]: true }),
  {} as Record<CategoryEnum, true>
)

// Suppress unused variable warning
void _exhaustivenessCheck

/**
 * Get icon path for a category
 */
export function getCategoryIcon(category: CategoryEnum): string {
  return CATEGORY_ICON_MAP[category]
}
