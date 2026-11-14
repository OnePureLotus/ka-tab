import type { FaviconCacheEntry } from '@/features/favicon/types'
import { STORAGE_KEYS } from '@/shared/storage/client'
import { forwardKatabLog } from '@/shared/debug/forward-log'
import { showToast } from '@/shared/toast'
import { getChromeLocalValue, wxtKeyToChromeLocalKey } from '@/shared/utils/chrome-storage-key'
import { normalizeSiteUrl } from '@/shared/utils/site-url'
import { onCleanup, onMount } from 'solid-js'
import { createStore } from 'solid-js/store'

interface FaviconCacheState {
  byUrl: Record<string, string>
  loaded: boolean
  /** Bumped on every cache merge so list rows re-render (dynamic store keys are easy to miss). */
  revision: number
}

const [faviconCacheStore, setFaviconCacheStore] = createStore<FaviconCacheState>({
  byUrl: {},
  loaded: false,
  revision: 0,
})

let reloadDebounce: ReturnType<typeof setTimeout> | undefined

export { faviconCacheStore }

export function getCachedFaviconDataUrl(pageUrl: string): string | undefined {
  return faviconCacheStore.byUrl[normalizeSiteUrl(pageUrl)]
}

export function resetFaviconCacheStore(): void {
  setFaviconCacheStore({
    byUrl: {},
    loaded: true,
    revision: faviconCacheStore.revision + 1,
  })
}

function scheduleReloadFromStorage(): void {
  if (reloadDebounce != null) clearTimeout(reloadDebounce)
  reloadDebounce = setTimeout(() => {
    reloadDebounce = undefined
    void loadAllCachedFavicons()
  }, 250)
}

async function loadAllCachedFavicons(): Promise<void> {
  const indexKey = STORAGE_KEYS.FAVICON_CACHE_INDEX
  const index = (await getChromeLocalValue<string[]>(indexKey)) ?? []
  const prevKeys = new Set(Object.keys(faviconCacheStore.byUrl))
  if (index.length === 0) {
    setFaviconCacheStore({
      byUrl: {},
      loaded: true,
      revision: faviconCacheStore.revision + 1,
    })
    return
  }
  const bareKeys = index.map((k) => wxtKeyToChromeLocalKey(k))
  const legacy = index.filter((k) => k.startsWith('local:'))
  const rows = await chrome.storage.local.get([...bareKeys, ...legacy])
  const byUrl: Record<string, string> = {}
  for (const wxtKey of index) {
    const bare = wxtKeyToChromeLocalKey(wxtKey)
    const entry = (rows[bare] ?? rows[wxtKey]) as FaviconCacheEntry | undefined
    if (!entry?.dataUrl) continue
    byUrl[normalizeSiteUrl(entry.siteUrl)] = entry.dataUrl
  }
  const newKeys = Object.keys(byUrl).filter((k) => !prevKeys.has(k))
  setFaviconCacheStore({
    byUrl,
    loaded: true,
    revision: faviconCacheStore.revision + 1,
  })
  forwardKatabLog('info', 'KaTab Favicon UI', 'loaded cache entries', Object.keys(byUrl).length)
  if (newKeys.length === 1) {
    showToast('已更新 1 个网站图标', { type: 'success' })
  } else if (newKeys.length > 1) {
    showToast(`已更新 ${newKeys.length} 个网站图标`, { type: 'success' })
  }
}

function applyCacheEntry(entry: FaviconCacheEntry): void {
  if (!entry.siteUrl || !entry.dataUrl) return
  const key = normalizeSiteUrl(entry.siteUrl)
  const had = key in faviconCacheStore.byUrl
  setFaviconCacheStore('byUrl', key, entry.dataUrl)
  setFaviconCacheStore('revision', (r) => r + 1)
  if (!had) {
    const label = entry.title?.trim() || entry.siteUrl
    showToast(`已获取「${label}」的图标`, { type: 'success' })
  }
}

function subscribeFaviconCacheStorage(): () => void {
  const handler: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
    changes,
    area,
  ) => {
    if (area !== 'local') return
    for (const [key, change] of Object.entries(changes)) {
      if (!key.includes('favicon-cache') || key.endsWith(':index')) continue
      const entry = change.newValue as FaviconCacheEntry | undefined
      if (!entry?.siteUrl || !entry.dataUrl) continue
      applyCacheEntry(entry)
    }
    const indexBare = wxtKeyToChromeLocalKey(STORAGE_KEYS.FAVICON_CACHE_INDEX)
    if (changes[STORAGE_KEYS.FAVICON_CACHE_INDEX] || changes[indexBare]) {
      const entryKeys = Object.keys(changes).filter(
        (k) => k.includes('favicon-cache') && !k.endsWith(':index'),
      )
      if (entryKeys.length === 0) scheduleReloadFromStorage()
    }
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}

export function useFaviconCacheSync(): void {
  onMount(() => {
    void loadAllCachedFavicons()
    const unwatch = subscribeFaviconCacheStorage()
    onCleanup(unwatch)
  })
}