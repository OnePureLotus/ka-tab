import { storage } from 'wxt/utils/storage'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import type { Settings } from '@/features/settings/types'
import type { SyncMeta } from '@/features/sync/types'
import { DEFAULT_SETTINGS } from '@/features/settings/types'

// Centralized storage key constants — prevents typos and enables refactoring
export const STORAGE_KEYS = {
  META: 'sync:katab:meta',
  COLLECTIONS_INDEX: 'sync:katab:collections:index',
  COLLECTION: (id: string) => `sync:katab:collection:${id}` as const,
  NOTES_INDEX: 'sync:katab:notes:index',
  NOTE: (id: string) => `sync:katab:note:${id}` as const,
  SETTINGS: 'sync:katab:settings',
  SYNC_META: 'local:katab:sync_meta',
} as const

export { storage }

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

// ─── Quota Check ─────────────────────────────────────────────────────────────

/** Warn in console if storage usage exceeds 80% of Chrome sync quota (102KB) */
export async function checkStorageQuota(): Promise<void> {
  const SYNC_QUOTA_BYTES = 102_400
  const WARNING_THRESHOLD = 0.8

  try {
    const usage = await new Promise<number>((resolve) => {
      chrome.storage.sync.getBytesInUse(null, resolve)
    })
    const ratio = usage / SYNC_QUOTA_BYTES
    if (ratio >= WARNING_THRESHOLD) {
      console.warn('[KaTab] Storage quota warning', {
        used: usage,
        total: SYNC_QUOTA_BYTES,
        percent: Math.round(ratio * 100),
      })
    }
  } catch (err) {
    console.error('[KaTab] Failed to check storage quota', err)
  }
}
