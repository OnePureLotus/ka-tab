import { getFaviconUrl } from '@/features/collections/utils'
import { hashContentSync } from '@/shared/utils/hash'
import { normalizeSiteUrl } from '@/shared/utils/site-url'

const INVALID_FAVICON_PROTOCOL =
  /^(chrome|chrome-extension|about|data|blob|javascript|file):/i

const MAX_FAVICON_BYTES = 32 * 1024

/** True when the stored favicon should be replaced by a fetched/cached icon. */
export function isPlaceholderFaviconUrl(favicon: string): boolean {
  return favicon.includes('google.com/s2/favicons')
}

export function isWeakFaviconUrl(favicon: string): boolean {
  const trimmed = favicon.trim()
  if (!trimmed || trimmed.startsWith('//')) return true
  if (INVALID_FAVICON_PROTOCOL.test(trimmed)) return true
  if (isPlaceholderFaviconUrl(trimmed)) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol !== 'http:' && parsed.protocol !== 'https:'
  } catch {
    return true
  }
}

export function resolveStoredFaviconUrl(storedFavicon: string, pageUrl: string): string {
  const trimmed = storedFavicon.trim()
  // Google placeholder — wait for favicon cache; show letter avatar instead of the same tiny icon.
  if (isPlaceholderFaviconUrl(trimmed)) return ''
  return isWeakFaviconUrl(trimmed) ? getFaviconUrl(pageUrl) : trimmed
}

export function faviconCacheStorageKey(siteUrl: string): `local:${string}` {
  const normalized = normalizeSiteUrl(siteUrl)
  return `local:katab:favicon-cache:${hashContentSync(normalized)}` as const
}

export function getFaviconFetchCandidates(siteUrl: string): string[] {
  const candidates: string[] = []
  const google = getFaviconUrl(siteUrl)
  if (google) candidates.push(google)
  try {
    const host = new URL(siteUrl).hostname
    candidates.push(`https://icons.duckduckgo.com/ip3/${host}.ico`)
    candidates.push(`https://${host}/favicon.ico`)
  } catch {
    // ignore invalid URLs
  }
  return candidates
}

export async function fetchFaviconAsDataUrl(candidates: string[]): Promise<string | null> {
  for (const url of candidates) {
    try {
      const response = await fetch(url, { redirect: 'follow' })
      if (!response.ok) continue
      const blob = await response.blob()
      if (blob.size === 0 || blob.size > MAX_FAVICON_BYTES) continue
      const type = blob.type || 'image/png'
      if (!type.startsWith('image/')) continue
      const dataUrl = await blobToDataUrl(blob)
      return dataUrl
    } catch (err) {
      console.debug('[KaTab Favicon] fetch candidate failed', url, err)
    }
  }
  return null
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read favicon blob'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
    reader.readAsDataURL(blob)
  })
}

export function siteNeedsFaviconBackfill(alreadyCached: boolean): boolean {
  return !alreadyCached
}