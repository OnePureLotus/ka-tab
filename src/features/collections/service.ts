import { mapToTabGroupColor } from '@/shared/color/tab-group-mapper'
import { hashContentSync } from '@/shared/utils/hash'
import { nanoid } from 'nanoid'
import type { Collection, Site, TabGroupColor } from './types'
import { getFaviconUrl, isValidUrl } from './utils'

export class SiteUpdateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SiteUpdateError'
  }
}

export interface UpdateSitePatch {
  url: string
  title: string
  favicon?: string
}

export function createCollection(name: string, color: string, boardId: string): Collection {
  const now = Date.now()
  const id = nanoid()
  const sites: Site[] = []
  const tabGroupColor = mapToTabGroupColor(color)
  const hash = hashContentSync({ name, color, sites })

  return { id, boardId, name, color, tabGroupColor, sites, createdAt: now, updatedAt: now, hash }
}

export function addSiteToCollection(
  collection: Collection,
  site: Omit<Site, 'id' | 'addedAt'>,
): Collection {
  const newSite: Site = { ...site, id: nanoid(), addedAt: Date.now() }
  const sites = [...collection.sites, newSite]
  const updatedAt = Date.now()
  const hash = hashContentSync({ name: collection.name, color: collection.color, sites })

  return { ...collection, sites, updatedAt, hash }
}

export function removeSiteFromCollection(collection: Collection, siteId: string): Collection {
  const sites = collection.sites.filter((s) => s.id !== siteId)
  const updatedAt = Date.now()
  const hash = hashContentSync({ name: collection.name, color: collection.color, sites })

  return { ...collection, sites, updatedAt, hash }
}

export function updateSiteInCollection(
  collection: Collection,
  siteId: string,
  patch: UpdateSitePatch,
): Collection {
  const index = collection.sites.findIndex((s) => s.id === siteId)
  if (index === -1) throw new SiteUpdateError('Site not found')

  const rawUrl = patch.url.trim()
  if (!rawUrl) throw new SiteUpdateError('URL is required')
  if (!isValidUrl(rawUrl)) throw new SiteUpdateError('Invalid URL')

  const isDuplicate = collection.sites.some((s) => s.id !== siteId && s.url === rawUrl)
  if (isDuplicate) throw new SiteUpdateError('Duplicate URL')

  const existing = collection.sites[index]!
  const favicon =
    patch.favicon ?? (existing.url !== rawUrl ? getFaviconUrl(rawUrl) : existing.favicon)

  const sites = [...collection.sites]
  sites[index] = {
    ...existing,
    url: rawUrl,
    title: patch.title.trim() || rawUrl,
    favicon,
  }

  const updatedAt = Date.now()
  const hash = hashContentSync({ name: collection.name, color: collection.color, sites })
  return { ...collection, sites, updatedAt, hash }
}

export function reorderSitesInCollection(
  collection: Collection,
  fromIndex: number,
  toIndex: number,
): Collection {
  const sites = [...collection.sites]
  const [moved] = sites.splice(fromIndex, 1)
  if (moved) sites.splice(toIndex, 0, moved)
  const updatedAt = Date.now()
  const hash = hashContentSync({ name: collection.name, color: collection.color, sites })
  return { ...collection, sites, updatedAt, hash }
}

export function reorderSitesById(
  collection: Collection,
  fromSiteId: string,
  toSiteId: string,
): Collection {
  const fromIndex = collection.sites.findIndex((s) => s.id === fromSiteId)
  const toIndex = collection.sites.findIndex((s) => s.id === toSiteId)
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return collection
  return reorderSitesInCollection(collection, fromIndex, toIndex)
}

export function renameCollection(collection: Collection, name: string): Collection {
  const updatedAt = Date.now()
  const hash = hashContentSync({ name, color: collection.color, sites: collection.sites })

  return { ...collection, name, updatedAt, hash }
}

export function updateCollectionColor(
  collection: Collection,
  color: string,
  tabGroupColor?: TabGroupColor,
): Collection {
  const resolvedTabGroupColor = tabGroupColor ?? mapToTabGroupColor(color)
  const updatedAt = Date.now()
  const hash = hashContentSync({ name: collection.name, color, sites: collection.sites })
  return { ...collection, color, tabGroupColor: resolvedTabGroupColor, updatedAt, hash }
}

export function reorderCollections(
  collections: Collection[],
  fromIndex: number,
  toIndex: number,
): Collection[] {
  const arr = [...collections]
  const [moved] = arr.splice(fromIndex, 1)
  if (moved) arr.splice(toIndex, 0, moved)
  return arr
}

export interface SiteLimitStatus {
  ok: boolean
  count: number
  atLimit: boolean
  nearLimit: boolean
}

const SITE_LIMIT = 30
const NEAR_LIMIT_THRESHOLD = 25

export function validateSiteLimit(collection: Collection): SiteLimitStatus {
  const count = collection.sites.length
  const atLimit = count >= SITE_LIMIT
  const nearLimit = count >= NEAR_LIMIT_THRESHOLD
  return { ok: !atLimit, count, atLimit, nearLimit }
}
