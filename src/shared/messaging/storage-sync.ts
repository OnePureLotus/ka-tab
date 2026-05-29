import { storage } from 'wxt/utils/storage'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import type { Settings } from '@/features/settings/types'

// ─── Storage change callback types ───────────────────────────────────────────

export interface StorageUpdate {
  type: 'collection' | 'collections-index' | 'note' | 'notes-index' | 'settings'
  key: string
  newValue: Collection | Note | Settings | string[] | null
  oldValue: Collection | Note | Settings | string[] | null
}

export type StorageUpdateHandler = (update: StorageUpdate) => void

const COLLECTION_KEY_PREFIX = 'sync:katab:collection:'
const NOTE_KEY_PREFIX = 'sync:katab:note:'
const COLLECTIONS_INDEX_KEY = 'sync:katab:collections:index'
const NOTES_INDEX_KEY = 'sync:katab:notes:index'
const SETTINGS_KEY = 'sync:katab:settings'

/**
 * Sets up chrome.storage.onChanged listener and translates changes into
 * typed StorageUpdate callbacks that can drive store updates.
 * Returns an unsubscribe function.
 */
export function listenStorageChanges(onUpdate: StorageUpdateHandler): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'sync') return

    for (const [key, change] of Object.entries(changes)) {
      if (key === COLLECTIONS_INDEX_KEY) {
        onUpdate({
          type: 'collections-index',
          key,
          newValue: (change.newValue as string[]) ?? null,
          oldValue: (change.oldValue as string[]) ?? null,
        })
      } else if (key === NOTES_INDEX_KEY) {
        onUpdate({
          type: 'notes-index',
          key,
          newValue: (change.newValue as string[]) ?? null,
          oldValue: (change.oldValue as string[]) ?? null,
        })
      } else if (key.startsWith(COLLECTION_KEY_PREFIX)) {
        onUpdate({
          type: 'collection',
          key,
          newValue: (change.newValue as Collection) ?? null,
          oldValue: (change.oldValue as Collection) ?? null,
        })
      } else if (key.startsWith(NOTE_KEY_PREFIX)) {
        onUpdate({
          type: 'note',
          key,
          newValue: (change.newValue as Note) ?? null,
          oldValue: (change.oldValue as Note) ?? null,
        })
      } else if (key === SETTINGS_KEY) {
        onUpdate({
          type: 'settings',
          key,
          newValue: (change.newValue as Settings) ?? null,
          oldValue: (change.oldValue as Settings) ?? null,
        })
      }
    }
  }

  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}

// WXT storage watch helpers for specific keys
export function watchCollectionsIndex(cb: (ids: string[] | null) => void): () => void {
  return storage.watch<string[]>(COLLECTIONS_INDEX_KEY as `sync:${string}`, cb)
}

export function watchNotesIndex(cb: (ids: string[] | null) => void): () => void {
  return storage.watch<string[]>(NOTES_INDEX_KEY as `sync:${string}`, cb)
}

export function watchSettings(cb: (settings: Settings | null) => void): () => void {
  return storage.watch<Settings>(SETTINGS_KEY as `sync:${string}`, cb)
}
