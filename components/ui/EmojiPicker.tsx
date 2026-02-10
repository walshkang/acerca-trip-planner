'use client'

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { emojiComparisonKey, normalizeEmojiInput } from '@/lib/icons/emoji-input'

type EmojiOption = {
  emoji: string
  label: string
  tags: string[]
}

type Props = {
  open: boolean
  title: string
  suggestedEmojis?: readonly string[]
  includeCatalog?: boolean
  restrictToOptions?: boolean
  onSelect: (emoji: string) => void
  onClose: () => void
}

const EMOJI_CATALOG: readonly EmojiOption[] = [
  { emoji: '😀', label: 'Grinning Face', tags: ['smile', 'happy', 'face'] },
  { emoji: '😁', label: 'Beaming Face', tags: ['smile', 'happy', 'face'] },
  { emoji: '😂', label: 'Face Tears Joy', tags: ['laugh', 'funny', 'face'] },
  { emoji: '😊', label: 'Smiling Eyes', tags: ['smile', 'warm', 'face'] },
  { emoji: '😍', label: 'Heart Eyes', tags: ['love', 'face', 'heart'] },
  { emoji: '🤩', label: 'Star Eyes', tags: ['wow', 'face', 'star'] },
  { emoji: '😎', label: 'Sunglasses', tags: ['cool', 'face', 'sun'] },
  { emoji: '🥳', label: 'Party Face', tags: ['party', 'celebrate', 'face'] },
  { emoji: '✨', label: 'Sparkles', tags: ['glow', 'magic', 'shine'] },
  { emoji: '🔥', label: 'Fire', tags: ['hot', 'trend', 'energy'] },
  { emoji: '🌈', label: 'Rainbow', tags: ['color', 'fun', 'playful'] },
  { emoji: '🌟', label: 'Glowing Star', tags: ['star', 'highlight', 'focus'] },
  { emoji: '🧭', label: 'Compass', tags: ['travel', 'direction', 'map'] },
  { emoji: '🗺️', label: 'World Map', tags: ['map', 'travel', 'trip'] },
  { emoji: '📍', label: 'Round Pushpin', tags: ['pin', 'map', 'marker'] },
  { emoji: '📌', label: 'Pushpin', tags: ['pin', 'map', 'marker'] },
  { emoji: '🏙️', label: 'Cityscape', tags: ['city', 'sights', 'urban'] },
  { emoji: '🌆', label: 'City Sunset', tags: ['city', 'sights', 'sunset'] },
  { emoji: '🏛️', label: 'Classical Building', tags: ['sights', 'museum', 'landmark'] },
  { emoji: '🗽', label: 'Statue of Liberty', tags: ['sights', 'landmark', 'travel'] },
  { emoji: '🏰', label: 'Castle', tags: ['sights', 'historic', 'landmark'] },
  { emoji: '🎡', label: 'Ferris Wheel', tags: ['activity', 'fun', 'ride'] },
  { emoji: '🎢', label: 'Roller Coaster', tags: ['activity', 'fun', 'ride'] },
  { emoji: '🎯', label: 'Bullseye', tags: ['activity', 'target', 'game'] },
  { emoji: '🎭', label: 'Performing Arts', tags: ['activity', 'theater', 'show'] },
  { emoji: '🎨', label: 'Artist Palette', tags: ['art', 'museum', 'sights'] },
  { emoji: '🎵', label: 'Musical Note', tags: ['music', 'activity', 'night'] },
  { emoji: '🎸', label: 'Guitar', tags: ['music', 'live', 'activity'] },
  { emoji: '🎲', label: 'Game Die', tags: ['game', 'activity', 'fun'] },
  { emoji: '🧩', label: 'Puzzle Piece', tags: ['game', 'activity', 'fun'] },
  { emoji: '🚴', label: 'Bicyclist', tags: ['activity', 'sport', 'outdoor'] },
  { emoji: '🏄', label: 'Surfing', tags: ['activity', 'water', 'sport'] },
  { emoji: '🏊', label: 'Swimming', tags: ['activity', 'water', 'sport'] },
  { emoji: '🧘', label: 'Meditation', tags: ['activity', 'wellness', 'calm'] },
  { emoji: '⛳️', label: 'Flag in Hole', tags: ['activity', 'golf', 'sport'] },
  { emoji: '🛶', label: 'Canoe', tags: ['activity', 'water', 'outdoor'] },
  { emoji: '🥾', label: 'Hiking Boot', tags: ['activity', 'hike', 'outdoor'] },
  { emoji: '🍽️', label: 'Fork and Knife', tags: ['food', 'restaurant', 'meal'] },
  { emoji: '🍕', label: 'Pizza', tags: ['food', 'meal', 'restaurant'] },
  { emoji: '🍔', label: 'Burger', tags: ['food', 'meal', 'restaurant'] },
  { emoji: '🍜', label: 'Steaming Bowl', tags: ['food', 'meal', 'restaurant'] },
  { emoji: '🍣', label: 'Sushi', tags: ['food', 'meal', 'restaurant'] },
  { emoji: '🌮', label: 'Taco', tags: ['food', 'meal', 'restaurant'] },
  { emoji: '🥘', label: 'Shallow Pan Food', tags: ['food', 'meal', 'restaurant'] },
  { emoji: '🥗', label: 'Green Salad', tags: ['food', 'healthy', 'meal'] },
  { emoji: '🍳', label: 'Cooking', tags: ['food', 'brunch', 'meal'] },
  { emoji: '🍞', label: 'Bread', tags: ['food', 'bakery', 'meal'] },
  { emoji: '🥐', label: 'Croissant', tags: ['food', 'bakery', 'coffee'] },
  { emoji: '🍰', label: 'Shortcake', tags: ['dessert', 'sweet', 'food'] },
  { emoji: '🧁', label: 'Cupcake', tags: ['dessert', 'sweet', 'food'] },
  { emoji: '🍦', label: 'Ice Cream', tags: ['dessert', 'sweet', 'food'] },
  { emoji: '☕️', label: 'Hot Beverage', tags: ['coffee', 'cafe', 'drink'] },
  { emoji: '🫖', label: 'Teapot', tags: ['tea', 'coffee', 'cafe'] },
  { emoji: '🧋', label: 'Bubble Tea', tags: ['drink', 'coffee', 'cafe'] },
  { emoji: '🥤', label: 'Cup Straw', tags: ['drink', 'cafe', 'beverage'] },
  { emoji: '🍵', label: 'Teacup', tags: ['tea', 'cafe', 'drink'] },
  { emoji: '🍷', label: 'Wine Glass', tags: ['drinks', 'bar', 'wine'] },
  { emoji: '🍸', label: 'Cocktail Glass', tags: ['drinks', 'bar', 'cocktail'] },
  { emoji: '🍹', label: 'Tropical Drink', tags: ['drinks', 'bar', 'cocktail'] },
  { emoji: '🥂', label: 'Clinking Glasses', tags: ['drinks', 'bar', 'celebrate'] },
  { emoji: '🍺', label: 'Beer Mug', tags: ['drinks', 'bar', 'beer'] },
  { emoji: '🍻', label: 'Clinking Beer Mugs', tags: ['drinks', 'bar', 'beer'] },
  { emoji: '🍶', label: 'Sake', tags: ['drinks', 'bar', 'drink'] },
  { emoji: '🛍️', label: 'Shopping Bags', tags: ['shop', 'shopping', 'store'] },
  { emoji: '🛒', label: 'Shopping Cart', tags: ['shop', 'shopping', 'store'] },
  { emoji: '🎁', label: 'Wrapped Gift', tags: ['shop', 'gift', 'store'] },
  { emoji: '🧢', label: 'Billed Cap', tags: ['shop', 'fashion', 'store'] },
  { emoji: '👟', label: 'Running Shoe', tags: ['shop', 'fashion', 'store'] },
  { emoji: '👗', label: 'Dress', tags: ['shop', 'fashion', 'store'] },
  { emoji: '💄', label: 'Lipstick', tags: ['shop', 'beauty', 'store'] },
  { emoji: '🧴', label: 'Lotion Bottle', tags: ['shop', 'beauty', 'store'] },
  { emoji: '📚', label: 'Books', tags: ['shop', 'bookstore', 'store'] },
  { emoji: '🖼️', label: 'Framed Picture', tags: ['shop', 'art', 'store'] },
  { emoji: '🌿', label: 'Herb', tags: ['nature', 'calm', 'green'] },
  { emoji: '🌸', label: 'Cherry Blossom', tags: ['nature', 'pretty', 'flower'] },
  { emoji: '🌴', label: 'Palm Tree', tags: ['nature', 'travel', 'outdoor'] },
  { emoji: '🏖️', label: 'Beach', tags: ['travel', 'outdoor', 'relax'] },
  { emoji: '🏞️', label: 'National Park', tags: ['travel', 'nature', 'outdoor'] },
  { emoji: '🪩', label: 'Mirror Ball', tags: ['nightlife', 'party', 'drinks'] },
  { emoji: '🕺', label: 'Man Dancing', tags: ['dance', 'nightlife', 'activity'] },
  { emoji: '💃', label: 'Woman Dancing', tags: ['dance', 'nightlife', 'activity'] },
  { emoji: '🛸', label: 'UFO', tags: ['weird', 'fun', 'playful'] },
  { emoji: '🚀', label: 'Rocket', tags: ['fast', 'fun', 'playful'] },
]

function buildQueryText(option: EmojiOption): string {
  return `${option.label} ${option.tags.join(' ')}`.toLowerCase()
}

export default function EmojiPicker({
  open,
  title,
  suggestedEmojis = [],
  includeCatalog = true,
  restrictToOptions = true,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.select()
    }, 0)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setError(null)
  }, [open, title])

  const options = useMemo(() => {
    const merged: EmojiOption[] = []
    const seen = new Set<string>()

    for (const emoji of suggestedEmojis) {
      if (seen.has(emoji)) continue
      merged.push({
        emoji,
        label: 'Suggested',
        tags: ['suggested'],
      })
      seen.add(emoji)
    }

    if (includeCatalog) {
      for (const option of EMOJI_CATALOG) {
        if (seen.has(option.emoji)) continue
        merged.push(option)
        seen.add(option.emoji)
      }
    }

    return merged
  }, [includeCatalog, suggestedEmojis])

  const allowedEmojiByKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of options) {
      const key = emojiComparisonKey(option.emoji)
      if (!map.has(key)) {
        map.set(key, option.emoji)
      }
    }
    return map
  }, [options])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized.length) return options
    return options.filter((option) => {
      if (option.emoji.includes(query.trim())) return true
      return buildQueryText(option).includes(normalized)
    })
  }, [options, query])

  const handleSelect = (emoji: string) => {
    onSelect(emoji)
    onClose()
  }

  const resolveAllowedTypedEmoji = (value: string): string | null => {
    const normalized = normalizeEmojiInput(value)
    if (!normalized) return null
    if (!restrictToOptions) return normalized
    return allowedEmojiByKey.get(emojiComparisonKey(normalized)) ?? null
  }

  const submitTypedEmoji = (event: FormEvent) => {
    event.preventDefault()
    const parsed = normalizeEmojiInput(query)
    if (!parsed) {
      setError('Type an emoji or pick one from the panel.')
      return
    }
    const resolved = resolveAllowedTypedEmoji(query)
    if (!resolved) {
      setError(
        restrictToOptions
          ? 'That emoji is not available here. Pick one from the panel.'
          : 'Type an emoji or pick one from the panel.'
      )
      return
    }
    handleSelect(resolved)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[140]">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close emoji picker"
      />
      <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 md:bottom-4">
        <div className="glass-panel w-full max-w-[680px] rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-slate-100">{title}</p>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-300 hover:text-slate-100"
            >
              Close
            </button>
          </div>

          <div className="space-y-3 px-4 py-3">
            <form onSubmit={submitTypedEmoji} className="flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setQuery(nextValue)
                  if (error) setError(null)
                  const resolved = resolveAllowedTypedEmoji(nextValue)
                  if (resolved) {
                    handleSelect(resolved)
                  }
                }}
                placeholder="Search emoji, or type one and press Enter"
                className="glass-input min-w-[220px] flex-1 text-sm"
                maxLength={64}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
              />
              <button type="submit" className="glass-button">
                Use typed
              </button>
            </form>

            <p className="text-[11px] text-slate-300">
              Mobile: keyboard opens automatically. Mac: press Control + Command
              + Space for Apple&apos;s emoji window.
            </p>

            {error ? <p className="text-[11px] text-red-300">{error}</p> : null}

            <div className="max-h-[42vh] overflow-y-auto">
              {filtered.length ? (
                <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-12">
                  {filtered.map((option) => (
                    <button
                      key={`${option.emoji}-${option.label}`}
                      type="button"
                      className="rounded-md border border-white/10 bg-white/5 p-2 text-xl leading-none transition hover:border-white/30 hover:bg-white/10"
                      onClick={() => handleSelect(option.emoji)}
                      title={option.label}
                      aria-label={`Choose ${option.label}`}
                    >
                      {option.emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-300">No emoji found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
