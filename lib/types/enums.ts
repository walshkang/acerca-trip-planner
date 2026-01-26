// TypeScript enums derived from database types
// These should be generated from Supabase types, not hand-maintained
// For now, placeholder types until Supabase types are generated

export type CategoryEnum = 'Food' | 'Coffee' | 'Sights' | 'Shop' | 'Activity'
export type EnergyEnum = 'Low' | 'Medium' | 'High'

// TODO: Once Supabase types are generated, derive from Database['public']['Enums']
// Example:
// import { Database } from '@/lib/supabase/types'
// export type CategoryEnum = Database['public']['Enums']['category_enum']
// export type EnergyEnum = Database['public']['Enums']['energy_enum']
