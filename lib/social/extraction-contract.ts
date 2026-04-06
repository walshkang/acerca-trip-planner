import { z } from 'zod'

export const PERSONA_VALUES = [
  'local',
  'luxury',
  'budget',
  'design',
  'foodie',
  'adventure',
  'family',
  'nightlife',
] as const

export type Persona = (typeof PERSONA_VALUES)[number]

export const PLATFORM_VALUES = [
  'tiktok',
  'youtube',
  'blog',
  'instagram',
  'reddit',
  'other',
] as const

export type Platform = (typeof PLATFORM_VALUES)[number]

export const personaSchema = z.enum(PERSONA_VALUES)

export const mentionedPlaceSchema = z
  .object({
    place_name: z.string().min(1),
    place_type: z.string().optional(),
    context_snippet: z.string().min(1).max(500),
    sentiment: z.enum(['positive', 'neutral', 'mixed']),
  })
  .strict()

export const socialExtractionSchema = z
  .object({
    author_persona: personaSchema,
    mentioned_places: z.array(mentionedPlaceSchema).min(1).max(50),
  })
  .strict()

export const ingestSocialRequestSchema = z
  .object({
    url: z.string().url(),
    platform: z.enum(PLATFORM_VALUES),
    author_name: z.string().min(1).max(200),
    title: z.string().max(500).optional(),
    transcript: z.string().min(10).max(100_000),
    location_hint: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        city: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export type MentionedPlace = z.infer<typeof mentionedPlaceSchema>
export type SocialExtraction = z.infer<typeof socialExtractionSchema>
export type IngestSocialRequest = z.infer<typeof ingestSocialRequestSchema>

export function parseSocialExtraction(
  raw: unknown
): { ok: true; data: SocialExtraction } | { ok: false; message: string } {
  const result = socialExtractionSchema.safeParse(raw)
  if (!result.success) {
    return { ok: false, message: result.error.issues.map((i) => i.message).join('; ') }
  }
  return { ok: true, data: result.data }
}

export function parseIngestSocialRequest(
  body: unknown
): { ok: true; data: IngestSocialRequest } | { ok: false; message: string } {
  const result = ingestSocialRequestSchema.safeParse(body)
  if (!result.success) {
    return { ok: false, message: result.error.issues.map((i) => i.message).join('; ') }
  }
  return { ok: true, data: result.data }
}
