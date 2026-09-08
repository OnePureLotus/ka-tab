import { DEFAULT_BOARD_NAME } from '@/features/boards/types'
import { createCollection } from '@/features/collections/service'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const storageData = new Map<string, unknown>()

vi.mock('@/shared/storage/client', () => ({
  STORAGE_KEYS: {
    MIGRATION_BOARDS_V1: 'local:katab:migration_v1_boards',
    BOARDS_INDEX: 'sync:katab:boards:index',
    COLLECTIONS_INDEX: 'sync:katab:collections:index',
    COLLECTION: (id: string) => `sync:katab:collection:${id}`,
  },
  storage: {
    getItem: vi.fn(async (key: string) => storageData.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      storageData.set(key, value)
    }),
  },
  getAllCollections: vi.fn(async () => {
    const index = (storageData.get('sync:katab:collections:index') as string[]) ?? []
    return index.map((id) => storageData.get(`sync:katab:collection:${id}`)).filter(Boolean)
  }),
  setCollection: vi.fn(async (col: { id: string }) => {
    const index = (storageData.get('sync:katab:collections:index') as string[]) ?? []
    if (!index.includes(col.id)) {
      storageData.set('sync:katab:collections:index', [...index, col.id])
    }
    storageData.set(`sync:katab:collection:${col.id}`, col)
  }),
  setBoard: vi.fn(async (board: { id: string }) => {
    const index = (storageData.get('sync:katab:boards:index') as string[]) ?? []
    if (!index.includes(board.id)) {
      storageData.set('sync:katab:boards:index', [...index, board.id])
    }
    storageData.set(`sync:katab:board:${board.id}`, board)
  }),
}))

const { runBoardMigration } = await import('@/features/boards/migrate')

beforeEach(() => {
  storageData.clear()
  vi.clearAllMocks()
})

describe('runBoardMigration', () => {
  it('creates default board when no boards exist', async () => {
    await runBoardMigration()
    const boardsIndex = storageData.get('sync:katab:boards:index') as string[]
    expect(boardsIndex).toHaveLength(1)
    const board = storageData.get(`sync:katab:board:${boardsIndex[0]}`) as { name: string }
    expect(board.name).toBe(DEFAULT_BOARD_NAME)
    expect(storageData.get('local:katab:migration_v1_boards')).toBe(true)
  })

  it('assigns existing collections to default board', async () => {
    const col = createCollection('Work', '#1a73e8', 'pending')
    storageData.set('sync:katab:collections:index', [col.id])
    storageData.set(`sync:katab:collection:${col.id}`, col)

    await runBoardMigration()

    const updated = storageData.get(`sync:katab:collection:${col.id}`) as { boardId: string }
    expect(updated.boardId).toBeTruthy()
    const boardsIndex = storageData.get('sync:katab:boards:index') as string[]
    const board = storageData.get(`sync:katab:board:${boardsIndex[0]}`) as {
      collectionIds: string[]
    }
    expect(board.collectionIds).toContain(col.id)
  })

  it('skips when already migrated', async () => {
    storageData.set('local:katab:migration_v1_boards', true)
    await runBoardMigration()
    expect(storageData.get('sync:katab:boards:index')).toBeUndefined()
  })
})
