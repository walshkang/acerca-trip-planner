'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CategoryEnum } from '@/lib/types/enums'
import {
  CATEGORY_ICON_EVENT,
  CATEGORY_ICON_STORAGE_KEY,
  type CategoryIconOverrides,
  normalizeCategoryIconOverrides,
  normalizeCategoryIconScope,
  parseScopedCategoryIconOverrides,
  resolveCategoryEmoji as resolveCategoryEmojiFromOverrides,
  serializeScopedCategoryIconOverrides,
} from '@/lib/icons/preferences'

function readStoredCategoryIconOverrides(
  scopeKey: string | null | undefined
): CategoryIconOverrides {
  if (typeof window === 'undefined') return {}
  const scope = normalizeCategoryIconScope(scopeKey)
  const all = parseScopedCategoryIconOverrides(
    window.localStorage.getItem(CATEGORY_ICON_STORAGE_KEY)
  )
  return all[scope] ?? {}
}

function writeStoredCategoryIconOverrides(
  scopeKey: string | null | undefined,
  overrides: CategoryIconOverrides
) {
  if (typeof window === 'undefined') return
  const scope = normalizeCategoryIconScope(scopeKey)
  const all = parseScopedCategoryIconOverrides(
    window.localStorage.getItem(CATEGORY_ICON_STORAGE_KEY)
  )
  if (Object.keys(overrides).length === 0) {
    delete all[scope]
  } else {
    all[scope] = overrides
  }
  const serialized = serializeScopedCategoryIconOverrides(all)
  if (serialized === '{}') {
    window.localStorage.removeItem(CATEGORY_ICON_STORAGE_KEY)
  } else {
    window.localStorage.setItem(CATEGORY_ICON_STORAGE_KEY, serialized)
  }
  // Defer cross-component sync to avoid cascading updates in the same render tick.
  window.setTimeout(() => {
    window.dispatchEvent(new Event(CATEGORY_ICON_EVENT))
  }, 0)
}

export function useCategoryIconOverrides(scopeKey?: string | null) {
  const normalizedScope = normalizeCategoryIconScope(scopeKey ?? null)
  const [categoryIconOverrides, setCategoryIconOverrides] =
    useState<CategoryIconOverrides>({})

  useEffect(() => {
    setCategoryIconOverrides(readStoredCategoryIconOverrides(normalizedScope))
  }, [normalizedScope])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== CATEGORY_ICON_STORAGE_KEY) return
      setCategoryIconOverrides(readStoredCategoryIconOverrides(normalizedScope))
    }

    const onSameTabUpdate = () => {
      setCategoryIconOverrides(readStoredCategoryIconOverrides(normalizedScope))
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(CATEGORY_ICON_EVENT, onSameTabUpdate)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CATEGORY_ICON_EVENT, onSameTabUpdate)
    }
  }, [normalizedScope])

  const setCategoryIcon = useCallback(
    (category: CategoryEnum, nextIcon: string | null) => {
      const previous = readStoredCategoryIconOverrides(normalizedScope)
      const next: CategoryIconOverrides = { ...previous }
      if (nextIcon) {
        next[category] = nextIcon
      } else {
        delete next[category]
      }
      const normalized = normalizeCategoryIconOverrides(next)
      setCategoryIconOverrides(normalized)
      writeStoredCategoryIconOverrides(normalizedScope, normalized)
    },
    [normalizedScope]
  )

  const resetCategoryIcons = useCallback(() => {
    setCategoryIconOverrides({})
    writeStoredCategoryIconOverrides(normalizedScope, {})
  }, [normalizedScope])

  const resolveCategoryEmoji = useCallback(
    (category: CategoryEnum) =>
      resolveCategoryEmojiFromOverrides(category, categoryIconOverrides),
    [categoryIconOverrides]
  )

  return {
    categoryIconOverrides,
    setCategoryIcon,
    resetCategoryIcons,
    resolveCategoryEmoji,
  }
}
