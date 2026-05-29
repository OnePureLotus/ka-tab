import type { Result } from '@/shared/messaging/types'
import type { MessageType, CollectionOpenPayload } from '@/shared/messaging/types'
import { getCollection, getAllCollections } from '@/shared/storage/client'
import { openCollectionAsTabGroup, openCollectionInNewWindow } from '@/background/tab-group.service'

export function registerCollectionHandlers(
  message: { type: MessageType; payload: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  switch (message.type) {
    case 'COLLECTION_OPEN': {
      const payload = message.payload as CollectionOpenPayload
      handleOpenCollection(payload)
        .then(sendResponse)
        .catch((err) => {
          console.error('[KaTab SW] COLLECTION_OPEN failed', err)
          sendResponse({
            ok: false,
            error: { type: 'UNKNOWN', message: String(err), context: err },
          })
        })
      return true
    }
    case 'COLLECTIONS_GET_ALL': {
      getAllCollections()
        .then((collections) => sendResponse({ ok: true, data: { collections } }))
        .catch((err) => {
          console.error('[KaTab SW] COLLECTIONS_GET_ALL failed', err)
          sendResponse({ ok: false, error: { type: 'UNKNOWN', message: String(err) } })
        })
      return true
    }
    default:
      return false
  }
}

async function handleOpenCollection(payload: CollectionOpenPayload): Promise<Result<void>> {
  const collection = await getCollection(payload.collectionId)
  if (!collection) {
    return {
      ok: false,
      error: { type: 'VALIDATION_ERROR', message: `Collection ${payload.collectionId} not found` },
    }
  }

  try {
    if (payload.mode === 'new-window') {
      await openCollectionInNewWindow(collection)
    } else {
      await openCollectionAsTabGroup(collection)
    }
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[KaTab SW] Failed to open collection', { payload, err })
    return { ok: false, error: { type: 'TAB_OPEN_FAILED', message: String(err), context: err } }
  }
}
