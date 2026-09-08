import type { Board } from '@/features/boards/types'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import type { Settings } from '@/features/settings/types'
import { storage } from 'wxt/utils/storage'

export interface StorageUpdate {
  type:
    | 'collection'
    | 'collections-index'
    | 'board'
    | 'boards-index'
    | 'note'
    | 'notes-index'
    | 'settings'
  key: string
  newValue: Collection | Board | Note | Settings | string[] | null
  oldValue: Collection | Board | Note | Settings | string[] | null
}

export type StorageUpdateHandler = (update: StorageUpdate) => void

const COLLECTION_KEY_PREFIX = 'local:katab:collection:'
const BOARD_KEY_PREFIX = 'local:katab:board:'
const NOTE_KEY_PREFIX = 'local:katab:note:'
const COLLECTIONS_INDEX_KEY = 'local:katab:collections:index'
const BOARDS_INDEX_KEY = 'local:katab:boards:index'
const NOTES_INDEX_KEY = 'local:katab:notes:index'
const SETTINGS_KEY = 'local:katab:settings'

export function listenStorageChanges(onUpdate: StorageUpdateHandler): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local') return

    for (const [key, change] of Object.entries(changes)) {
      if (key === COLLECTIONS_INDEX_KEY) {
        onUpdate({
          type: 'collections-index',
          key,
          newValue: (change.newValue as string[]) ?? null,
          oldValue: (change.oldValue as string[]) ?? null,
        })
      } else if (key === BOARDS_INDEX_KEY) {
        onUpdate({
          type: 'boards-index',
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
      } else if (key.startsWith(BOARD_KEY_PREFIX)) {
        onUpdate({
          type: 'board',
          key,
          newValue: (change.newValue as Board) ?? null,
          oldValue: (change.oldValue as Board) ?? null,
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

export function watchCollectionsIndex(cb: (ids: string[] | null) => void): () => void {
  return storage.watch<string[]>(COLLECTIONS_INDEX_KEY as `local:${string}`, cb)
}

export function watchBoardsIndex(cb: (ids: string[] | null) => void): () => void {
  return storage.watch<string[]>(BOARDS_INDEX_KEY as `local:${string}`, cb)
}

export function watchNotesIndex(cb: (ids: string[] | null) => void): () => void {
  return storage.watch<string[]>(NOTES_INDEX_KEY as `local:${string}`, cb)
}

export function watchSettings(cb: (settings: Settings | null) => void): () => void {
  return storage.watch<Settings>(SETTINGS_KEY as `local:${string}`, cb)
}
