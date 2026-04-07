# Social Extraction Evals — Slice 4: Runner + CI Gate

## Goal

Wire the eval suite into `package.json` with a dedicated `eval` script. Add a `tsconfig` check to confirm fixture JSON imports type correctly. Optionally add a GitHub Actions workflow that runs evals on-demand (not on every push).

---

## Files to read first

- `package.json` — existing scripts
- `vitest.config.ts` — current vitest setup
- `tsconfig.json` — check if `resolveJsonModule` is set
- `.github/workflows/` — existing CI workflows (if any)

---

## Changes

### 1. Add eval script to `package.json`

Add to `scripts`:

```json
"eval": "RUN_EVALS=1 vitest run tests/social/evals/",
"eval:deterministic": "RUN_EVALS=1 vitest run tests/social/evals/deterministic.eval.ts",
"eval:judge": "RUN_EVALS=1 vitest run tests/social/evals/judge.eval.ts"
```

Usage:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=... npm run eval
GOOGLE_GENERATIVE_AI_API_KEY=... npm run eval:deterministic
GOOGLE_GENERATIVE_AI_API_KEY=... npm run eval:judge
```

---

### 2. Confirm `tsconfig.json` supports JSON imports

Check if `"resolveJsonModule": true` is set in `tsconfig.json`. If not, add it under `compilerOptions`. This is required for the fixture `import ... from './happy-path.json'` pattern used in `fixtures/index.ts`.

---

### 3. Add a `README` section to `cursor-prompts/README.md` (if it exists) or create `tests/social/evals/README.md`

```markdown
# Social Extraction Evals

Golden dataset eval suite for the Gemini extraction pipeline.

## Running

```bash
# All evals (deterministic + judge)
GOOGLE_GENERATIVE_AI_API_KEY=your_key npm run eval

# Deterministic only (faster, cheaper — just shape checks)
GOOGLE_GENERATIVE_AI_API_KEY=your_key npm run eval:deterministic

# LLM judge only (semantic scoring — costs ~$0.01 per run)
GOOGLE_GENERATIVE_AI_API_KEY=your_key npm run eval:judge
```

## Fixtures

| File | Places | Tests |
|------|--------|-------|
| `happy-path.json` | 4 | Baseline — tags, callouts, all positive |
| `firehose.json` | 16 | Recall at scale, dedup |
| `ghost-town.json` | 0 | Zero extraction guardrail |
| `negative-review.json` | 3 | Sentiment accuracy (mixed vs positive) |
| `tangent.json` | 1 | Over-extraction guard (visited vs mentioned) |

## Thresholds

| Metric | Current threshold | Target (after prompt stabilizes) |
|--------|------------------|----------------------------------|
| Recall | ≥ 75 | ≥ 85 |
| Hallucination | ≤ 20 | ≤ 10 |
| Vibe | ≥ 70 | ≥ 75 |

## Adding fixtures

Add a JSON file to `fixtures/` with shape `{ label, description, transcript, expected: MergedSocialExtraction }`, then import it in `fixtures/index.ts`.
```

---

### 4. Optional: GitHub Actions on-demand workflow

Create `.github/workflows/social-evals.yml`:

```yaml
name: Social Extraction Evals

on:
  workflow_dispatch:
    inputs:
      suite:
        description: 'Which eval suite to run'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - deterministic
          - judge

jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run evals
        env:
          GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
          SOCIAL_EXTRACTION_MODEL: gemini-1.5-flash
          SOCIAL_EXTRACTION_MODEL_EVAL: gemma-3-27b
          SOCIAL_EVAL_JUDGE_MODEL: gemini-2.5-flash
        run: |
          if [ "${{ inputs.suite }}" = "deterministic" ]; then
            npm run eval:deterministic
          elif [ "${{ inputs.suite }}" = "judge" ]; then
            npm run eval:judge
          else
            npm run eval
          fi
```

Note: Add `GOOGLE_GENERATIVE_AI_API_KEY` to GitHub repo secrets before using this workflow. Trigger it manually via Actions tab — it does NOT run on every push.

---

## Definition of Done

- [ ] `npm run eval:deterministic` runs and all deterministic tests pass
- [ ] `npm run eval:judge` runs and all 5 fixtures score above threshold
- [ ] `npm run test` (normal CI) skips the eval suite entirely — no `RUN_EVALS` set means 0 eval tests run
- [ ] JSON fixture imports are type-safe (no `any`, `tsconfig` has `resolveJsonModule`)
- [ ] `npm run check` passes
