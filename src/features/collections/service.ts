import { nanoid } from 'nanoid'
import { hashContentSync } from '@/shared/utils/hash'
import { mapToTabGroupColor } from '@/shared/color/tab-group-mapper'
import type { Collection, Site, TabGroupColor } from './types'

export function createCollection(name: string, color: string): Collection {
  const now = Date.now()
  const id = nanoid()
  const sites: Site[] = []
  const tabGroupColor = mapToTabGroupColor(color)
  const hash = hashContentSync({ name, color, sites })

  return { id, name, color, tabGroupColor, sites, createdAt: now, updatedAt: now, hash }
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
