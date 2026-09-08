import { resolveConflict } from '@/features/sync/conflict-resolver'
import { getWebDavConfig, setWebDavConfig } from '@/features/sync/webdav-config'
import { testWebDavConnection } from '@/features/sync/webdav/client'
import {
  getSyncRuntimeStatus,
  pull,
  push,
  resolveConflictAndPush,
  syncNow,
} from '@/features/sync/webdav/engine'
import type { WebDavConfig } from '@/features/sync/webdav/types'
import type { MessageType, SyncResolveConflictPayload } from '@/shared/messaging/types'
import { getSyncMeta } from '@/shared/storage/client'

export function registerSyncHandlers(
  message: { type: MessageType; payload: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  switch (message.type) {
    case 'SYNC_RESOLVE_CONFLICT': {
      const payload = message.payload as SyncResolveConflictPayload
      handleResolveConflict(payload)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => {
          console.error('[KaTab SW] SYNC_RESOLVE_CONFLICT failed', err)
          sendResponse({
            ok: false,
            error: { type: 'UNKNOWN', message: String(err), context: err },
          })
        })
      return true
    }
    case 'SYNC_PUSH': {
      push()
        .then(sendResponse)
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }
    case 'SYNC_PULL': {
      pull()
        .then(sendResponse)
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }
    case 'SYNC_NOW': {
      syncNow()
        .then(sendResponse)
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }
    case 'SYNC_STATUS_GET': {
      getSyncMeta()
        .then((meta) =>
          sendResponse({
            ok: true,
            data: { meta, runtime: getSyncRuntimeStatus() },
          }),
        )
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }
    case 'WEBDAV_TEST_CONNECTION': {
      const config = message.payload as WebDavConfig
      testWebDavConnection(config)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }
    case 'WEBDAV_SAVE_CONFIG': {
      const config = message.payload as WebDavConfig
      setWebDavConfig(config)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }
    case 'WEBDAV_GET_CONFIG': {
      getWebDavConfig()
        .then((config) => sendResponse({ ok: true, data: config }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }
    default:
      return false
  }
}

async function handleResolveConflict(payload: SyncResolveConflictPayload): Promise<void> {
  const meta = await getSyncMeta()
  if (!meta) return

  const conflict = meta.pendingConflicts.find((c) => c.key === payload.key)
  if (!conflict) return

  resolveConflict(conflict, payload.choice)
  await resolveConflictAndPush(payload.key, payload.choice, conflict)
}
