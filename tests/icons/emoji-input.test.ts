import { describe, expect, it } from 'vitest'
import { emojiComparisonKey, normalizeEmojiInput } from '@/lib/icons/emoji-input'

describe('normalizeEmojiInput', () => {
  it('accepts a simple emoji', () => {
    expect(normalizeEmojiInput('🍕')).toBe('🍕')
  })

  it('extracts first emoji when text is present before it', () => {
    expect(normalizeEmojiInput('pizza🍕')).toBe('🍕')
  })

  it('accepts flag emoji', () => {
    expect(normalizeEmojiInput('🇺🇸')).toBe('🇺🇸')
  })

  it('accepts keycap emoji', () => {
    expect(normalizeEmojiInput('#️⃣')).toBe('#️⃣')
    expect(normalizeEmojiInput('1️⃣ done')).toBe('1️⃣')
  })

  it('accepts zwj and skin-tone sequences', () => {
    expect(normalizeEmojiInput('👨‍👩‍👧‍👦')).toBe('👨‍👩‍👧‍👦')
    expect(normalizeEmojiInput('👍🏽')).toBe('👍🏽')
  })

  it('returns null when no emoji exists', () => {
    expect(normalizeEmojiInput('plain text')).toBeNull()
    expect(normalizeEmojiInput('    ')).toBeNull()
  })

  it('normalizes variation selectors for matching', () => {
    expect(emojiComparisonKey('☕️')).toBe(emojiComparisonKey('☕'))
    expect(emojiComparisonKey('🏛️')).toBe(emojiComparisonKey('🏛'))
    expect(emojiComparisonKey('🍽️')).toBe(emojiComparisonKey('🍽'))
  })
})
