import type { CategoryEnum } from '@/lib/types/enums'

/** Deterministic CategoryEnum from Google Places `types` (matches enrichment fallback). */
export function inferCategoryFromGoogleTypes(types: unknown): CategoryEnum {
  const tset = new Set(Array.isArray(types) ? (types as string[]) : [])
  const has = (k: string) => tset.has(k)

  if (has('cafe') || has('coffee_shop')) return 'Coffee'
  if (
    has('restaurant') ||
    has('meal_takeaway') ||
    has('meal_delivery') ||
    has('bakery')
  )
    return 'Food'
  if (
    has('bar') ||
    has('night_club') ||
    has('wine_bar') ||
    has('cocktail_bar')
  )
    return 'Drinks'
  if (
    has('tourist_attraction') ||
    has('museum') ||
    has('park') ||
    has('art_gallery') ||
    has('church') ||
    has('place_of_worship') ||
    has('natural_feature')
  )
    return 'Sights'
  if (
    has('store') ||
    has('shopping_mall') ||
    has('clothing_store') ||
    has('department_store') ||
    has('book_store')
  )
    return 'Shop'
  return 'Activity'
}
