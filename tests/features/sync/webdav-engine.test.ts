import type { Board } from '@/features/boards/types'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
import type { SyncMeta } from '@/features/sync/types'
import { getWebDavConfig } from '@/features/sync/webdav-config'
import { WebDavError, downloadSnapshot, uploadSnapshot } from '@/features/sync/webdav/client'
import {
  getSyncRuntimeStatus,
  initSyncEngine,
  pull,
  push,
  syncNow,
} from '@/features/sync/webdav/engine'
import type { SyncSnapshot } from '@/features/sync/webdav/types'
import {
  deleteCollection,
  getAllBoards,
  getAllCollections,
  getAllNotes,
  getSettings,
  getSyncMeta,
  setSyncMeta,
  storage,
} from '@/shared/storage/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/sync/webdav-config', () => ({
  getWebDavConfig: vi.fn(),
}))

vi.mock('@/features/sync/webdav/client', async () => {
  const actual = await vi.importActual<typeof import('@/features/sync/webdav/client')>(
    '@/features/sync/webdav/client',
  )
  return {
    ...actual,
    downloadSnapshot: vi.fn(),
    uploadSnapshot: vi.fn(),
  }
})

vi.mock('@/shared/storage/client', () => ({
  STORAGE_KEYS: {
    BOARDS_INDEX: 'local:katab:boards:index',
    BOARD: (id: string) => `local:katab:board:${id}`,
    COLLECTIONS_INDEX: 'local:katab:collections:index',
    COLLECTION: (id: string) => `local:katab:collection:${id}`,
    NOTES_INDEX: 'local:katab:notes:index',
    NOTE: (id: string) => `local:katab:note:${id}`,
    SETTINGS: 'local:katab:settings',
    SYNC_META: 'local:katab:sync_meta',
  },
  getSyncMeta: vi.fn(),
  setSyncMeta: vi.fn(),
  getAllBoards: vi.fn(),
  getAllCollections: vi.fn(),
  getAllNotes: vi.fn(),
  getSettings: vi.fn(),
  deleteBoard: vi.fn(async () => {}),
  deleteCollection: vi.fn(async () => {}),
  deleteNote: vi.fn(async () => {}),
  setBoard: vi.fn(async () => {}),
  setCollection: vi.fn(async () => {}),
  setNote: vi.fn(async () => {}),
  setSettings: vi.fn(async () => {}),
  storage: {
    setItem: vi.fn(async () => {}),
    getItem: vi.fn(),
    removeItem: vi.fn(async () => {}),
  },
}))

const state: {
  meta: SyncMeta
  boards: Board[]
  collections: Collection[]
  notes: Note[]
  settings: typeof DEFAULT_SETTINGS
} = {
  meta: {
    deviceId: 'device-a',
    lastSyncAt: 0,
    lastRemoteExportedAt: 0,
    lastLocalChangeAt: 0,
    pendingConflicts: [],
    dirty: true,
    lastRemoteEtag: null,
    lastRemoteRevision: 0,
    settingsUpdatedAt: 0,
    tombstones: [],
  },
  boards: [],
  collections: [],
  notes: [],
  settings: { ...DEFAULT_SETTINGS },
}

function makeMeta(overrides: Partial<SyncMeta> = {}): SyncMeta {
  return {
    deviceId: 'device-a',
    lastSyncAt: 0,
    lastRemoteExportedAt: 0,
    lastLocalChangeAt: 0,
    pendingConflicts: [],
    dirty: true,
    lastRemoteEtag: null,
    lastRemoteRevision: 0,
    settingsUpdatedAt: 0,
    tombstones: [],
    ...overrides,
  }
}

function collection(id: string, updatedAt: number, name = id): Collection {
  return {
    id,
    boardId: 'b1',
    name,
    color: '#111111',
    sites: [],
    createdAt: 1,
    updatedAt,
    hash: name,
  }
}

function remoteSnapshot(overrides: Partial<SyncSnapshot> = {}): SyncSnapshot {
  return {
    schemaVersion: 2,
    revision: 0,
    exportedAt: 1000,
    deviceId: 'device-b',
    boards: [],
    collections: [],
    notes: [],
    settings: { ...DEFAULT_SETTINGS },
    settingsUpdatedAt: 0,
    tombstones: [],
    ...overrides,
  }
}

beforeEach(() => {
  state.meta = makeMeta()
  state.boards = []
  state.collections = []
  state.notes = []
  state.settings = { ...DEFAULT_SETTINGS }

  vi.mocked(getSyncMeta).mockImplementation(async () => state.meta)
  vi.mocked(setSyncMeta).mockImplementation(async (meta) => {
    state.meta = meta
  })
  vi.mocked(getAllBoards).mockImplementation(async () => state.boards)
  vi.mocked(getAllCollections).mockImplementation(async () => state.collections)
  vi.mocked(getAllNotes).mockImplementation(async () => state.notes)
  vi.mocked(getSettings).mockImplementation(async () => state.settings)
  vi.mocked(getWebDavConfig).mockResolvedValue({
    enabled: true,
    baseUrl: 'https://dav.example.com/remote.php/dav/files/user',
    remotePath: '/katab-sync.json',
    username: 'user',
    password: 'pass',
  })
  vi.mocked(downloadSnapshot).mockReset()
  vi.mocked(uploadSnapshot).mockReset()
  vi.mocked(storage.setItem).mockClear()
  vi.mocked(deleteCollection).mockClear()

  chrome.runtime.sendMessage = vi.fn(async () => undefined)
  chrome.runtime.getPlatformInfo = vi.fn(async () => ({
    os: 'win',
    arch: 'x86-64',
    nacl_arch: 'x86-64',
  }))
  chrome.alarms = {
    create: vi.fn(),
    clear: vi.fn(async () => true),
    get: vi.fn(),
    getAll: vi.fn(),
    clearAll: vi.fn(async () => {}),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
  } as unknown as typeof chrome.alarms
  chrome.storage.onChanged = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(),
    hasListeners: vi.fn(),
  }
})

describe('webdav engine', () => {
  it('merges remote entities into a dirty local snapshot on pull', async () => {
    state.meta = makeMeta({
      dirty: true,
      pendingConflicts: [
        {
          key: 'local:katab:collection:stale',
          localValue: {},
          remoteValue: {},
          detectedAt: 1,
        },
      ],
    })
    state.collections = [collection('local-1', 5000, 'Local')]
    vi.mocked(downloadSnapshot).mockResolvedValue({
      body: JSON.stringify(
        remoteSnapshot({ collections: [collection('remote-1', 4000, 'Remote')] }),
      ),
      etag: '"remote"',
    })

    const result = await pull()

    expect(result).toEqual({ ok: true })
    const keys = vi.mocked(storage.setItem).mock.calls.map((call) => call[0])
    expect(keys).toContain('local:katab:collection:local-1')
    expect(keys).toContain('local:katab:collection:remote-1')
    expect(deleteCollection).not.toHaveBeenCalled()
    expect(state.meta.pendingConflicts).toEqual([])
    expect(state.meta.dirty).toBe(true)
  })

  it('uploads the merged snapshot after pull when local still has unique data', async () => {
    state.collections = [collection('local-1', 5000, 'Local')]
    vi.mocked(downloadSnapshot).mockResolvedValue({
      body: JSON.stringify(
        remoteSnapshot({ collections: [collection('remote-1', 4000, 'Remote')] }),
      ),
      etag: '"remote"',
    })
    vi.mocked(uploadSnapshot).mockResolvedValue('"uploaded"')

    const result = await syncNow()

    expect(result.ok).toBe(true)
    expect(getSyncRuntimeStatus().lastDirection).toBe('both')
    const body = vi.mocked(uploadSnapshot).mock.calls[0]?.[1] as string
    const uploaded = JSON.parse(body) as SyncSnapshot
    expect(uploaded.collections.map((item) => item.id).sort()).toEqual(['local-1', 'remote-1'])
  })

  it('retries a push with If-Match after the server returns 412', async () => {
    state.collections = [collection('c1', 3000, 'Local newer')]
    state.meta = makeMeta({
      pendingConflicts: [
        { key: 'local:katab:collection:c1', localValue: {}, remoteValue: {}, detectedAt: 1 },
      ],
    })
    vi.mocked(downloadSnapshot).mockResolvedValue({
      body: JSON.stringify(
        remoteSnapshot({
          revision: 4,
          collections: [collection('c1', 1000, 'Remote older')],
        }),
      ),
      etag: '"v1"',
    })
    vi.mocked(uploadSnapshot)
      .mockRejectedValueOnce(new WebDavError('Upload failed (412)', 412))
      .mockResolvedValueOnce('"v2"')

    const result = await push()

    expect(result).toEqual({ ok: true })
    expect(uploadSnapshot).toHaveBeenCalledTimes(2)
    expect(vi.mocked(uploadSnapshot).mock.calls[0]?.[2]).toEqual({ ifMatch: '"v1"' })
    expect(vi.mocked(uploadSnapshot).mock.calls[1]?.[2]).toEqual({ ifMatch: '"v1"' })
    const uploaded = JSON.parse(
      vi.mocked(uploadSnapshot).mock.calls[1]?.[1] as string,
    ) as SyncSnapshot
    expect(uploaded.revision).toBe(5)
    expect(uploaded.collections[0]?.name).toBe('Local newer')
    expect(state.meta.pendingConflicts).toEqual([])
    expect(state.meta.dirty).toBe(false)
    expect(state.meta.lastRemoteEtag).toBe('"v2"')
    expect(state.meta.lastRemoteRevision).toBe(5)
  })

  it('uses If-None-Match when the remote file does not exist yet', async () => {
    state.collections = [collection('c1', 10, 'First')]
    vi.mocked(downloadSnapshot).mockResolvedValue(null)
    vi.mocked(uploadSnapshot).mockResolvedValue('"created"')

    const result = await push()

    expect(result.ok).toBe(true)
    expect(uploadSnapshot).toHaveBeenCalledWith(expect.anything(), expect.any(String), {
      ifNoneMatch: '*',
    })
  })

  it('uploads without a precondition when the server does not send an ETag', async () => {
    state.collections = [collection('c1', 3000, 'Local')]
    vi.mocked(downloadSnapshot).mockResolvedValue({
      body: JSON.stringify(remoteSnapshot({ collections: [collection('c1', 1000, 'Old')] })),
      etag: null,
    })
    vi.mocked(uploadSnapshot).mockResolvedValue(null)

    const result = await push()

    expect(result.ok).toBe(true)
    expect(vi.mocked(uploadSnapshot).mock.calls[0]?.[2]).toBeUndefined()
  })

  it('skips the upload when merged content already matches the remote file', async () => {
    const collections = [collection('c1', 1000, 'Same')]
    state.collections = collections
    state.meta = makeMeta({ dirty: true })
    vi.mocked(downloadSnapshot).mockResolvedValue({
      body: JSON.stringify(remoteSnapshot({ revision: 3, collections })),
      etag: '"same"',
    })

    const result = await push()

    expect(result).toEqual({ ok: true })
    expect(uploadSnapshot).not.toHaveBeenCalled()
    expect(state.meta.dirty).toBe(false)
    expect(state.meta.lastRemoteRevision).toBe(3)
    expect(state.meta.lastRemoteEtag).toBe('"same"')
  })

  it('runs a second push after the first instead of dropping it', async () => {
    state.collections = [collection('c1', 3000, 'Local')]
    vi.mocked(downloadSnapshot).mockResolvedValue({
      body: JSON.stringify(remoteSnapshot()),
      etag: '"e"',
    })
    const gates: Array<(etag: string | null) => void> = []
    vi.mocked(uploadSnapshot).mockImplementation(
      () =>
        new Promise((resolve) => {
          gates.push(resolve)
        }),
    )

    const first = push()
    await vi.waitFor(() => expect(gates).toHaveLength(1))
    const second = push()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(gates).toHaveLength(1)

    gates[0]?.('"e2"')
    await first
    await vi.waitFor(() => expect(gates).toHaveLength(2))
    gates[1]?.('"e3"')
    await expect(second).resolves.toMatchObject({ ok: true })
    expect(String((await second).error ?? '')).not.toContain('already in progress')
  })

  it('starts the periodic alarm when sync is enabled', async () => {
    state.meta = makeMeta({ dirty: false })
    vi.mocked(downloadSnapshot).mockResolvedValue(null)

    initSyncEngine()

    await vi.waitFor(() => expect(downloadSnapshot).toHaveBeenCalled())
    await vi.waitFor(() => expect(getSyncRuntimeStatus().phase).toBe('idle'))
    expect(chrome.alarms.create).toHaveBeenCalledWith('katab-webdav-periodic', {
      periodInMinutes: 5,
    })
    expect(uploadSnapshot).not.toHaveBeenCalled()
  })
})
