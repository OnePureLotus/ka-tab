import type { Board } from '@/features/boards/types'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import type { Settings } from '@/features/settings/types'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
import type { SyncMeta } from '@/features/sync/types'
import { storage } from 'wxt/utils/storage'

// Centralized storage key constants — prevents typos and enables refactoring
export const STORAGE_KEYS = {
  META: 'local:katab:meta',
  BOARDS_INDEX: 'local:katab:boards:index',
  BOARD: (id: string) => `local:katab:board:${id}` as const,
  COLLECTIONS_INDEX: 'local:katab:collections:index',
  COLLECTION: (id: string) => `local:katab:collection:${id}` as const,
  NOTES_INDEX: 'local:katab:notes:index',
  NOTE: (id: string) => `local:katab:note:${id}` as const,
  SETTINGS: 'local:katab:settings',
  SYNC_META: 'local:katab:sync_meta',
  WEBDAV_CONFIG: 'local:katab:webdav_config',
  MIGRATION_BOARDS_V1: 'local:katab:migration_v1_boards',
} as const

export { storage }

// ─── Boards ──────────────────────────────────────────────────────────────────

export async function getAllBoards(): Promise<Board[]> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.BOARDS_INDEX)) ?? []
  if (index.length === 0) return []

  const wxtKeys = index.map((id) => STORAGE_KEYS.BOARD(id))
  const results = await storage.getItems(wxtKeys)
  return results.map((r) => r.value as Board | null).filter((b): b is Board => b != null)
}

export async function getBoard(id: string): Promise<Board | null> {
  return storage.getItem<Board>(STORAGE_KEYS.BOARD(id))
}

export async function setBoard(board: Board): Promise<void> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.BOARDS_INDEX)) ?? []
  if (!index.includes(board.id)) {
    await storage.setItem(STORAGE_KEYS.BOARDS_INDEX, [...index, board.id])
  }
  await storage.setItem(STORAGE_KEYS.BOARD(board.id), board)
}

export async function deleteBoard(id: string): Promise<void> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.BOARDS_INDEX)) ?? []
  await storage.setItem(
    STORAGE_KEYS.BOARDS_INDEX,
    index.filter((i) => i !== id),
  )
  await storage.removeItem(STORAGE_KEYS.BOARD(id))
}

// ─── Collections ─────────────────────────────────────────────────────────────

export async function getAllCollections(): Promise<Collection[]> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.COLLECTIONS_INDEX)) ?? []
  if (index.length === 0) return []

  // Bulk read via WXT's getItems — one IPC call for all keys in the same area
  const wxtKeys = index.map((id) => STORAGE_KEYS.COLLECTION(id))
  const results = await storage.getItems(wxtKeys)
  return results.map((r) => r.value as Collection | null).filter((c): c is Collection => c != null)
}

export async function getCollection(id: string): Promise<Collection | null> {
  return storage.getItem<Collection>(STORAGE_KEYS.COLLECTION(id))
}

export async function setCollection(collection: Collection): Promise<void> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.COLLECTIONS_INDEX)) ?? []
  if (!index.includes(collection.id)) {
    await storage.setItem(STORAGE_KEYS.COLLECTIONS_INDEX, [...index, collection.id])
  }
  await storage.setItem(STORAGE_KEYS.COLLECTION(collection.id), collection)
}

export async function deleteCollection(id: string): Promise<void> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.COLLECTIONS_INDEX)) ?? []
  await storage.setItem(
    STORAGE_KEYS.COLLECTIONS_INDEX,
    index.filter((i) => i !== id),
  )
  await storage.removeItem(STORAGE_KEYS.COLLECTION(id))
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function getAllNotes(): Promise<Note[]> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.NOTES_INDEX)) ?? []
  if (index.length === 0) return []

  const wxtKeys = index.map((id) => STORAGE_KEYS.NOTE(id))
  const results = await storage.getItems(wxtKeys)
  return results.map((r) => r.value as Note | null).filter((n): n is Note => n != null)
}

export async function getNote(id: string): Promise<Note | null> {
  return storage.getItem<Note>(STORAGE_KEYS.NOTE(id))
}

export async function setNote(note: Note): Promise<void> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.NOTES_INDEX)) ?? []
  if (!index.includes(note.id)) {
    await storage.setItem(STORAGE_KEYS.NOTES_INDEX, [...index, note.id])
  }
  await storage.setItem(STORAGE_KEYS.NOTE(note.id), note)
}

export async function deleteNote(id: string): Promise<void> {
  const index = (await storage.getItem<string[]>(STORAGE_KEYS.NOTES_INDEX)) ?? []
  await storage.setItem(
    STORAGE_KEYS.NOTES_INDEX,
    index.filter((i) => i !== id),
  )
  await storage.removeItem(STORAGE_KEYS.NOTE(id))
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  return (await storage.getItem<Settings>(STORAGE_KEYS.SETTINGS)) ?? { ...DEFAULT_SETTINGS }
}

export async function setSettings(settings: Settings): Promise<void> {
  await storage.setItem(STORAGE_KEYS.SETTINGS, settings)
}

// ─── Sync Meta ───────────────────────────────────────────────────────────────

export async function getSyncMeta(): Promise<SyncMeta | null> {
  return storage.getItem<SyncMeta>(STORAGE_KEYS.SYNC_META)
}

export async function setSyncMeta(meta: SyncMeta): Promise<void> {
  await storage.setItem(STORAGE_KEYS.SYNC_META, meta)
}
