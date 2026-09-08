import { setBoardCollectionIds } from '@/features/boards/service'
import {
  attachCollectionToBoard,
  boardsStore,
  detachCollectionFromBoard,
  updateBoard,
} from '@/features/boards/store'
import { watchCollectionsIndex } from '@/shared/messaging/storage-sync'
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

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function loadCollections(): Promise<void> {
  setCollectionsStore('loading', true)
  try {
    const items = await getAllCollections()
    setCollectionsStore(
      produce((s) => {
        s.items = items
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

  const byId = new Map(collectionsStore.items.map((c) => [c.id, c]))
  return board.collectionIds
    .map((id) => byId.get(id))
    .filter((c): c is Collection => c != null && c.boardId === boardId)
}

export async function addCollection(collection: Collection): Promise<void> {
  await persistCollection(collection)
  await attachCollectionToBoard(collection.boardId, collection.id)
  setCollectionsStore(
    produce((s) => {
      s.items.push(collection)
    }),
  )
}

export async function updateCollection(collection: Collection): Promise<void> {
  await persistCollection(collection)
  setCollectionsStore(
    produce((s) => {
      const idx = s.items.findIndex((c) => c.id === collection.id)
      if (idx !== -1) s.items[idx] = collection
    }),
  )
}

export async function removeCollection(id: string, boardId?: string): Promise<void> {
  const col = collectionsStore.items.find((c) => c.id === id)
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
  return watchCollectionsIndex(() => {
    loadCollections()
  })
}

export function useCollectionsStorageSync(): void {
  onMount(() => {
    const unwatch = subscribeCollectionsStorage()
    onCleanup(unwatch)
  })
}
