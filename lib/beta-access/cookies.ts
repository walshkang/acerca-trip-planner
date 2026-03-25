import { BETA_COOKIE_NAME } from './constants'

export function getCookieValue(
  cookieHeader: string | null,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(name + '=')) continue
    return trimmed.slice(name.length + 1).trim() || undefined
  }
  return undefined
}

export function getBetaCookieFromHeader(
  cookieHeader: string | null
): string | undefined {
  return getCookieValue(cookieHeader, BETA_COOKIE_NAME)
}
