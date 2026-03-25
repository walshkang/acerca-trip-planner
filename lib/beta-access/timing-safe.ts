import { constantTimeEqual } from './constant-time-bytes'

const encoder = new TextEncoder()

/** Public pepper for HMAC(password) comparisons — not the beta password. */
const PASSWORD_COMPARE_KEY = 'acerca-beta-pw-compare-v1'

async function hmacSha256OfMessage(message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(PASSWORD_COMPARE_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return new Uint8Array(sig)
}

/**
 * Constant-time password equality via fixed-length HMAC digests and
 * crypto.subtle.timingSafeEqual (do not use === on secret strings).
 */
export async function compareBetaPassword(
  provided: string,
  expected: string
): Promise<boolean> {
  const [a, b] = await Promise.all([
    hmacSha256OfMessage(provided),
    hmacSha256OfMessage(expected),
  ])
  return constantTimeEqual(a, b)
}
