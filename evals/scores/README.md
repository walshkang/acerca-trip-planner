# Social Extraction Eval Scores

This directory contains timestamped eval run results and diagnosis reports for the social extraction pipeline (`lib/server/social/ingest.ts`).

## File Types

| Pattern | What it is |
|---------|------------|
| `YYYY-MM-DDTHH-MM-SS.json` | Raw score file — one entry per fixture, averages, weakest dimension |
| `YYYY-MM-DDTHH-MM-SS-diagnosis.md` | Human/agent-readable failure report + meta-LLM prompt context |
| `latest-diagnosis.md` | Always the most recent diagnosis (overwritten each run) |

All files are committed to git so agents and humans can track improvement over runs.

## Score Schema

Each `.json` file has:

```json
{
  "timestamp": "ISO 8601",
  "model": "extraction model ID",
  "output_mode": "native-json | text-json-fallback",
  "judge_model": "judge model ID",
  "fixtures": {
    "<label>": {
      "recall_score": 0–100,
      "groundedness_score": 0–100,
      "persona_score": 0–100,
      "richness_score": 0–100,
      "reasoning": "judge's explanation",
      "pass": true | false,
      "failing_dimensions": ["recall", "groundedness", ...]
    }
  },
  "summary": {
    "total": N, "passed": N, "failed": N,
    "avg_recall": N, "avg_groundedness": N, "avg_persona": N, "avg_richness": N,
    "weakest_dimension": "recall | groundedness | persona | richness"
  }
}
```

## Thresholds (from `lib/server/social/eval-judge.ts`)

| Dimension | Threshold | What it measures |
|-----------|-----------|-----------------|
| `recall_score` | ≥ 75 | % of expected places found in actual output (fuzzy name match) |
| `groundedness_score` | ≥ 80 | Every extracted place/detail is directly supported by the transcript |
| `persona_score` | ≥ 75 | `author_persona` matches the tone/focus of the transcript |
| `richness_score` | ≥ 70 | Callouts and tags are specific + grounded, not generic |

All dimensions are higher = better (0–100).

## Self-Improving Flywheel

```
eval:capture → eval:diagnose → paste latest-diagnosis.md into meta-LLM
     ↑                                        ↓
  --force re-run          update SYSTEM_PROMPT in lib/server/social/ingest.ts
```

### Steps

1. **Capture** — runs all fixtures through extraction + judge, writes score JSON:
   ```bash
   npm run eval:capture              # uses cached extractions (fast, judge-only re-run)
   npm run eval:capture -- --force   # re-extracts everything (use after changing SYSTEM_PROMPT)
   ```

2. **Diagnose** — reads latest score JSON, prints ranked failure report, writes diagnosis files:
   ```bash
   npm run eval:diagnose
   # or point at a specific score file:
   npm run eval:diagnose -- evals/scores/2026-04-07T10-00-00.json
   ```

3. **Improve** — copy `evals/scores/latest-diagnosis.md` into a meta-LLM with the current `SYSTEM_PROMPT` from `lib/server/social/ingest.ts`. Ask it to suggest targeted changes for the failing dimensions.

4. **Re-capture** — after updating `SYSTEM_PROMPT`, run with `--force` to re-extract and re-judge.

## Fixtures

Fixtures live in `tests/social/evals/fixtures/`. Each fixture has:
- `label` — short ID (used in filenames and score keys)
- `transcript` — raw video/content transcript text
- `expected` — `MergedSocialExtraction` with the places/persona/callouts an ideal extractor should produce
- `_eval_notes` — explains why the fixture has the persona it does (helps debug persona misclassifications)

Add new fixtures to `tests/social/evals/fixtures/index.ts`.

## Extraction Cache

Extractions are cached by `label + model` in `evals/extractions/` (gitignored). This means re-running capture after a judge threshold change or a judge model switch is fast — it only re-runs the judge, not the expensive LLM extraction step. Use `--force` to bust the cache.

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SOCIAL_EXTRACTION_MODEL` | Extraction model | `gemini-2.0-flash` |
| `SOCIAL_EXTRACTION_OUTPUT_MODE` | `native-json` or `text-json-fallback` | auto-detected from model |
| `SOCIAL_EVAL_JUDGE_MODEL` | Judge model | `gemini-2.5-flash` |
| `EVAL_CAPTURE_GAP_MS` | Delay between fixtures (ms) | `4000` |

Gemma models are auto-detected by model ID prefix and use `text-json-fallback` mode (no native schema support).
