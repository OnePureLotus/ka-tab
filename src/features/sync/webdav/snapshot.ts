import type { Board } from '@/features/boards/types'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import type { Settings } from '@/features/settings/types'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
import type { ConflictRecord } from '@/features/sync/types'
import {
  STORAGE_KEYS,
  deleteBoard,
  deleteCollection,
  deleteNote,
  getAllBoards,
  getAllCollections,
  getAllNotes,
  getSettings,
  setBoard,
  setCollection,
  setNote,
  setSettings,
  storage,
} from '@/shared/storage/client'
import type { SyncSnapshot } from './types'

type Timestamped = { id: string; updatedAt: number }

function entityKey(prefix: string, id: string): string {
  return `local:katab:${prefix}:${id}`
}

export async function buildSnapshot(deviceId: string): Promise<SyncSnapshot> {
  const [boards, collections, notes, settings] = await Promise.all([
    getAllBoards(),
    getAllCollections(),
    getAllNotes(),
    getSettings(),
  ])
  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    deviceId,
    boards,
    collections,
    notes,
    settings,
  }
}

export function parseSnapshot(raw: string): SyncSnapshot {
  const data = JSON.parse(raw) as SyncSnapshot
  if (data.schemaVersion !== 1) throw new Error('Unsupported snapshot schema version')
  return data
}

export function detectConflicts(
  local: SyncSnapshot,
  remote: SyncSnapshot,
  lastSyncAt: number,
  _lastLocalChangeAt = 0,
): ConflictRecord[] {
  const conflicts: ConflictRecord[] = []
  const now = Date.now()

  const check = (
    prefix: 'board' | 'collection' | 'note',
    localItems: Timestamped[],
    remoteItems: Timestamped[],
  ) => {
    const remoteMap = new Map(remoteItems.map((i) => [i.id, i]))
    const localMap = new Map(localItems.map((i) => [i.id, i]))
    const ids = new Set([...remoteMap.keys(), ...localMap.keys()])
    for (const id of ids) {
      const l = localMap.get(id)
      const r = remoteMap.get(id)
      if (!l || !r) continue
      const localChanged = l.updatedAt > lastSyncAt
      const remoteChanged = r.updatedAt > lastSyncAt
      if (localChanged && remoteChanged && l.updatedAt !== r.updatedAt) {
        conflicts.push({
          key: entityKey(prefix, id),
          entityType: prefix,
          localValue: l,
          remoteValue: r,
          detectedAt: now,
        })
      }
    }
  }

  check('board', local.boards, remote.boards)
  check('collection', local.collections, remote.collections)
  check('note', local.notes, remote.notes)

  return conflicts
}

export function hasLocalChangesSince(
  lastSyncAt: number,
  snapshot: SyncSnapshot,
  lastLocalChangeAt = 0,
): boolean {
  if (lastLocalChangeAt > lastSyncAt) return true
  const items: Timestamped[] = [...snapshot.boards, ...snapshot.collections, ...snapshot.notes]
  return items.some((i) => i.updatedAt > lastSyncAt)
}

/**
 * Replace local storage with the remote snapshot (authoritative pull).
 * Writes entity blobs before updating indexes so UI listeners never see an index
 * pointing at keys that have not been written yet.
 */
export async function applySnapshotReplace(remote: SyncSnapshot): Promise<void> {
  const [localBoards, localCollections, localNotes] = await Promise.all([
    getAllBoards(),
    getAllCollections(),
    getAllNotes(),
  ])

  const remoteBoardIds = new Set(remote.boards.map((b) => b.id))
  const remoteColIds = new Set(remote.collections.map((c) => c.id))
  const remoteNoteIds = new Set(remote.notes.map((n) => n.id))

  for (const board of remote.boards) {
    await storage.setItem(STORAGE_KEYS.BOARD(board.id), board)
  }
  for (const col of remote.collections) {
    await storage.setItem(STORAGE_KEYS.COLLECTION(col.id), col)
  }
  for (const note of remote.notes) {
    await storage.setItem(STORAGE_KEYS.NOTE(note.id), note)
  }

  await storage.setItem(
    STORAGE_KEYS.BOARDS_INDEX,
    remote.boards.map((b) => b.id),
  )
  await storage.setItem(
    STORAGE_KEYS.COLLECTIONS_INDEX,
    remote.collections.map((c) => c.id),
  )
  await storage.setItem(
    STORAGE_KEYS.NOTES_INDEX,
    remote.notes.map((n) => n.id),
  )

  for (const board of localBoards) {
    if (!remoteBoardIds.has(board.id)) await deleteBoard(board.id)
  }
  for (const col of localCollections) {
    if (!remoteColIds.has(col.id)) await deleteCollection(col.id)
  }
  for (const note of localNotes) {
    if (!remoteNoteIds.has(note.id)) await deleteNote(note.id)
  }

  await setSettings({ ...DEFAULT_SETTINGS, ...remote.settings })
}

export async function applyConflictWinner(key: string, value: unknown): Promise<void> {
  if (key === STORAGE_KEYS.SETTINGS) {
    await setSettings({ ...DEFAULT_SETTINGS, ...(value as Settings) })
    return
  }
  if (key.startsWith('local:katab:board:')) {
    await setBoard(value as Board)
    return
  }
  if (key.startsWith('local:katab:collection:')) {
    await setCollection(value as Collection)
    return
  }
  if (key.startsWith('local:katab:note:')) {
    await setNote(value as Note)
  }
}
