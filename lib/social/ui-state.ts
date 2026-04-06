export function shouldShowPersonaFilterChips(params: {
  socialPlaceCount: number
  selectedPersonaCount: number
  isLoading: boolean
  error: string | null
}): boolean {
  const { socialPlaceCount, selectedPersonaCount, isLoading, error } = params
  return (
    socialPlaceCount > 0 ||
    selectedPersonaCount > 0 ||
    isLoading ||
    Boolean(error)
  )
}

export type SocialMentionPanelState =
  | 'hidden'
  | 'loading'
  | 'error'
  | 'empty'
  | 'ready'

export function getSocialMentionPanelState(params: {
  isSocialPlace: boolean
  detailsLoading: boolean
  detailsError: string | null
  mentionCount: number
}): SocialMentionPanelState {
  const { isSocialPlace, detailsLoading, detailsError, mentionCount } = params
  if (!isSocialPlace) return 'hidden'
  if (detailsLoading) return 'loading'
  if (detailsError) return 'error'
  if (mentionCount <= 0) return 'empty'
  return 'ready'
}
