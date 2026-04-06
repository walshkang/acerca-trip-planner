import { describe, expect, it } from 'vitest'
import {
  getSocialMentionPanelState,
  shouldShowPersonaFilterChips,
} from '@/lib/social/ui-state'

describe('social ui state helpers', () => {
  describe('shouldShowPersonaFilterChips', () => {
    it('hides chips when there is no data and no active selection', () => {
      expect(
        shouldShowPersonaFilterChips({
          socialPlaceCount: 0,
          selectedPersonaCount: 0,
          isLoading: false,
          error: null,
        })
      ).toBe(false)
    })

    it('keeps chips visible when a persona filter is active', () => {
      expect(
        shouldShowPersonaFilterChips({
          socialPlaceCount: 0,
          selectedPersonaCount: 2,
          isLoading: false,
          error: null,
        })
      ).toBe(true)
    })
  })

  describe('getSocialMentionPanelState', () => {
    it('returns hidden for non-social places', () => {
      expect(
        getSocialMentionPanelState({
          isSocialPlace: false,
          detailsLoading: false,
          detailsError: null,
          mentionCount: 0,
        })
      ).toBe('hidden')
    })

    it('returns loading while details are loading', () => {
      expect(
        getSocialMentionPanelState({
          isSocialPlace: true,
          detailsLoading: true,
          detailsError: null,
          mentionCount: 0,
        })
      ).toBe('loading')
    })

    it('returns error for details errors on social places', () => {
      expect(
        getSocialMentionPanelState({
          isSocialPlace: true,
          detailsLoading: false,
          detailsError: 'boom',
          mentionCount: 0,
        })
      ).toBe('error')
    })

    it('returns empty when social place has no mentions', () => {
      expect(
        getSocialMentionPanelState({
          isSocialPlace: true,
          detailsLoading: false,
          detailsError: null,
          mentionCount: 0,
        })
      ).toBe('empty')
    })

    it('returns ready when social place has mentions', () => {
      expect(
        getSocialMentionPanelState({
          isSocialPlace: true,
          detailsLoading: false,
          detailsError: null,
          mentionCount: 2,
        })
      ).toBe('ready')
    })
  })
})
