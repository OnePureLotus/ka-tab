import { createStore, produce } from 'solid-js/store'
import { onMount, onCleanup } from 'solid-js'
import type { Collection } from './types'
import {
  getAllCollections,
  setCollection as persistCollection,
  deleteCollection as removeFromStorage,
} from '@/shared/storage/client'

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

export async function addCollection(collection: Collection): Promise<void> {
  await persistCollection(collection)
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

export async function removeCollection(id: string): Promise<void> {
  await removeFromStorage(id)
  setCollectionsStore(
    produce((s) => {
      s.items = s.items.filter((c) => c.id !== id)
    }),
  )
}

export async function reorderCollectionsInStore(newOrder: Collection[]): Promise<void> {
  // Persist each in the new order by updating the index
  const { STORAGE_KEYS, storage } = await import('@/shared/storage/client')
  await storage.setItem(
    STORAGE_KEYS.COLLECTIONS_INDEX,
    newOrder.map((c) => c.id),
  )
  setCollectionsStore('items', newOrder)
}
