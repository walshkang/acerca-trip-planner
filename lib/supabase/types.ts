// This repo is intended to use Supabase-generated types:
// `supabase gen types typescript --db-url "$SUPABASE_DB_URL" > lib/supabase/types.ts`
//
// In environments where generation isn't available (e.g., no DB connection),
// we keep a minimal, hand-maintained schema that matches `supabase/migrations/`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      enrichments: {
        Row: {
          id: string
          source_hash: string
          schema_version: number
          normalized_data: Json
          raw_sources: Json
          curated_data: Json | null
          model: string
          temperature: number
          prompt_version: string
          created_at: string
        }
        Insert: {
          id?: string
          source_hash: string
          schema_version: number
          normalized_data: Json
          raw_sources: Json
          curated_data?: Json | null
          model: string
          temperature: number
          prompt_version: string
          created_at?: string
        }
        Update: {
          id?: string
          source_hash?: string
          schema_version?: number
          normalized_data?: Json
          raw_sources?: Json
          curated_data?: Json | null
          model?: string
          temperature?: number
          prompt_version?: string
          created_at?: string
        }
        Relationships: []
      }
      place_candidates: {
        Row: {
          id: string
          user_id: string
          source: string
          source_id: string | null
          raw_payload: Json
          name: string
          address: string | null
          location: unknown
          status: 'new' | 'enriched' | 'promoted' | 'rejected' | 'error'
          error_message: string | null
          enrichment_id: string | null
          created_at: string
          promoted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          source: string
          source_id?: string | null
          raw_payload: Json
          name: string
          address?: string | null
          location: unknown
          status?: 'new' | 'enriched' | 'promoted' | 'rejected' | 'error'
          error_message?: string | null
          enrichment_id?: string | null
          created_at?: string
          promoted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          source?: string
          source_id?: string | null
          raw_payload?: Json
          name?: string
          address?: string | null
          location?: unknown
          status?: 'new' | 'enriched' | 'promoted' | 'rejected' | 'error'
          error_message?: string | null
          enrichment_id?: string | null
          created_at?: string
          promoted_at?: string | null
        }
        Relationships: []
      }
      places: {
        Row: {
          id: string
          user_id: string
          name: string
          name_normalized: string
          address: string | null
          address_normalized: string | null
          category: Database['public']['Enums']['category_enum']
          energy: Database['public']['Enums']['energy_enum'] | null
          location: unknown
          geohash7: string
          source: string
          source_id: string | null
          google_place_id: string | null
          dedupe_key: string
          opening_hours: Json | null
          enrichment_version: number
          enriched_at: string
          enrichment_source_hash: string
          enrichment_id: string | null
          user_notes: string | null
          user_tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address?: string | null
          category: Database['public']['Enums']['category_enum']
          energy?: Database['public']['Enums']['energy_enum'] | null
          location: unknown
          source: string
          source_id?: string | null
          google_place_id?: string | null
          dedupe_key: string
          opening_hours?: Json | null
          enrichment_version?: number
          enriched_at?: string
          enrichment_source_hash: string
          enrichment_id?: string | null
          user_notes?: string | null
          user_tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string | null
          category?: Database['public']['Enums']['category_enum']
          energy?: Database['public']['Enums']['energy_enum'] | null
          location?: unknown
          source?: string
          source_id?: string | null
          google_place_id?: string | null
          dedupe_key?: string
          opening_hours?: Json | null
          enrichment_version?: number
          enriched_at?: string
          enrichment_source_hash?: string
          enrichment_id?: string | null
          user_notes?: string | null
          user_tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      promote_place_candidate: {
        Args: { p_candidate_id: string }
        Returns: string
      }
    }
    Enums: {
      category_enum: 'Food' | 'Coffee' | 'Sights' | 'Shop' | 'Activity'
      energy_enum: 'Low' | 'Medium' | 'High'
    }
    CompositeTypes: {}
  }
}
