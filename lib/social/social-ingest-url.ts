/**
 * Fast client/server check aligned with {@link fetchContent} platform rules.
 */

export type SocialIngestUrlPrecheck =
  | { ok: true }
  | { ok: false; code: 'invalid_url' | 'platform_not_supported' }

export function precheckSocialIngestUrl(url: string): SocialIngestUrlPrecheck {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()

    const unsupportedDomains = ['tiktok.com', 'instagram.com', 'reddit.com']
    for (const domain of unsupportedDomains) {
      if (host === domain || host.endsWith(`.${domain}`)) {
        return { ok: false, code: 'platform_not_supported' }
      }
    }

    return { ok: true }
  } catch {
    return { ok: false, code: 'invalid_url' }
  }
}
