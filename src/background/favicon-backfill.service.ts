import {
  getFaviconCacheEntry,
  listSitesNeedingFaviconFromStorage,
  migrateFaviconCacheStorageKeys,
  rebuildFaviconCacheIndex,
  saveFaviconCacheEntry,
} from '@/features/favicon/cache'
import type { PendingFaviconFetch } from '@/features/favicon/types'
import { fetchFaviconAsDataUrl, getFaviconFetchCandidates } from '@/features/favicon/utils'
import { remainingFaviconFetchQuota, tryConsumeFaviconFetchSlot } from '@/background/favicon-rate-limit'
import {
  FAVICON_ALARM_PERIOD_MINUTES,
  FAVICON_FETCH_BATCH_SIZE,
  FAVICON_RATE_WINDOW_MS,
} from '@/shared/constants'
import { katabLog } from '@/shared/debug/file-logger'
import { normalizeSiteUrl } from '@/shared/utils/site-url'

const ALARM_FAVICON = 'katab-favicon-backfill'
const MAX_FETCH_ATTEMPTS = 3

let queue: PendingFaviconFetch[] = []
let scanning = false

function queuedUrls(): Set<string> {
  return new Set(queue.map((item) => normalizeSiteUrl(item.siteUrl)))
}

async function refreshQueueFromStorage(): Promise<void> {
  if (scanning) return
  scanning = true
  try {
    const pending = await listSitesNeedingFaviconFromStorage()
    const inQueue = queuedUrls()
    for (const item of pending) {
      const canonical = normalizeSiteUrl(item.siteUrl)
      if (inQueue.has(canonical)) continue
      queue.push({ ...item, attempts: 0 })
      inQueue.add(canonical)
    }
    katabLog.info('KaTab Favicon', 'queue size after scan', queue.length)
  } finally {
    scanning = false
  }
}

async function processNextInQueue(): Promise<boolean> {
  if (queue.length === 0) {
    await refreshQueueFromStorage()
    if (queue.length === 0) return false
  }

  const next = queue.shift()
  if (!next) return false

  const cached = await getFaviconCacheEntry(next.siteUrl)
  if (cached?.dataUrl) {
    katabLog.debug('KaTab Favicon', 'skip, already cached', normalizeSiteUrl(next.siteUrl))
    return true
  }

  if (!tryConsumeFaviconFetchSlot()) {
    queue.unshift(next)
    katabLog.info(
      'KaTab Favicon',
      'rate limit',
      `${FAVICON_FETCH_BATCH_SIZE}/${FAVICON_RATE_WINDOW_MS / 1000}s`,
      'quota left',
      remainingFaviconFetchQuota(),
    )
    return false
  }

  const candidates = getFaviconFetchCandidates(next.siteUrl)
  const dataUrl = await fetchFaviconAsDataUrl(candidates)
  if (dataUrl) {
    await saveFaviconCacheEntry(next.siteUrl, dataUrl, next.title)
    return true
  }

  next.attempts += 1
  if (next.attempts < MAX_FETCH_ATTEMPTS) {
    katabLog.warn(
      'KaTab Favicon',
      'fetch failed, retry',
      normalizeSiteUrl(next.siteUrl),
      `${next.attempts}/${MAX_FETCH_ATTEMPTS}`,
    )
    queue.push(next)
  } else {
    katabLog.error('KaTab Favicon', 'giving up after retries', normalizeSiteUrl(next.siteUrl))
  }
  return true
}

async function drainFaviconQueue(maxItems: number): Promise<void> {
  let processed = 0
  while (processed < maxItems) {
    const didWork = await processNextInQueue()
    if (!didWork) break
    processed += 1
  }
  if (processed > 0) {
    katabLog.info(
      'KaTab Favicon',
      'batch processed',
      processed,
      'remaining queue',
      queue.length,
      'quota left',
      remainingFaviconFetchQuota(),
    )
  }
}

/** Up to N queue steps per wake; actual HTTP fetches capped by rolling window. */
export function runFaviconBackfillBatch(maxSteps = FAVICON_FETCH_BATCH_SIZE): void {
  void refreshQueueFromStorage()
    .then(() => drainFaviconQueue(maxSteps))
    .catch((err) => katabLog.error('KaTab Favicon', 'batch failed', err))
}

function onStorageChanged(
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
): void {
  if (area !== 'local') return
  const collectionTouched =
    Object.keys(changes).some((key) => key.includes('katab:collection:')) ||
    Object.keys(changes).some((key) => key.includes('katab:collections:index'))
  const faviconTouched = Object.keys(changes).some((key) => key.includes('favicon-cache'))
  if (collectionTouched) {
    void refreshQueueFromStorage()
  }
}

/** Refresh pending queue only (no network). Newtab kick uses this for status. */
export function kickFaviconBackfill(): void {
  void refreshQueueFromStorage().catch((err) =>
    katabLog.error('KaTab Favicon', 'kick failed', err),
  )
}

export function initFaviconBackfill(): void {
  katabLog.info('KaTab Favicon', 'backfill service starting')
  void migrateFaviconCacheStorageKeys().then(() => rebuildFaviconCacheIndex())
  runFaviconBackfillBatch()

  void chrome.alarms.clear(ALARM_FAVICON).then(() => {
    chrome.alarms.create(ALARM_FAVICON, { periodInMinutes: FAVICON_ALARM_PERIOD_MINUTES })
  })

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== ALARM_FAVICON) return
    runFaviconBackfillBatch()
  })

  chrome.runtime.onStartup?.addListener(() => {
    runFaviconBackfillBatch()
  })

  chrome.storage.onChanged.addListener(onStorageChanged)
}