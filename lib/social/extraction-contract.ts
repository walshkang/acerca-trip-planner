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

export const calloutSchema = z
  .object({
    type: z.enum(['dish', 'drink', 'activity', 'tip']),
    text: z.string().min(1).max(200),
  })
  .strict()

export const mentionedPlaceSchema = z
  .object({
    place_name: z.string().min(1),
    place_type: z.string().optional(),
    context_snippet: z.string().min(1).max(4000),
    sentiment: z.enum(['positive', 'neutral', 'mixed']),
    tags: z.array(z.string().min(1).max(50)).max(6).optional().default([]),
    callouts: z.array(calloutSchema).max(10).optional().default([]),
  })
  .strict()

export const socialExtractionSchema = z
  .object({
    author_persona: personaSchema,
    mentioned_places: z.array(mentionedPlaceSchema).min(0).max(50),
  })
  .strict()

/** Per-chunk LLM output; empty segments allowed. */
export const socialExtractionChunkSchema = z
  .object({
    author_persona: personaSchema.optional(),
    mentioned_places: z.array(mentionedPlaceSchema).min(0).max(50),
    contains_places: z.boolean().optional(),
  })
  .strict()

/** After merging chunk extractions (may have zero places). */
export const mergedSocialExtractionSchema = z
  .object({
    author_persona: personaSchema,
    mentioned_places: z.array(mentionedPlaceSchema).min(0).max(100),
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
export type Callout = z.infer<typeof calloutSchema>
export type SocialExtraction = z.infer<typeof socialExtractionSchema>
export type SocialExtractionChunk = z.infer<typeof socialExtractionChunkSchema>
export type MergedSocialExtraction = z.infer<typeof mergedSocialExtractionSchema>
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

export function parseSocialExtractionChunk(
  raw: unknown
): { ok: true; data: SocialExtractionChunk } | { ok: false; message: string } {
  const result = socialExtractionChunkSchema.safeParse(raw)
  if (!result.success) {
    return { ok: false, message: result.error.issues.map((i) => i.message).join('; ') }
  }
  return { ok: true, data: result.data }
}
