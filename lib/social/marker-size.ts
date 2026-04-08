export function socialMarkerSizeClass(mentionCount?: number): string {
  if (mentionCount == null || mentionCount <= 1) return 'h-9 w-9'
  if (mentionCount <= 3) return 'h-11 w-11'
  return 'h-13 w-13'
}

/** Overlap count from research RPC (sources per place) — same sizing ladder as mentions */
export function researchOverlapMarkerSizeClass(overlapCount?: number): string {
  return socialMarkerSizeClass(overlapCount)
}
