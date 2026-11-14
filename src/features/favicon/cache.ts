import type { Collection } from '@/features/collections/types'
import type { FaviconCacheEntry } from '@/features/favicon/types'
import { faviconCacheStorageKey, siteNeedsFaviconBackfill } from '@/features/favicon/utils'
import { getAllCollections, STORAGE_KEYS } from '@/shared/storage/client'
import {
  getChromeLocalValue,
  migrateDuplexKeyToBare,
  setChromeLocalValue,
  wxtKeyToChromeLocalKey,
} from '@/shared/utils/chrome-storage-key'
import { katabLog } from '@/shared/debug/file-logger'
import { normalizeSiteUrl } from '@/shared/utils/site-url'

let persistQueue: Promise<unknown> = Promise.resolve()

function runSerialized<T>(work: () => Promise<T>): Promise<T> {
  const next = persistQueue.then(work, work)
  persistQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

/** Repair index after parallel saves or legacy `local:` keys — index only had 1 entry while dozens of icons exist. */
/** Remove all favicon cache entries and index (collections / site records unchanged). */
export async function clearFaviconCache(): Promise<number> {
  const all = await chrome.storage.local.get(null)
  const toRemove = new Set<string>()
  const indexBare = wxtKeyToChromeLocalKey(STORAGE_KEYS.FAVICON_CACHE_INDEX)
  toRemove.add(indexBare)
  toRemove.add(STORAGE_KEYS.FAVICON_CACHE_INDEX)
  for (const key of Object.keys(all)) {
    if (!key.includes('favicon-cache')) continue
    toRemove.add(key)
  }
  const keys = [...toRemove]
  if (keys.length > 0) await chrome.storage.local.remove(keys)
  katabLog.info('KaTab Favicon', 'cleared favicon cache', keys.length, 'keys')
  return keys.length
}

export async function rebuildFaviconCacheIndex(): Promise<number> {
  const all = await chrome.storage.local.get(null)
  const wxtKeys = new Set<string>()
  for (const storageKey of Object.keys(all)) {
    if (!storageKey.includes('katab:favicon-cache:')) continue
    if (storageKey.endsWith(':index')) continue
    const val = all[storageKey] as FaviconCacheEntry | undefined
    if (!val?.dataUrl) continue
    const bare = wxtKeyToChromeLocalKey(storageKey)
    wxtKeys.add(`local:${bare}`)
  }
  const list = [...wxtKeys]
  await setChromeLocalValue(STORAGE_KEYS.FAVICON_CACHE_INDEX, list)
  katabLog.info('KaTab Favicon', 'rebuilt favicon cache index', list.length)
  return list.length
}

export async function getFaviconCacheEntry(
  siteUrl: string,
): Promise<FaviconCacheEntry | null> {
  const wxtKey = faviconCacheStorageKey(siteUrl)
  return (await getChromeLocalValue<FaviconCacheEntry>(wxtKey)) ?? null
}

export async function saveFaviconCacheEntry(
  siteUrl: string,
  dataUrl: string,
  title?: string,
): Promise<FaviconCacheEntry> {
  return runSerialized(async () => {
    const canonical = normalizeSiteUrl(siteUrl)
    const wxtKey = faviconCacheStorageKey(siteUrl)
    const indexKey = STORAGE_KEYS.FAVICON_CACHE_INDEX
    const entry: FaviconCacheEntry = {
      siteUrl: canonical,
      dataUrl,
      fetchedAt: Date.now(),
      ...(title?.trim() ? { title: title.trim() } : {}),
    }

    const index = (await getChromeLocalValue<string[]>(indexKey)) ?? []
    const nextIndex = index.includes(wxtKey) ? index : [...index, wxtKey]

    try {
      await setChromeLocalValue(wxtKey, entry)
      await setChromeLocalValue(indexKey, nextIndex)
    } catch (err) {
      katabLog.error('KaTab Favicon', 'persist failed (quota?)', canonical, err)
      throw err
    }

    katabLog.info('KaTab Favicon', 'cached', canonical, `index=${nextIndex.length}`)
    return entry
  })
}

export async function listFaviconCacheEntries(): Promise<FaviconCacheEntry[]> {
  const indexKey = STORAGE_KEYS.FAVICON_CACHE_INDEX
  const index = (await getChromeLocalValue<string[]>(indexKey)) ?? []
  if (index.length === 0) return []

  const bareKeys = index.map((k) => wxtKeyToChromeLocalKey(k))
  const legacyKeys = index.filter((k) => k.startsWith('local:'))
  const rows = await chrome.storage.local.get([...bareKeys, ...legacyKeys])
  return index
    .map((wxtKey) => {
      const bare = wxtKeyToChromeLocalKey(wxtKey)
      return (rows[bare] ?? rows[wxtKey]) as FaviconCacheEntry | undefined
    })
    .filter((v): v is FaviconCacheEntry => v != null && typeof v.dataUrl === 'string')
}

async function getAllCollectionsForBackfill(): Promise<Collection[]> {
  try {
    const cols = await getAllCollections()
    if (cols.length > 0) return cols
  } catch (err) {
    katabLog.warn('KaTab Favicon', 'getAllCollections failed', err)
  }

  const indexKey = STORAGE_KEYS.COLLECTIONS_INDEX
  const index = (await getChromeLocalValue<string[]>(indexKey)) ?? []
  if (index.length === 0) {
    katabLog.warn('KaTab Favicon', 'collections index empty')
    return []
  }
  const keys = index.map((id) => STORAGE_KEYS.COLLECTION(id))
  const bareKeys = keys.map((k) => wxtKeyToChromeLocalKey(k))
  const rows = await chrome.storage.local.get(bareKeys)
  const cols = bareKeys
    .map((key) => rows[key] as Collection | undefined)
    .filter((c): c is Collection => c != null)
  katabLog.info('KaTab Favicon', 'collections via chrome.storage.local', cols.length)
  return cols
}

export function collectSitesNeedingFavicon(
  collections: Collection[],
  isCached: (canonicalUrl: string) => boolean,
): Array<{ siteUrl: string; title: string }> {
  const seen = new Set<string>()
  const pending: Array<{ siteUrl: string; title: string }> = []

  for (const col of collections) {
    for (const site of col.sites) {
      const canonical = normalizeSiteUrl(site.url)
      if (seen.has(canonical)) continue
      seen.add(canonical)
      if (!siteNeedsFaviconBackfill(isCached(canonical))) continue
      pending.push({
        siteUrl: site.url,
        title: site.title.trim() || site.url,
      })
    }
  }
  return pending
}

export async function listSitesNeedingFaviconFromStorage(): Promise<
  Array<{ siteUrl: string; title: string }>
> {
  const [collections, cached] = await Promise.all([
    getAllCollectionsForBackfill(),
    listFaviconCacheEntries(),
  ])
  const cachedUrls = new Set(cached.map((e) => normalizeSiteUrl(e.siteUrl)))
  return collectSitesNeedingFavicon(collections, (url) => cachedUrls.has(url))
}

export async function getFaviconCacheStats(): Promise<{ count: number; bytes: number }> {
  const indexKey = STORAGE_KEYS.FAVICON_CACHE_INDEX
  const index = (await getChromeLocalValue<string[]>(indexKey)) ?? []
  const bareKeys = index.map((k) => wxtKeyToChromeLocalKey(k))
  const keys = [wxtKeyToChromeLocalKey(indexKey), ...bareKeys]
  const bytes = keys.length > 0 ? await chrome.storage.local.getBytesInUse(keys) : 0
  return { count: index.length, bytes }
}

/** One-time migration: old builds wrote `local:katab:...` keys into chrome.storage.local. */
export async function migrateFaviconCacheStorageKeys(): Promise<void> {
  const indexKey = STORAGE_KEYS.FAVICON_CACHE_INDEX
  await migrateDuplexKeyToBare(indexKey)
  const index = (await getChromeLocalValue<string[]>(indexKey)) ?? []
  for (const key of index) {
    await migrateDuplexKeyToBare(key)
  }
  const rebuilt = await rebuildFaviconCacheIndex()
  katabLog.info('KaTab Favicon', 'storage key migration checked', 'indexAfterRebuild', rebuilt)
}