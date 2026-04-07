import happyPath from './happy-path.json'
import firehose from './firehose.json'
import ghostTown from './ghost-town.json'
import negativeReview from './negative-review.json'
import tangent from './tangent.json'
import type { MergedSocialExtraction } from '@/lib/social/extraction-contract'

export type EvalFixture = {
  label: string
  description: string
  transcript: string
  expected: MergedSocialExtraction
}

export const EVAL_FIXTURES: EvalFixture[] = [
  happyPath,
  firehose,
  ghostTown,
  negativeReview,
  tangent,
] as EvalFixture[]
