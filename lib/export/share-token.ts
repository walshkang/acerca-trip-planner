import { createHmac, timingSafeEqual } from 'crypto'

function getSecret(): string {
  const secret = process.env.EXPORT_SHARE_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('EXPORT_SHARE_SECRET environment variable must be set in production')
  }
  return 'insecure-dev-only-secret'
}

/**
 * Sign a share token for a list.
 *
 * Token format: base64url(listId:userId) + '.' + HMAC-SHA256(secret, listId:userId)
 */
export function signShareToken(listId: string, userId: string): string {
  const secret = getSecret()
  const data = `${listId}:${userId}`
  const payload = Buffer.from(data).toString('base64url')
  const sig = createHmac('sha256', secret).update(data).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * Verify a share token and extract the listId + userId.
 * Returns null if the token is invalid or tampered with.
 */
export function verifyShareToken(
  token: string
): { listId: string; userId: string } | null {
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) return null

  const payload = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)

  const decoded = Buffer.from(payload, 'base64url').toString('utf8')
  const colonIdx = decoded.indexOf(':')
  if (colonIdx === -1) return null

  const listId = decoded.slice(0, colonIdx)
  const userId = decoded.slice(colonIdx + 1)
  if (!listId || !userId) return null

  const secret = getSecret()
  const expectedSig = createHmac('sha256', secret)
    .update(`${listId}:${userId}`)
    .digest('base64url')

  try {
    const sigBuf = Buffer.from(sig, 'base64url')
    const expectedBuf = Buffer.from(expectedSig, 'base64url')
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }

  return { listId, userId }
}
