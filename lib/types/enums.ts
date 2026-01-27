import type { Database } from '@/lib/supabase/types'

export type CategoryEnum = Database['public']['Enums']['category_enum']
export type EnergyEnum = Database['public']['Enums']['energy_enum']

export const CATEGORY_ENUM_VALUES = [
  'Food',
  'Coffee',
  'Sights',
  'Shop',
  'Activity',
] as const satisfies readonly CategoryEnum[]

export const ENERGY_ENUM_VALUES = ['Low', 'Medium', 'High'] as const satisfies readonly EnergyEnum[]

type CategoryValues = (typeof CATEGORY_ENUM_VALUES)[number]
type EnergyValues = (typeof ENERGY_ENUM_VALUES)[number]

// Compile-time exhaustiveness: if the DB enum gains a new value and types are regenerated,
// these will fail to type-check until the runtime lists are updated.
type MissingCategoryValues = Exclude<CategoryEnum, CategoryValues>
type MissingEnergyValues = Exclude<EnergyEnum, EnergyValues>

type AssertNever<T extends never> = T
export type __CategoryEnumExhaustive = AssertNever<MissingCategoryValues>
export type __EnergyEnumExhaustive = AssertNever<MissingEnergyValues>
