import {
  getFaviconCacheEntry,
  getFaviconCacheStats,
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
  FAVICON_FETCH_CONCURRENCY,
  FAVICON_RATE_WINDOW_MS,
} from '@/shared/constants'
import { katabLog } from '@/shared/debug/file-logger'
import { normalizeSiteUrl } from '@/shared/utils/site-url'

const ALARM_FAVICON = 'katab-favicon-backfill'
const MAX_FETCH_ATTEMPTS = 3

let queue: PendingFaviconFetch[] = []
let scanning = false
let queueSerial: Promise<void> = Promise.resolve()
let manualBackfillActive = false
/** URLs skipped for the rest of the current manual run after 3 failed attempts. */
let manualSessionSkipUrls: Set<string> | null = null

export type FaviconManualBackfillResult = {
  steps: number
  cacheCount: number
  pendingCount: number
  cacheBytes: number
}

type ProcessQueueOptions = { ignoreRateLimit?: boolean }
type ItemProcessResult = 'done' | 'retry' | 'rate_limited'

function queuedUrls(): Set<string> {
  return new Set(queue.map((item) => normalizeSiteUrl(item.siteUrl)))
}

function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const task = queueSerial.then(fn, fn)
  queueSerial = task.then(
    () => undefined,
    () => undefined,
  )
  return task
}

export function isFaviconManualBackfillRunning(): boolean {
  return manualBackfillActive
}

async function mergePendingIntoQueue(): Promise<void> {
  if (scanning) return
  scanning = true
  try {
    const pending = await listSitesNeedingFaviconFromStorage()
    const inQueue = queuedUrls()
    for (const item of pending) {
      const canonical = normalizeSiteUrl(item.siteUrl)
      if (inQueue.has(canonical)) continue
      if (manualSessionSkipUrls?.has(canonical)) continue
      queue.push({ ...item, attempts: 0 })
      inQueue.add(canonical)
    }
    katabLog.info('KaTab Favicon', 'queue size after scan', queue.length)
  } finally {
    scanning = false
  }
}

async function refreshQueueFromStorage(): Promise<void> {
  await runSerialized(() => mergePendingIntoQueue())
}

async function requeuePending(item: PendingFaviconFetch, toFront = false): Promise<void> {
  await runSerialized(async () => {
    if (toFront) queue.unshift(item)
    else queue.push(item)
  })
}

async function popBatchFromQueue(max: number): Promise<PendingFaviconFetch[]> {
  return runSerialized(async () => {
    if (queue.length === 0) await mergePendingIntoQueue()
    const n = Math.min(max, queue.length)
    return queue.splice(0, n)
  })
}

async function processPendingItem(
  item: PendingFaviconFetch,
  options: ProcessQueueOptions,
): Promise<ItemProcessResult> {
  const canonical = normalizeSiteUrl(item.siteUrl)
  const cached = await getFaviconCacheEntry(item.siteUrl)
  if (cached?.dataUrl) {
    katabLog.debug('KaTab Favicon', 'skip, already cached', canonical)
    return 'done'
  }

  if (!options.ignoreRateLimit && !tryConsumeFaviconFetchSlot()) {
    await requeuePending(item, true)
    katabLog.info(
      'KaTab Favicon',
      'rate limit',
      `${FAVICON_FETCH_BATCH_SIZE}/${FAVICON_RATE_WINDOW_MS / 1000}s`,
      'quota left',
      remainingFaviconFetchQuota(),
    )
    return 'rate_limited'
  }

  const candidates = getFaviconFetchCandidates(item.siteUrl)
  const dataUrl = await fetchFaviconAsDataUrl(candidates)
  if (dataUrl) {
    await saveFaviconCacheEntry(item.siteUrl, dataUrl, item.title)
    return 'done'
  }

  item.attempts += 1
  if (item.attempts < MAX_FETCH_ATTEMPTS) {
    katabLog.warn(
      'KaTab Favicon',
      'fetch failed, retry',
      canonical,
      `${item.attempts}/${MAX_FETCH_ATTEMPTS}`,
    )
    await requeuePending(item)
    return 'retry'
  }

  katabLog.error('KaTab Favicon', 'giving up after retries', canonical)
  if (options.ignoreRateLimit && manualSessionSkipUrls) {
    manualSessionSkipUrls.add(canonical)
    katabLog.info('KaTab Favicon', 'manual run skip (3 failures)', canonical)
  }
  return 'done'
}

/** Pull up to `maxItems` from queue and fetch them in parallel (capped by FAVICON_FETCH_CONCURRENCY). */
async function drainFaviconQueueConcurrent(
  maxItems: number,
  options: ProcessQueueOptions = {},
): Promise<number> {
  const waveSize = Math.min(maxItems, FAVICON_FETCH_CONCURRENCY)
  const batch = await popBatchFromQueue(waveSize)
  if (batch.length === 0) return 0

  katabLog.info(
    'KaTab Favicon',
    'concurrent wave start',
    batch.length,
    'urls',
    batch.slice(0, 3).map((i) => normalizeSiteUrl(i.siteUrl)),
  )
  const results = await Promise.all(batch.map((item) => processPendingItem(item, options)))

  if (results.some((r) => r === 'rate_limited') && !options.ignoreRateLimit) {
    katabLog.debug('KaTab Favicon', 'concurrent wave hit rate limit')
  }

  katabLog.info(
    'KaTab Favicon',
    'batch processed',
    batch.length,
    'concurrency',
    batch.length,
    'remaining queue',
    queue.length,
    'quota left',
    options.ignoreRateLimit ? 'manual' : remainingFaviconFetchQuota(),
  )
  return batch.length
}

/** Up to N queue steps per wake; actual HTTP fetches capped by rolling window. */
export function runFaviconBackfillBatch(maxSteps = FAVICON_FETCH_BATCH_SIZE): void {
  void refreshQueueFromStorage()
    .then(() => drainFaviconQueueConcurrent(maxSteps))
    .catch((err) => katabLog.error('KaTab Favicon', 'batch failed', err))
}

/** User-initiated: process entire pending queue without rate limit (parallel waves). */
export function runFaviconBackfillManualAll(): Promise<FaviconManualBackfillResult> {
  if (manualBackfillActive) {
    return Promise.reject(new Error('FAVICON_MANUAL_ALREADY_RUNNING'))
  }
  manualBackfillActive = true
  manualSessionSkipUrls = new Set()
  const run = async (): Promise<FaviconManualBackfillResult> => {
    katabLog.info(
      'KaTab Favicon',
      'manual backfill started',
      'concurrency',
      FAVICON_FETCH_CONCURRENCY,
    )
    const before = await getFaviconCacheStats()
    let steps = 0
    for (;;) {
      const processed = await drainFaviconQueueConcurrent(FAVICON_FETCH_CONCURRENCY, {
        ignoreRateLimit: true,
      })
      if (processed === 0) break
      steps += processed
    }
    const [stats, pending] = await Promise.all([
      getFaviconCacheStats(),
      listSitesNeedingFaviconFromStorage(),
    ])
    const added = Math.max(0, stats.count - before.count)
    const skipped = manualSessionSkipUrls?.size ?? 0
    katabLog.info('KaTab Favicon', 'manual backfill done', {
      steps,
      added,
      skippedThisRun: skipped,
      cacheCount: stats.count,
      pendingCount: pending.length,
    })
    return {
      steps,
      cacheCount: stats.count,
      pendingCount: pending.length,
      cacheBytes: stats.bytes,
    }
  }
  return run().finally(() => {
    manualBackfillActive = false
    manualSessionSkipUrls = null
  })
}

function onStorageChanged(
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
): void {
  if (area !== 'local') return
  const collectionTouched =
    Object.keys(changes).some((key) => key.includes('katab:collection:')) ||
    Object.keys(changes).some((key) => key.includes('katab:collections:index'))
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