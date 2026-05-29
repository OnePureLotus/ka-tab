import type { MessageType, SyncResolveConflictPayload } from '@/shared/messaging/types'
import { resolveConflict } from '@/features/sync/conflict-resolver'
import { getSyncMeta, setSyncMeta } from '@/features/sync/storage-sync'
import { storage } from '@/shared/storage/client'

export function registerSyncHandlers(
  message: { type: MessageType; payload: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  switch (message.type) {
    case 'SYNC_RESOLVE_CONFLICT': {
      const payload = message.payload as SyncResolveConflictPayload
      handleResolveConflict(payload)
        .then(sendResponse)
        .catch((err) => {
          console.error('[KaTab SW] SYNC_RESOLVE_CONFLICT failed', err)
          sendResponse({
            ok: false,
            error: { type: 'UNKNOWN', message: String(err), context: err },
          })
        })
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

  const winner = resolveConflict(conflict, payload.choice)
  await storage.setItem(payload.key as `sync:${string}` | `local:${string}`, winner)

  await setSyncMeta({
    ...meta,
    pendingConflicts: meta.pendingConflicts.filter((c) => c.key !== payload.key),
    lastSyncAt: Date.now(),
  })
}
