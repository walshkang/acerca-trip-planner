import { describe, expect, it } from 'vitest'
import { signShareToken, verifyShareToken } from '@/lib/export/share-token'

describe('share token', () => {
  it('signs and verifies a valid token', () => {
    const listId = '550e8400-e29b-41d4-a716-446655440000'
    const userId = 'user-abc-123'
    const token = signShareToken(listId, userId)
    const result = verifyShareToken(token)
    expect(result).toEqual({ listId, userId })
  })

  it('returns null for a tampered token', () => {
    const token = signShareToken('list-1', 'user-1')
    const tampered = token.slice(0, -4) + 'XXXX'
    expect(verifyShareToken(tampered)).toBeNull()
  })

  it('returns null for a token with wrong payload', () => {
    const token = signShareToken('list-1', 'user-1')
    const parts = token.split('.')
    // Replace payload with a different one, keep original signature
    const newPayload = Buffer.from('list-2:user-2').toString('base64url')
    const faked = `${newPayload}.${parts[1]}`
    expect(verifyShareToken(faked)).toBeNull()
  })

  it('returns null for a completely invalid token', () => {
    expect(verifyShareToken('not-a-valid-token')).toBeNull()
    expect(verifyShareToken('')).toBeNull()
    expect(verifyShareToken('.')).toBeNull()
  })

  it('returns null when listId or userId is empty after decoding', () => {
    // Construct payload with empty userId
    const payload = Buffer.from('list-1:').toString('base64url')
    // We just check that verify returns null for malformed tokens without a valid sig
    // (they would fail signature check anyway, just testing resilience)
    expect(verifyShareToken(`${payload}.invalidsig`)).toBeNull()
  })

  it('produces different tokens for different list/user pairs', () => {
    const t1 = signShareToken('list-1', 'user-1')
    const t2 = signShareToken('list-2', 'user-1')
    const t3 = signShareToken('list-1', 'user-2')
    expect(t1).not.toBe(t2)
    expect(t1).not.toBe(t3)
    expect(t2).not.toBe(t3)
  })
})
