/**
 * Extracts a YouTube video ID from common URL formats.
 * Returns null for non-YouTube URLs or unrecognized formats.
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null
    }

    if (host === 'youtube.com') {
      // /watch?v=ID
      const v = parsed.searchParams.get('v')
      if (v) return v

      // /shorts/ID or /embed/ID or /v/ID
      const match = parsed.pathname.match(/\/(?:shorts|embed|v)\/([^/?#]+)/)
      if (match?.[1]) return match[1]
    }

    return null
  } catch {
    return null
  }
}

export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}
