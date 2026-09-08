import {
  addCollectionToBoard,
  createBoard,
  removeCollectionFromBoard,
  renameBoard,
  reorderBoards,
  reorderCollectionsInBoard,
  setBoardCollectionIds,
} from '@/features/boards/service'
import { describe, expect, it } from 'vitest'

describe('createBoard', () => {
  it('creates a board with empty collectionIds', () => {
    const board = createBoard('Work')
    expect(board.id).toBeTruthy()
    expect(board.name).toBe('Work')
    expect(board.collectionIds).toEqual([])
    expect(board.createdAt).toBeGreaterThan(0)
    expect(board.updatedAt).toBeGreaterThan(0)
  })

  it('accepts initial collectionIds', () => {
    const board = createBoard('Work', ['c1', 'c2'])
    expect(board.collectionIds).toEqual(['c1', 'c2'])
  })
})

describe('renameBoard', () => {
  it('updates name and updatedAt', () => {
    const board = createBoard('Old')
    const renamed = renameBoard(board, 'New')
    expect(renamed.name).toBe('New')
    expect(renamed.updatedAt).toBeGreaterThanOrEqual(board.updatedAt)
  })
})

describe('reorderBoards', () => {
  it('reorders board array', () => {
    const a = createBoard('A')
    const b = createBoard('B')
    const c = createBoard('C')
    const result = reorderBoards([a, b, c], 0, 2)
    expect(result.map((x) => x.name)).toEqual(['B', 'C', 'A'])
  })
})

describe('addCollectionToBoard', () => {
  it('appends collection id', () => {
    const board = createBoard('Work')
    const updated = addCollectionToBoard(board, 'col-1')
    expect(updated.collectionIds).toEqual(['col-1'])
  })

  it('does not duplicate collection id', () => {
    const board = createBoard('Work', ['col-1'])
    const updated = addCollectionToBoard(board, 'col-1')
    expect(updated.collectionIds).toEqual(['col-1'])
  })
})

describe('removeCollectionFromBoard', () => {
  it('removes collection id', () => {
    const board = createBoard('Work', ['col-1', 'col-2'])
    const updated = removeCollectionFromBoard(board, 'col-1')
    expect(updated.collectionIds).toEqual(['col-2'])
  })
})

describe('reorderCollectionsInBoard', () => {
  it('reorders collection ids within board', () => {
    const board = createBoard('Work', ['a', 'b', 'c'])
    const updated = reorderCollectionsInBoard(board, 0, 2)
    expect(updated.collectionIds).toEqual(['b', 'c', 'a'])
  })
})

describe('setBoardCollectionIds', () => {
  it('replaces collection ids', () => {
    const board = createBoard('Work', ['a'])
    const updated = setBoardCollectionIds(board, ['x', 'y'])
    expect(updated.collectionIds).toEqual(['x', 'y'])
  })
})
