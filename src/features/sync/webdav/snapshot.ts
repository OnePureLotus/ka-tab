import type { Board } from '@/features/boards/types'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import type { Settings } from '@/features/settings/types'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
import type { ConflictRecord, Tombstone } from '@/features/sync/types'
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
import { hashContentSync } from '@/shared/utils/hash'
import type { SyncSnapshot } from './types'

type Timestamped = { id: string; updatedAt: number }

/** Drop tombstones after 90 days so the snapshot cannot grow without bound. */
export const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000

function entityKey(prefix: string, id: string): string {
  return `local:katab:${prefix}:${id}`
}

export async function buildSnapshot(
  deviceId: string,
  extras: {
    revision?: number
    tombstones?: Tombstone[]
    settingsUpdatedAt?: number
  } = {},
): Promise<SyncSnapshot> {
  const [boards, collections, notes, settings] = await Promise.all([
    getAllBoards(),
    getAllCollections(),
    getAllNotes(),
    getSettings(),
  ])
  return {
    schemaVersion: 2,
    exportedAt: Date.now(),
    deviceId,
    revision: extras.revision ?? 0,
    boards,
    collections,
    notes,
    settings,
    settingsUpdatedAt: extras.settingsUpdatedAt ?? 0,
    tombstones: extras.tombstones ?? [],
  }
}

export function parseSnapshot(raw: string): SyncSnapshot {
  const data = JSON.parse(raw) as {
    schemaVersion?: number
    exportedAt?: number
    deviceId?: string
    revision?: number
    boards?: SyncSnapshot['boards']
    collections?: SyncSnapshot['collections']
    notes?: SyncSnapshot['notes']
    settings?: Partial<SyncSnapshot['settings']>
    settingsUpdatedAt?: number
    tombstones?: SyncSnapshot['tombstones']
  }
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2) {
    throw new Error('Unsupported snapshot schema version')
  }
  return {
    schemaVersion: 2,
    exportedAt: data.exportedAt ?? 0,
    deviceId: data.deviceId ?? '',
    revision: data.revision ?? 0,
    boards: data.boards ?? [],
    collections: data.collections ?? [],
    notes: data.notes ?? [],
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    settingsUpdatedAt: data.settingsUpdatedAt ?? 0,
    tombstones: data.tombstones ?? [],
  }
}

export function mergeTombstones(
  local: Tombstone[],
  remote: Tombstone[],
  now = Date.now(),
): Tombstone[] {
  const merged = new Map<string, Tombstone>()
  for (const tombstone of [...local, ...remote]) {
    const key = `${tombstone.entityType}:${tombstone.id}`
    const current = merged.get(key)
    if (!current || tombstone.deletedAt > current.deletedAt) merged.set(key, tombstone)
  }
  const cutoff = now - TOMBSTONE_TTL_MS
  return [...merged.values()]
    .filter((tombstone) => tombstone.deletedAt >= cutoff)
    .sort((a, b) => {
      if (a.entityType === b.entityType) return a.id.localeCompare(b.id)
      return a.entityType.localeCompare(b.entityType)
    })
}

function mergeEntities<T extends Timestamped>(
  localItems: T[],
  remoteItems: T[],
  tombstones: Tombstone[],
  entityType: Tombstone['entityType'],
): T[] {
  const tombstoneById = new Map(
    tombstones
      .filter((tombstone) => tombstone.entityType === entityType)
      .map((tombstone) => [tombstone.id, tombstone]),
  )
  const merged = new Map<string, T>()
  for (const item of remoteItems) merged.set(item.id, item)
  for (const item of localItems) {
    const current = merged.get(item.id)
    if (!current || item.updatedAt > current.updatedAt) merged.set(item.id, item)
  }
  const result: T[] = []
  const seen = new Set<string>()
  const pushItem = (item: T | undefined) => {
    if (!item || seen.has(item.id)) return
    const winner = merged.get(item.id)
    if (!winner) return
    const tombstone = tombstoneById.get(item.id)
    if (tombstone && tombstone.deletedAt >= winner.updatedAt) return
    seen.add(item.id)
    result.push(winner)
  }
  // Remote order is the shared order. Items that exist only locally are appended.
  for (const item of remoteItems) pushItem(item)
  for (const item of localItems) pushItem(item)
  return result
}

/**
 * Per-entity last-write-wins. Equal `updatedAt` keeps the remote copy so devices converge.
 * A tombstone removes an entity when `deletedAt` is at least the entity's `updatedAt`.
 */
export function mergeSnapshots(
  local: SyncSnapshot,
  remote: SyncSnapshot,
  now = Date.now(),
): SyncSnapshot {
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones, now)
  const settings =
    local.settingsUpdatedAt > remote.settingsUpdatedAt ? local.settings : remote.settings
  return {
    schemaVersion: 2,
    exportedAt: Math.max(local.exportedAt, remote.exportedAt),
    deviceId: local.deviceId,
    revision: Math.max(local.revision, remote.revision),
    boards: mergeEntities(local.boards, remote.boards, tombstones, 'board'),
    collections: mergeEntities(local.collections, remote.collections, tombstones, 'collection'),
    notes: mergeEntities(local.notes, remote.notes, tombstones, 'note'),
    settings,
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt, remote.settingsUpdatedAt),
    tombstones,
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) sorted[key] = canonicalize(source[key])
    return sorted
  }
  return value
}

/** Hash of synced content, ignoring export metadata that changes on every upload. */
export function snapshotContentHash(snapshot: SyncSnapshot): string {
  return hashContentSync(
    canonicalize({
      boards: snapshot.boards,
      collections: snapshot.collections,
      notes: snapshot.notes,
      settings: snapshot.settings,
      settingsUpdatedAt: snapshot.settingsUpdatedAt,
      tombstones: snapshot.tombstones,
    }),
  )
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
    const remoteMap = new Map(remoteItems.map((item) => [item.id, item]))
    const localMap = new Map(localItems.map((item) => [item.id, item]))
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
  return items.some((item) => item.updatedAt > lastSyncAt)
}

/**
 * Replace local storage with a snapshot.
 * Writes entity blobs before updating indexes so UI listeners never see an index
 * pointing at keys that have not been written yet.
 */
export async function applySnapshotReplace(remote: SyncSnapshot): Promise<void> {
  const [localBoards, localCollections, localNotes] = await Promise.all([
    getAllBoards(),
    getAllCollections(),
    getAllNotes(),
  ])

  const remoteBoardIds = new Set(remote.boards.map((board) => board.id))
  const remoteColIds = new Set(remote.collections.map((collection) => collection.id))
  const remoteNoteIds = new Set(remote.notes.map((note) => note.id))

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
    remote.boards.map((board) => board.id),
  )
  await storage.setItem(
    STORAGE_KEYS.COLLECTIONS_INDEX,
    remote.collections.map((collection) => collection.id),
  )
  await storage.setItem(
    STORAGE_KEYS.NOTES_INDEX,
    remote.notes.map((note) => note.id),
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
