import { createClient } from '@supabase/supabase-js'

// Server-only admin Supabase client (service role).
// Convention: Only `lib/server/**` may import this. Client/shared `lib/**` must not.
// NEVER use this in endpoints that accept user_id from input.
// Only for admin operations that don't depend on user context.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
