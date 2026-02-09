# Plan Artifacts

This directory stores visual-first planning artifacts for features.

## Required Files Per Feature
- `plan.md`: short intent and non-goals.
- `flowchart.json`: logic and transition graph.
- `mockup.json`: UI component tree grouped by state.

## Commands
- `npm run plan:new -- --feature <name>` to scaffold a new feature plan.
- `npm run plan:validate` to validate all artifacts under `docs/plans`.

## Workflow
1. Create or update JSON artifacts.
2. Review and approve flow/mockup.
3. Implement code after approval.
4. During review, check implementation drift against artifacts.
