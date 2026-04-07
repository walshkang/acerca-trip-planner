# Social Extraction Evals

Golden dataset eval suite for the Gemini extraction pipeline.

## Running

```bash
# All evals (deterministic + judge)
GOOGLE_GENERATIVE_AI_API_KEY=your_key npm run eval

# Deterministic only (faster, cheaper - shape checks)
GOOGLE_GENERATIVE_AI_API_KEY=your_key npm run eval:deterministic

# LLM judge only (semantic scoring)
GOOGLE_GENERATIVE_AI_API_KEY=your_key npm run eval:judge
```

Note: `eval:deterministic` and `eval:judge` require the eval suite implementation from earlier slices.

## Model overrides

- `SOCIAL_EXTRACTION_MODEL`: runtime extraction default (also fallback for evals)
- `SOCIAL_EXTRACTION_MODEL_EVAL`: deterministic eval extraction override when `RUN_EVALS=1`
- `SOCIAL_EVAL_JUDGE_MODEL`: judge eval override (falls back to `SOCIAL_EXTRACTION_MODEL_EVAL`, then `SOCIAL_EXTRACTION_MODEL`)

Example:

```bash
SOCIAL_EXTRACTION_MODEL=gemini-2.5-flash
SOCIAL_EXTRACTION_MODEL_EVAL=gemma-3-27b
SOCIAL_EVAL_JUDGE_MODEL=gemini-2.5-flash
```

## Fixtures

| File | Places | Tests |
|------|--------|-------|
| `happy-path.json` | 4 | Baseline - tags, callouts, all positive |
| `firehose.json` | 16 | Recall at scale, dedup |
| `ghost-town.json` | 0 | Zero extraction guardrail |
| `negative-review.json` | 3 | Sentiment accuracy (mixed vs positive) |
| `tangent.json` | 1 | Over-extraction guard (visited vs mentioned) |

## Thresholds

| Metric | Current threshold | Target (after prompt stabilizes) |
|--------|------------------|----------------------------------|
| Recall | >= 75 | >= 85 |
| Hallucination | <= 20 | <= 10 |
| Vibe | >= 70 | >= 75 |

## Adding fixtures

Add a JSON file to `fixtures/` with shape
`{ label, description, transcript, expected: MergedSocialExtraction }`,
then import it in `fixtures/index.ts`.
