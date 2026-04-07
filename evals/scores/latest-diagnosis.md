EVAL DIAGNOSIS — 2026-04-07
Model: gemma-4-31b-it | Mode: text-json-fallback | Judge: gemma-4-31b-it
Result: 6/7 passed

SCORES
fixture               recall  ground  persona  richness  pass
──────────────────────────────────────────────────────────────
(threshold)              ≥75     ≥80      ≥75       ≥70 
happy-path               100     100      100       100  ✓
firehose                  75     100      100        85  ✓
ghost-town               100      40       10       100  ✗ groundedness, persona
negative-review          100     100      100        90  ✓
tangent                  100     100      100       100  ✓
luxury-persona           100     100      100        98  ✓
local-persona             95     100      100        88  ✓
──────────────────────────────────────────────────────────────
AVERAGE                 95.7    91.4     87.1      94.4 

FAILURES (1)

ghost-town — failing: groundedness, persona
  recall=100 groundedness=40 persona=10 richness=100
  Judge: "The AI correctly matched the expected extraction regarding mentioned places (empty list). However, it failed significantly on the persona. The author explicitly states 'we just landed in Lisbon,' which directly contradicts the 'local' persona. The 'local' persona requires insider knowledge, whereas the author is a first-time visitor exploring the city."

DIMENSION HEALTH (worst → best margin from threshold)
  ✓ groundedness   avg 91.4 (+11.400000000000006 from threshold 80)
  ✓ persona        avg 87.1 (+12.099999999999994 from threshold 75)
  ✓ recall         avg 95.7 (+20.700000000000003 from threshold 75)
  ✓ richness       avg 94.4 (+24.400000000000006 from threshold 70)

WEAKEST DIMENSION: persona

──────────────────────────────────────────────────────────────
PROMPT IMPROVEMENT CONTEXT (paste into meta-LLM)
──────────────────────────────────────────────────────────────

The following fixtures are failing. For each, the judge explained why.
Use this to suggest targeted changes to SYSTEM_PROMPT in lib/server/social/ingest.ts.

Fixture: ghost-town
Failing: groundedness, persona
Judge reasoning: The AI correctly matched the expected extraction regarding mentioned places (empty list). However, it failed significantly on the persona. The author explicitly states 'we just landed in Lisbon,' which directly contradicts the 'local' persona. The 'local' persona requires insider knowledge, whereas the author is a first-time visitor exploring the city.
