import { setBoardCollectionIds } from '@/features/boards/service'
import {
  attachCollectionToBoard,
  boardsStore,
  detachCollectionFromBoard,
  updateBoard,
} from '@/features/boards/store'
import { listenStorageChanges, watchCollectionsIndex } from '@/shared/messaging/storage-sync'
import {
  getAllCollections,
  setCollection as persistCollection,
  deleteCollection as removeFromStorage,
} from '@/shared/storage/client'
import { getBoard, setBoard } from '@/shared/storage/client'
import { onCleanup, onMount } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { Collection } from './types'

export interface CollectionsState {
  items: Collection[]
  loading: boolean
  error: string | null
}

const [collectionsStore, setCollectionsStore] = createStore<CollectionsState>({
  items: [],
  loading: false,
  error: null,
})

export { collectionsStore, setCollectionsStore }

function normalizeCollectionsById(items: Collection[]): Collection[] {
  const byId = new Map<string, Collection>()
  for (const col of items) {
    const existing = byId.get(col.id)
    if (!existing || col.updatedAt >= existing.updatedAt) {
      byId.set(col.id, col)
    }
  }
  return Array.from(byId.values())
}

function mergeCollectionsFromStorage(loaded: Collection[], existing: Collection[]): Collection[] {
  const existingById = new Map(existing.map((c) => [c.id, c]))
  const merged = loaded.map((loadedCol) => {
    const local = existingById.get(loadedCol.id)
    if (local && local.updatedAt >= loadedCol.updatedAt) return local
    return loadedCol
  })
  return normalizeCollectionsById(merged)
}

export function getCollectionById(id: string): Collection | undefined {
  const matches = collectionsStore.items.filter((c) => c.id === id)
  if (matches.length === 0) return undefined
  return matches.reduce((best, cur) => (cur.updatedAt > best.updatedAt ? cur : best), matches[0]!)
}

function upsertCollectionInStore(collection: Collection): void {
  setCollectionsStore(
    produce((s) => {
      const idx = s.items.findIndex((c) => c.id === collection.id)
      if (idx === -1) s.items.push(collection)
      else s.items[idx] = collection
      s.items = normalizeCollectionsById(s.items)
    }),
  )
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function loadCollections(): Promise<void> {
  setCollectionsStore('loading', true)
  try {
    const items = await getAllCollections()
    const merged = mergeCollectionsFromStorage(items, collectionsStore.items)
    setCollectionsStore(
      produce((s) => {
        s.items = merged
        s.loading = false
        s.error = null
      }),
    )
  } catch (err) {
    console.error('[KaTab] Failed to load collections', err)
    setCollectionsStore(
      produce((s) => {
        s.loading = false
        s.error = String(err)
      }),
    )
  }
}

export function getCollectionsForBoard(boardId: string): Collection[] {
  const board = boardsStore.items.find((b) => b.id === boardId)
  if (!board) return []

  return board.collectionIds
    .map((id) => getCollectionById(id))
    .filter((c): c is Collection => c != null && c.boardId === boardId)
}

export async function addCollection(collection: Collection): Promise<void> {
  await persistCollection(collection)
  await attachCollectionToBoard(collection.boardId, collection.id)
  upsertCollectionInStore(collection)
}

export async function updateCollection(collection: Collection): Promise<void> {
  upsertCollectionInStore(collection)
  await persistCollection(collection)
}

export async function removeCollection(id: string, boardId?: string): Promise<void> {
  const col = getCollectionById(id)
  const resolvedBoardId = boardId ?? col?.boardId
  await removeFromStorage(id)
  if (resolvedBoardId) {
    await detachCollectionFromBoard(resolvedBoardId, id)
  }
  setCollectionsStore(
    produce((s) => {
      s.items = s.items.filter((c) => c.id !== id)
    }),
  )
}

export async function reorderCollectionsInStore(
  boardId: string,
  newOrder: Collection[],
): Promise<void> {
  const board = await getBoard(boardId)
  if (!board) return

  const updatedBoard = setBoardCollectionIds(
    board,
    newOrder.map((c) => c.id),
  )
  await setBoard(updatedBoard)
  await updateBoard(updatedBoard)
}

export function subscribeCollectionsStorage(): () => void {
  const unwatchIndex = watchCollectionsIndex(() => {
    void loadCollections()
  })
  const unwatchEntities = listenStorageChanges((update) => {
    if (update.type !== 'collection' || !update.newValue) return
    const collection = update.newValue as Collection
    const existing = getCollectionById(collection.id)
    if (existing && existing.updatedAt > collection.updatedAt) return
    upsertCollectionInStore(collection)
  })
  return () => {
    unwatchIndex()
    unwatchEntities()
  }
}

export function useCollectionsStorageSync(): void {
  onMount(() => {
    const unwatch = subscribeCollectionsStorage()
    onCleanup(unwatch)
  })
}
