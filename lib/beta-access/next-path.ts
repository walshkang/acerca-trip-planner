/**
 * Safe in-app path for post-unlock redirect. Rejects open redirects.
 *
 * Do not relax these rules without a security review:
 * - Reject values containing `://` or starting with `//` (protocol-relative).
 * - Resolve with `new URL(next, requestUrl)` and require
 *   `resolved.origin === new URL(requestUrl).origin`.
 * - Default to `/` when validation fails.
 */
export function safeNextPath(nextRaw: string | null, requestUrl: string): string {
  if (nextRaw == null || nextRaw === '') {
    return '/'
  }

  const trimmed = nextRaw.trim()
  if (trimmed.includes('://') || trimmed.startsWith('//')) {
    return '/'
  }

  let resolved: URL
  try {
    resolved = new URL(trimmed, requestUrl)
  } catch {
    return '/'
  }

  let base: URL
  try {
    base = new URL(requestUrl)
  } catch {
    return '/'
  }

  if (resolved.origin !== base.origin) {
    return '/'
  }

  const path = resolved.pathname + resolved.search + resolved.hash
  if (!path.startsWith('/')) {
    return '/'
  }

  return path
}
