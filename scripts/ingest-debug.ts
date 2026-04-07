/**
 * ingest-debug — fetches a URL, runs extraction, shows raw output. No DB writes.
 * Usage: npm run ingest:debug -- "https://youtube.com/watch?v=..."
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

import { fetchContent } from '../lib/server/social/fetch-content'
import {
  extractMergedSocialExtraction,
  getSocialExtractionModelId,
  getSocialExtractionOutputMode,
} from '../lib/server/social/ingest'
import { getChunkingConfigFromEnv } from '../lib/social/transcript-chunks'

const url = process.argv[2]
if (!url) {
  console.error('Usage: npm run ingest:debug -- "<url>"')
  process.exit(1)
}

async function main() {
  const model = getSocialExtractionModelId()
  const mode = getSocialExtractionOutputMode()
  const { maxChars } = getChunkingConfigFromEnv()

  console.log(`\ningest-debug`)
  console.log(`  URL   : ${url}`)
  console.log(`  Model : ${model} (${mode})`)
  console.log(`  Chunk : ${maxChars} chars max\n`)

  // 1. Fetch transcript
  process.stdout.write('Fetching content...')
  const fetched = await fetchContent(url)
  if ('error' in fetched) {
    console.error(` failed: ${fetched.error}`)
    process.exit(1)
  }
  console.log(` done`)
  console.log(`  Title    : ${fetched.title}`)
  console.log(`  Author   : ${fetched.author_name}`)
  console.log(`  Platform : ${fetched.platform}`)
  console.log(`  Transcript length: ${fetched.transcript.length} chars`)
  console.log(`  Path: ${fetched.transcript.length <= maxChars ? 'single-pass' : `chunked (>${maxChars} chars)`}`)

  // 2. Print transcript preview
  console.log(`\n--- TRANSCRIPT PREVIEW (first 800 chars) ---`)
  console.log(fetched.transcript.slice(0, 800))
  if (fetched.transcript.length > 800) console.log(`... (${fetched.transcript.length - 800} more chars)`)

  // 3. Run extraction
  console.log(`\n--- EXTRACTION ---`)
  process.stdout.write('Running extraction...')
  const start = Date.now()
  const result = await extractMergedSocialExtraction(fetched.transcript)
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(` done (${elapsed}s)\n`)

  // 4. Show results
  console.log(`  author_persona : ${result.author_persona}`)
  console.log(`  places found   : ${result.mentioned_places.length}\n`)

  if (result.mentioned_places.length === 0) {
    console.log('  ⚠  No places extracted.')
    console.log('  Possible causes:')
    console.log('  - 2-sentence rule filtered everything (name-checked places, no direct experience)')
    console.log('  - Model over-applied the "personally visited" filter')
    console.log('  - Transcript is non-travel content or lacks named establishments')
    console.log('\n  Check transcript preview above — does it contain named venues with direct experience?')
  } else {
    for (const place of result.mentioned_places) {
      console.log(`  ▸ ${place.place_name} (${place.sentiment})`)
      console.log(`    snippet: "${place.context_snippet?.slice(0, 100)}..."`)
      console.log(`    tags: ${(place.tags ?? []).join(', ')}`)
      console.log(`    callouts: ${(place.callouts ?? []).map((c) => `${c.type}:${c.text}`).join(', ')}`)
    }
  }

  // 5. Offer to save as fixture
  console.log(`\n--- SAVE AS EVAL FIXTURE? ---`)
  console.log(`If this is a useful regression case, save the transcript as a fixture:`)
  console.log(`  Label: <your-label>`)
  console.log(`  Transcript length: ${fetched.transcript.length} chars`)
  console.log(`  Current extraction: ${JSON.stringify({ author_persona: result.author_persona, mentioned_places: result.mentioned_places }, null, 2)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
