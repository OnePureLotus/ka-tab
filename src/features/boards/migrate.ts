import type { Collection } from '@/features/collections/types'
import {
  STORAGE_KEYS,
  getAllCollections,
  setBoard,
  setCollection,
  storage,
} from '@/shared/storage/client'
import { createBoard } from './service'
import { DEFAULT_BOARD_NAME } from './types'

/**
 * One-time migration: assign existing collections to a default board.
 * Safe to call on every newtab load — exits early if already migrated.
 */
export async function runBoardMigration(): Promise<void> {
  const migrated = await storage.getItem<boolean>(STORAGE_KEYS.MIGRATION_BOARDS_V1)
  if (migrated) return

  const boardsIndex = await storage.getItem<string[]>(STORAGE_KEYS.BOARDS_INDEX)
  if (boardsIndex && boardsIndex.length > 0) {
    await storage.setItem(STORAGE_KEYS.MIGRATION_BOARDS_V1, true)
    return
  }

  const collectionsIndex = (await storage.getItem<string[]>(STORAGE_KEYS.COLLECTIONS_INDEX)) ?? []
  const collections = await getAllCollections()

  const board = createBoard(DEFAULT_BOARD_NAME, collectionsIndex)

  for (const col of collections) {
    const updated: Collection = { ...col, boardId: board.id }
    await setCollection(updated)
  }

  // Include any index entries whose documents were missing
  for (const id of collectionsIndex) {
    if (!board.collectionIds.includes(id)) {
      board.collectionIds.push(id)
    }
  }

  await setBoard(board)
  await storage.setItem(STORAGE_KEYS.MIGRATION_BOARDS_V1, true)
}
