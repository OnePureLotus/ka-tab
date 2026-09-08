import { createBoard } from '@/features/boards/service'
import { createCollection } from '@/features/collections/service'
import { produce } from 'solid-js/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const BOARD_ID = 'test-board-id'
const TEST_BOARD = createBoard('Test Board', [])

vi.mock('@/shared/storage/client', () => ({
  getAllCollections: vi.fn(),
  setCollection: vi.fn(),
  deleteCollection: vi.fn(),
  getBoard: vi.fn(),
  setBoard: vi.fn(),
  STORAGE_KEYS: {
    COLLECTIONS_INDEX: 'sync:katab:collections:index',
    BOARDS_INDEX: 'sync:katab:boards:index',
  },
  storage: { setItem: vi.fn(), getItem: vi.fn() },
}))

vi.mock('@/features/boards/store', () => ({
  boardsStore: {
    items: [{ id: BOARD_ID, name: 'Test Board', collectionIds: [], createdAt: 0, updatedAt: 0 }],
  },
  attachCollectionToBoard: vi.fn().mockResolvedValue(undefined),
  detachCollectionFromBoard: vi.fn().mockResolvedValue(undefined),
  updateBoard: vi.fn().mockResolvedValue(undefined),
}))

const {
  collectionsStore,
  setCollectionsStore,
  addCollection,
  updateCollection,
  removeCollection,
  loadCollections,
  reorderCollectionsInStore,
} = await import('@/features/collections/store')

const {
  getAllCollections: mockGetAll,
  setCollection: mockSet,
  deleteCollection: mockDelete,
  getBoard: mockGetBoard,
  setBoard: mockSetBoard,
} = await import('@/shared/storage/client')

function resetStore() {
  setCollectionsStore(
    produce((s) => {
      s.items = []
      s.loading = false
      s.error = null
    }),
  )
}

function makeCol(name: string, color = '#1a73e8') {
  return createCollection(name, color, BOARD_ID)
}

beforeEach(() => {
  resetStore()
  vi.clearAllMocks()
  vi.mocked(mockGetBoard).mockResolvedValue({ ...TEST_BOARD, collectionIds: [] })
  vi.mocked(mockSetBoard).mockResolvedValue(undefined)
})

describe('addCollection (ST-01)', () => {
  it('ST-01: addCollection 后 items 长度 +1', async () => {
    vi.mocked(mockSet).mockResolvedValue(undefined)
    const col = makeCol('Work')
    await addCollection(col)
    expect(collectionsStore.items).toHaveLength(1)
    expect(collectionsStore.items[0]?.id).toBe(col.id)
  })
})

describe('updateCollection (ST-02 / ST-03)', () => {
  it('ST-02: updateCollection 更新目标 item，其他 item 不变', async () => {
    vi.mocked(mockSet).mockResolvedValue(undefined)
    const col1 = makeCol('A')
    const col2 = makeCol('B', '#d93025')
    await addCollection(col1)
    await addCollection(col2)

    const renamed = { ...col1, name: 'A-renamed' }
    await updateCollection(renamed)

    expect(collectionsStore.items.find((c) => c.id === col1.id)?.name).toBe('A-renamed')
    expect(collectionsStore.items.find((c) => c.id === col2.id)?.name).toBe('B')
  })

  it('ST-03: updateCollection 传入不存在的 id 不崩溃', async () => {
    vi.mocked(mockSet).mockResolvedValue(undefined)
    const ghost = makeCol('Ghost')
    await expect(updateCollection(ghost)).resolves.not.toThrow()
    expect(collectionsStore.items).toHaveLength(0)
  })
})

describe('removeCollection (ST-04 / C-16 to C-20)', () => {
  it('ST-04 / C-16: removeCollection 从 items 删除对应 id', async () => {
    vi.mocked(mockSet).mockResolvedValue(undefined)
    vi.mocked(mockDelete).mockResolvedValue(undefined)
    const col = makeCol('Work')
    await addCollection(col)
    await removeCollection(col.id)
    expect(collectionsStore.items.find((c) => c.id === col.id)).toBeUndefined()
  })

  it('C-17: 删除不存在的 id 不报错', async () => {
    vi.mocked(mockDelete).mockResolvedValue(undefined)
    await expect(removeCollection('nonexistent-id')).resolves.not.toThrow()
  })

  it('C-18: 删除后 store 长度 -1', async () => {
    vi.mocked(mockSet).mockResolvedValue(undefined)
    vi.mocked(mockDelete).mockResolvedValue(undefined)
    const col1 = makeCol('A')
    const col2 = makeCol('B', '#d93025')
    await addCollection(col1)
    await addCollection(col2)
    await removeCollection(col1.id)
    expect(collectionsStore.items).toHaveLength(1)
  })

  it('C-20: 删除含网站的 Collection 整体一并移除', async () => {
    vi.mocked(mockSet).mockResolvedValue(undefined)
    vi.mocked(mockDelete).mockResolvedValue(undefined)
    const col = makeCol('WithSites')
    await addCollection(col)
    await removeCollection(col.id)
    expect(collectionsStore.items).toHaveLength(0)
  })
})

describe('loadCollections (ST-05 / ST-06)', () => {
  it('ST-05: loadCollections 成功后 loading 为 false', async () => {
    vi.mocked(mockGetAll).mockResolvedValue([])
    await loadCollections()
    expect(collectionsStore.loading).toBe(false)
  })

  it('ST-06: loadCollections 失败时 error 非 null，loading 为 false', async () => {
    vi.mocked(mockGetAll).mockRejectedValue(new Error('storage error'))
    await loadCollections()
    expect(collectionsStore.loading).toBe(false)
    expect(collectionsStore.error).not.toBeNull()
  })
})

describe('reorderCollectionsInStore (ST-07 / C-31)', () => {
  it('ST-07 / C-31: reorderCollectionsInStore 更新 store 顺序', async () => {
    vi.mocked(mockGetAll).mockResolvedValue([])
    vi.mocked(mockSet).mockResolvedValue(undefined)

    const col1 = makeCol('A')
    const col2 = makeCol('B', '#d93025')
    const col3 = makeCol('C', '#188038')
    await addCollection(col1)
    await addCollection(col2)
    await addCollection(col3)

    vi.mocked(mockGetBoard).mockResolvedValue({
      ...TEST_BOARD,
      collectionIds: [col1.id, col2.id, col3.id],
    })

    await reorderCollectionsInStore(BOARD_ID, [col2, col3, col1])
    expect(mockSetBoard).toHaveBeenCalledWith(
      expect.objectContaining({ collectionIds: [col2.id, col3.id, col1.id] }),
    )
  })
})
