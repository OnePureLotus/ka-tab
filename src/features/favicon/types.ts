export interface FaviconCacheEntry {
  siteUrl: string
  dataUrl: string
  fetchedAt: number
  title?: string
}

export interface PendingFaviconFetch {
  siteUrl: string
  title: string
  attempts: number
}