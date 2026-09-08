import { nanoid } from 'nanoid'
import type { Board } from './types'

export function createBoard(name: string, collectionIds: string[] = []): Board {
  const now = Date.now()
  return {
    id: nanoid(),
    name,
    collectionIds,
    createdAt: now,
    updatedAt: now,
  }
}

export function renameBoard(board: Board, name: string): Board {
  return { ...board, name, updatedAt: Date.now() }
}

export function reorderBoards(boards: Board[], fromIndex: number, toIndex: number): Board[] {
  const arr = [...boards]
  const [moved] = arr.splice(fromIndex, 1)
  if (moved) arr.splice(toIndex, 0, moved)
  return arr
}

export function addCollectionToBoard(board: Board, collectionId: string): Board {
  if (board.collectionIds.includes(collectionId)) return board
  return {
    ...board,
    collectionIds: [...board.collectionIds, collectionId],
    updatedAt: Date.now(),
  }
}

export function removeCollectionFromBoard(board: Board, collectionId: string): Board {
  return {
    ...board,
    collectionIds: board.collectionIds.filter((id) => id !== collectionId),
    updatedAt: Date.now(),
  }
}

export function reorderCollectionsInBoard(board: Board, fromIndex: number, toIndex: number): Board {
  const ids = [...board.collectionIds]
  const [moved] = ids.splice(fromIndex, 1)
  if (moved) ids.splice(toIndex, 0, moved)
  return { ...board, collectionIds: ids, updatedAt: Date.now() }
}

export function setBoardCollectionIds(board: Board, collectionIds: string[]): Board {
  return { ...board, collectionIds, updatedAt: Date.now() }
}
