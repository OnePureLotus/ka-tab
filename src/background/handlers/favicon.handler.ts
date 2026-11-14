import {
  isFaviconManualBackfillRunning,
  kickFaviconBackfill,
  runFaviconBackfillBatch,
  runFaviconBackfillManualAll,
} from '@/background/favicon-backfill.service'
import {
  clearFaviconCache,
  getFaviconCacheStats,
  listSitesNeedingFaviconFromStorage,
} from '@/features/favicon/cache'
import { MessageType } from '@/shared/messaging/types'

import { EXTENSION_VERSION } from '@/shared/constants'
import { katabLog } from '@/shared/debug/file-logger'

export const FAVICON_BUILD_ID = `favicon-backfill-${EXTENSION_VERSION}`

export function registerFaviconHandlers(
  message: { type: MessageType | string; payload?: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  switch (message.type) {
    case 'FAVICON_BACKFILL_MANUAL_ALL': {
      if (isFaviconManualBackfillRunning()) {
        sendResponse({ ok: false, error: 'FAVICON_MANUAL_ALREADY_RUNNING' })
        return true
      }
      sendResponse({ ok: true, started: true, buildId: FAVICON_BUILD_ID })
      void runFaviconBackfillManualAll()
        .then((result) => {
          katabLog.info('KaTab Favicon', 'manual backfill notifying UI', result)
          void chrome.runtime
            .sendMessage({
              type: MessageType.FAVICON_BACKFILL_MANUAL_DONE,
              payload: { ok: true, buildId: FAVICON_BUILD_ID, ...result },
            })
            .catch(() => undefined)
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err)
          katabLog.error('KaTab Favicon', 'manual backfill failed', err)
          void chrome.runtime
            .sendMessage({
              type: MessageType.FAVICON_BACKFILL_MANUAL_DONE,
              payload: { ok: false, buildId: FAVICON_BUILD_ID, error: message },
            })
            .catch(() => undefined)
        })
      return false
    }
    case 'FAVICON_BACKFILL_KICK': {
      kickFaviconBackfill()
      void Promise.all([getFaviconCacheStats(), listSitesNeedingFaviconFromStorage()])
        .then(([stats, pending]) => {
          katabLog.info('KaTab Favicon', 'kick status', {
            buildId: FAVICON_BUILD_ID,
            cacheCount: stats.count,
            pendingCount: pending.length,
            cacheBytes: stats.bytes,
          })
          sendResponse({
            ok: true,
            buildId: FAVICON_BUILD_ID,
            cacheCount: stats.count,
            pendingCount: pending.length,
            cacheBytes: stats.bytes,
          })
        })
        .catch((err) => {
          katabLog.error('KaTab Favicon', 'kick status failed', err)
          sendResponse({ ok: true, buildId: FAVICON_BUILD_ID, error: String(err) })
        })
      return true
    }
    case 'FAVICON_STATUS_GET': {
      void Promise.all([getFaviconCacheStats(), listSitesNeedingFaviconFromStorage()])
        .then(([stats, pending]) => {
          sendResponse({
            ok: true,
            buildId: FAVICON_BUILD_ID,
            cacheCount: stats.count,
            pendingCount: pending.length,
            cacheBytes: stats.bytes,
          })
        })
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }
    case 'FAVICON_CACHE_CLEAR': {
      void clearFaviconCache()
        .then((removed) => {
          void chrome.runtime
            .sendMessage({ type: 'FAVICON_CACHE_CLEARED' })
            .catch(() => undefined)
          setTimeout(() => runFaviconBackfillBatch(), 800)
          katabLog.info('KaTab Favicon', 'cache clear done, kick', removed)
          sendResponse({ ok: true, removedKeys: removed })
        })
        .catch((err) => {
          katabLog.error('KaTab Favicon', 'cache clear failed', err)
          sendResponse({ ok: false, error: String(err) })
        })
      return true
    }
    default:
      return false
  }
}