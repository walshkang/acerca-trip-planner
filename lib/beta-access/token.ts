import { constantTimeEqual } from './constant-time-bytes'
import { BETA_KEY_DERIVATION_LABEL } from './constants'

const encoder = new TextEncoder()

export type BetaTokenVerifyResult =
  | { status: 'valid'; exp: number }
  | { status: 'missing' }
  | { status: 'invalid_sig' }
  | { status: 'expired'; exp: number }

function base64urlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function deriveSigningKey(password: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const derived = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    encoder.encode(BETA_KEY_DERIVATION_LABEL)
  )
  return crypto.subtle.importKey(
    'raw',
    derived,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

type PayloadV1 = { v: 1; exp: number }

function parsePayload(json: string): PayloadV1 | null {
  try {
    const o = JSON.parse(json) as unknown
    if (typeof o !== 'object' || o === null) return null
    const rec = o as Record<string, unknown>
    if (rec.v !== 1) return null
    if (typeof rec.exp !== 'number' || !Number.isFinite(rec.exp)) return null
    return { v: 1, exp: rec.exp }
  } catch {
    return null
  }
}

export async function signBetaToken(
  password: string,
  nowSec: number,
  ttlSec: number
): Promise<{ token: string; exp: number; maxAgeSec: number }> {
  const exp = nowSec + ttlSec
  const payloadJson = JSON.stringify({ v: 1, exp } satisfies PayloadV1)
  const payloadBytes = encoder.encode(payloadJson)
  const payloadB64 = base64urlEncode(payloadBytes)

  const key = await deriveSigningKey(password)
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
  const sigB64 = base64urlEncode(new Uint8Array(sig))
  return { token: `${payloadB64}.${sigB64}`, exp, maxAgeSec: ttlSec }
}

export async function verifyBetaToken(
  password: string,
  cookieValue: string | undefined,
  nowSec: number
): Promise<BetaTokenVerifyResult> {
  if (!cookieValue?.trim()) {
    return { status: 'missing' }
  }

  const parts = cookieValue.split('.')
  if (parts.length !== 2) {
    return { status: 'invalid_sig' }
  }

  const [payloadB64, sigB64] = parts
  if (!payloadB64 || !sigB64) {
    return { status: 'invalid_sig' }
  }

  let payloadBytes: Uint8Array
  let sigBytes: Uint8Array
  try {
    payloadBytes = base64urlDecode(payloadB64)
    sigBytes = base64urlDecode(sigB64)
  } catch {
    return { status: 'invalid_sig' }
  }

  const payloadJson = new TextDecoder().decode(payloadBytes)
  const payload = parsePayload(payloadJson)
  if (!payload) {
    return { status: 'invalid_sig' }
  }

  const key = await deriveSigningKey(password)
  let expectedSig: Uint8Array
  try {
    expectedSig = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
    )
  } catch {
    return { status: 'invalid_sig' }
  }

  if (sigBytes.byteLength !== expectedSig.byteLength) {
    return { status: 'invalid_sig' }
  }

  if (!constantTimeEqual(sigBytes, expectedSig)) {
    return { status: 'invalid_sig' }
  }

  if (payload.exp <= nowSec) {
    return { status: 'expired', exp: payload.exp }
  }

  return { status: 'valid', exp: payload.exp }
}
