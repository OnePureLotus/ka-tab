import { createBoard } from '@/features/boards/service'
import type { Board } from '@/features/boards/types'
import { DEFAULT_BOARD_NAME } from '@/features/boards/types'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import type { Settings } from '@/features/settings/types'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
import type { ConflictRecord } from '@/features/sync/types'
import {
  STORAGE_KEYS,
  getAllBoards,
  getAllCollections,
  getAllNotes,
  getSettings,
  setBoard,
  setCollection,
  setNote,
  setSettings,
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

  const localSettings = JSON.stringify(local.settings)
  const remoteSettings = JSON.stringify(remote.settings)
  if (
    local.exportedAt > lastSyncAt &&
    remote.exportedAt > lastSyncAt &&
    localSettings !== remoteSettings
  ) {
    conflicts.push({
      key: STORAGE_KEYS.SETTINGS,
      entityType: 'settings',
      localValue: local.settings,
      remoteValue: remote.settings,
      detectedAt: now,
    })
  }

  return conflicts
}

export function hasLocalChangesSince(lastSyncAt: number, snapshot: SyncSnapshot): boolean {
  if (snapshot.exportedAt > lastSyncAt) return true
  const items: Timestamped[] = [...snapshot.boards, ...snapshot.collections, ...snapshot.notes]
  return items.some((i) => i.updatedAt > lastSyncAt)
}

/** Apply remote snapshot entities that are newer than local or missing locally */
export async function applySnapshot(remote: SyncSnapshot, lastSyncAt: number): Promise<void> {
  const [localBoards, localCollections, localNotes, localSettings] = await Promise.all([
    getAllBoards(),
    getAllCollections(),
    getAllNotes(),
    getSettings(),
  ])

  const boardMap = new Map(localBoards.map((b) => [b.id, b]))
  for (const board of remote.boards) {
    const existing = boardMap.get(board.id)
    if (!existing || board.updatedAt > existing.updatedAt) await setBoard(board)
  }

  const colMap = new Map(localCollections.map((c) => [c.id, c]))
  let boards = await getAllBoards()
  if (remote.collections.length > 0 && boards.length === 0) {
    const defaultBoard = createBoard(
      DEFAULT_BOARD_NAME,
      remote.collections.map((c) => c.id),
    )
    await setBoard(defaultBoard)
    boards = [defaultBoard]
  }
  const fallbackBoardId = boards[0]?.id

  for (const col of remote.collections) {
    const existing = colMap.get(col.id)
    const boardId = col.boardId ?? fallbackBoardId
    const withBoard = boardId ? { ...col, boardId } : col
    if (!existing || withBoard.updatedAt > existing.updatedAt) {
      await setCollection(withBoard)
    }
  }

  const noteMap = new Map(localNotes.map((n) => [n.id, n]))
  for (const note of remote.notes) {
    const existing = noteMap.get(note.id)
    if (!existing || note.updatedAt > existing.updatedAt) await setNote(note)
  }

  if (remote.exportedAt > lastSyncAt) {
    const merged = { ...DEFAULT_SETTINGS, ...localSettings, ...remote.settings }
    await setSettings(merged)
  }
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
