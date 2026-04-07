# Social Discovery S2.1 — LLM Extraction Contract

## What to build

A typed contract (Zod schema + TypeScript types) for the structured output the LLM returns when analyzing a social media transcript. This is the interface between the raw transcript and the ingestion pipeline — the LLM must return data matching this schema exactly.

No API route. No database calls. Just types and validation.

## Contract authority

This file is the source of truth for S2 extraction/ingestion payload shape. S2.2 and its tests must import and reuse these exact exports (no inline schema drift):

- `PERSONA_VALUES`
- `PLATFORM_VALUES`
- `personaSchema`
- `mentionedPlaceSchema`
- `socialExtractionSchema`
- `ingestSocialRequestSchema`
- `parseSocialExtraction`
- `parseIngestSocialRequest`

## Files to create

- `lib/social/extraction-contract.ts` — Zod schemas, inferred types, parse function

## Files to reference (read these first)

- `lib/enrichment/contract.ts` — existing enrichment contract pattern (canonical snapshot, source hash). Shows the project's convention for deterministic AI contracts.
- `lib/discovery/contract.ts` — existing discovery suggest contract. Shows how Zod is used for request/response validation in this codebase.
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — full spec. Section "Slice 2" describes the LLM structured output shape.

## Implementation

### 1. Define the persona enum values

```typescript
export const PERSONA_VALUES = [
  'local', 'luxury', 'budget', 'design',
  'foodie', 'adventure', 'family', 'nightlife',
] as const

export type Persona = (typeof PERSONA_VALUES)[number]

export const personaSchema = z.enum(PERSONA_VALUES)
```

### 2. Define the LLM structured output schema

This is what the LLM must return (JSON mode / structured output):

```typescript
import { z } from 'zod'

export const mentionedPlaceSchema = z.object({
  place_name: z.string().min(1),
  place_type: z.string().optional(),          // "café", "temple", "hotel" — helps Google resolve
  context_snippet: z.string().min(1).max(500), // exact quote where mentioned
  sentiment: z.enum(['positive', 'neutral', 'mixed']),
}).strict()

export const socialExtractionSchema = z.object({
  author_persona: personaSchema,
  mentioned_places: z.array(mentionedPlaceSchema).min(1).max(50),
}).strict()

export type SocialExtraction = z.infer<typeof socialExtractionSchema>
export type MentionedPlace = z.infer<typeof mentionedPlaceSchema>
```

### 3. Define the ingestion request schema

This is what the API route accepts from the caller:

```typescript
export const PLATFORM_VALUES = [
  'tiktok', 'youtube', 'blog', 'instagram', 'reddit', 'other',
] as const

export type Platform = (typeof PLATFORM_VALUES)[number]

export const ingestSocialRequestSchema = z.object({
  url: z.string().url(),
  platform: z.enum(PLATFORM_VALUES),
  author_name: z.string().min(1).max(200),
  title: z.string().max(500).optional(),
  transcript: z.string().min(10).max(100_000),
  location_hint: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().optional(),
  }).strict().optional(),
}).strict()

export type IngestSocialRequest = z.infer<typeof ingestSocialRequestSchema>
```

### 4. Add a parse function

```typescript
export function parseIngestSocialRequest(body: unknown):
  | { ok: true; data: IngestSocialRequest }
  | { ok: false; message: string } {
  const result = ingestSocialRequestSchema.safeParse(body)
  if (!result.success) {
    // Keep this as one deterministic message string for route-level error responses.
    return { ok: false, message: result.error.issues.map(i => i.message).join('; ') }
  }
  return { ok: true, data: result.data }
}

export function parseSocialExtraction(raw: unknown):
  | { ok: true; data: SocialExtraction }
  | { ok: false; message: string } {
  const result = socialExtractionSchema.safeParse(raw)
  if (!result.success) {
    // Keep this as one deterministic message string for route-level error responses.
    return { ok: false, message: result.error.issues.map(i => i.message).join('; ') }
  }
  return { ok: true, data: result.data }
}
```

### 5. Enforce enum/value compatibility with downstream pipeline

- `author_persona` values must be exactly:
  `local | luxury | budget | design | foodie | adventure | family | nightlife`
- `platform` values must be exactly:
  `tiktok | youtube | blog | instagram | reddit | other`
- `sentiment` is required for every item in `mentioned_places`
- Do not introduce human-readable persona labels (for example: `Local Purist`, `Foodie`, `Generalist`) in this contract

## What NOT to do

- Don't add any LLM calling logic — that's S2.2
- Don't add any database types or Supabase imports
- Don't add any API route code
- Don't deviate from Zod — the codebase already uses it for contracts
- Don't add legacy/human-readable persona labels; lowercase enum values only

## Verification

Write tests in `tests/social/extraction-contract.test.ts`:

```typescript
import { parseSocialExtraction, parseIngestSocialRequest } from '@/lib/social/extraction-contract'

it('parses valid extraction', () => {
  const result = parseSocialExtraction({
    author_persona: 'foodie',
    mentioned_places: [{
      place_name: 'Jay Fai',
      place_type: 'restaurant',
      context_snippet: 'This Michelin-starred street food spot...',
      sentiment: 'positive',
    }],
  })
  expect(result.ok).toBe(true)
})

it('rejects empty mentioned_places', () => {
  const result = parseSocialExtraction({
    author_persona: 'foodie',
    mentioned_places: [],
  })
  expect(result.ok).toBe(false)
})

it('rejects invalid persona', () => {
  const result = parseSocialExtraction({
    author_persona: 'influencer',
    mentioned_places: [{ place_name: 'X', context_snippet: 'Y', sentiment: 'positive' }],
  })
  expect(result.ok).toBe(false)
})

it('parses valid ingest request', () => {
  const result = parseIngestSocialRequest({
    url: 'https://youtube.com/watch?v=abc',
    platform: 'youtube',
    author_name: 'Mark Wiens',
    transcript: 'Today we are visiting Jay Fai in Bangkok...',
    location_hint: { lat: 13.75, lng: 100.5, city: 'Bangkok' },
  })
  expect(result.ok).toBe(true)
})

it('rejects unknown extraction fields', () => {
  const result = parseSocialExtraction({
    author_persona: 'foodie',
    mentioned_places: [{
      place_name: 'Jay Fai',
      context_snippet: 'Best crab omelet in Bangkok.',
      sentiment: 'positive',
      extra_field: 'not allowed',
    }],
  })
  expect(result.ok).toBe(false)
})

it('rejects unknown ingest fields', () => {
  const result = parseIngestSocialRequest({
    url: 'https://youtube.com/watch?v=abc',
    platform: 'youtube',
    author_name: 'Mark Wiens',
    transcript: 'Today we are visiting Jay Fai in Bangkok...',
    unknown_field: true,
  })
  expect(result.ok).toBe(false)
})
```

Run `npm test` to confirm all tests pass.
