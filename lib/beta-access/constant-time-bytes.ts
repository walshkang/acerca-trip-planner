/**
 * Constant-time equality for equal-length byte arrays (Node Edge lacks
 * `crypto.subtle.timingSafeEqual` in some environments).
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false
  let diff = 0
  for (let i = 0; i < a.byteLength; i++) {
    diff |= a[i]! ^ b[i]!
  }
  return diff === 0
}
