import { DEFAULT_SETTINGS } from '@/features/settings/types'
import { parseImportSnapshot } from '@/features/sync/local-file'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/sync/webdav/engine', () => ({
  ensureSyncMeta: vi.fn(async () => ({
    deviceId: 'test-device',
    lastSyncAt: 0,
    lastRemoteExportedAt: 0,
    lastLocalChangeAt: 0,
    pendingConflicts: [],
  })),
  runApplyingRemote: vi.fn(async (fn: () => Promise<void>) => fn()),
}))

vi.mock('@/features/sync/webdav/snapshot', () => ({
  buildSnapshot: vi.fn(async (deviceId: string) => ({
    schemaVersion: 1 as const,
    exportedAt: 2000,
    deviceId,
    boards: [{ id: 'b1', name: 'Board', collectionIds: [], createdAt: 1, updatedAt: 1 }],
    collections: [],
    notes: [{ id: 'n1', content: 'note', createdAt: 1, updatedAt: 1 }],
    settings: { ...DEFAULT_SETTINGS },
  })),
  parseSnapshot: vi.fn((raw: string) => {
    const data = JSON.parse(raw)
    if (data.schemaVersion !== 1) throw new Error('Unsupported snapshot schema version')
    return data
  }),
  applySnapshotReplace: vi.fn(async () => {}),
}))

vi.mock('@/shared/storage/client', () => ({
  setSyncMeta: vi.fn(async () => {}),
}))

describe('parseImportSnapshot', () => {
  it('parses v1 snapshot format', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      exportedAt: 1000,
      deviceId: 'remote',
      boards: [],
      collections: [],
      notes: [],
      settings: DEFAULT_SETTINGS,
    })
    const snapshot = parseImportSnapshot(raw, 'local-device')
    expect(snapshot.schemaVersion).toBe(1)
    expect(snapshot.deviceId).toBe('remote')
  })

  it('wraps legacy backup JSON without schemaVersion', () => {
    const raw = JSON.stringify({
      boards: [],
      collections: [
        {
          id: 'c1',
          name: 'Work',
          boardId: 'b1',
          color: '#111',
          sites: [],
          createdAt: 1,
          updatedAt: 1,
          hash: 'h',
        },
      ],
      notes: [],
      settings: { theme: 'dark' },
    })
    const snapshot = parseImportSnapshot(raw, 'local-device')
    expect(snapshot.schemaVersion).toBe(1)
    expect(snapshot.deviceId).toBe('local-device')
    expect(snapshot.collections).toHaveLength(1)
    expect(snapshot.settings.theme).toBe('dark')
  })

  it('throws on invalid JSON without data fields', () => {
    expect(() => parseImportSnapshot('{}', 'local-device')).toThrow('Invalid backup file')
  })

  it('throws on unsupported schema version in legacy object', () => {
    const raw = JSON.stringify({ schemaVersion: 2, collections: [] })
    expect(() => parseImportSnapshot(raw, 'local-device')).toThrow(
      'Unsupported snapshot schema version',
    )
  })
})

describe('exportSnapshotJson', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: vi.fn(async () => {}) },
    })
  })

  it('returns JSON with schemaVersion and suggested filename', async () => {
    const { exportSnapshotJson } = await import('@/features/sync/local-file')
    const result = await exportSnapshotJson()
    const parsed = JSON.parse(result.json)
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.boards).toHaveLength(1)
    expect(parsed.notes).toHaveLength(1)
    expect(result.filename).toMatch(/katab-sync-\d{4}-\d{2}-\d{2}\.json/)
  })
})

describe('importSnapshotJson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: vi.fn(async () => {}) },
    })
  })

  it('imports snapshot and returns stats', async () => {
    const { importSnapshotJson } = await import('@/features/sync/local-file')
    const { applySnapshotReplace } = await import('@/features/sync/webdav/snapshot')
    const { setSyncMeta } = await import('@/shared/storage/client')

    const raw = JSON.stringify({
      schemaVersion: 1,
      exportedAt: 3000,
      deviceId: 'other',
      boards: [{ id: 'b1', name: 'B', collectionIds: [], createdAt: 1, updatedAt: 1 }],
      collections: [
        {
          id: 'c1',
          name: 'C',
          boardId: 'b1',
          color: '#111',
          sites: [],
          createdAt: 1,
          updatedAt: 1,
          hash: 'h',
        },
      ],
      notes: [{ id: 'n1', content: 'x', createdAt: 1, updatedAt: 1 }],
      settings: DEFAULT_SETTINGS,
    })

    const result = await importSnapshotJson(raw)
    expect(result).toEqual({ ok: true, stats: { boards: 1, collections: 1, notes: 1 } })
    expect(applySnapshotReplace).toHaveBeenCalledOnce()
    expect(setSyncMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        lastSyncAt: 3000,
        pendingConflicts: [],
      }),
    )
  })

  it('returns error for invalid JSON', async () => {
    const { importSnapshotJson } = await import('@/features/sync/local-file')
    const result = await importSnapshotJson('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeTruthy()
  })
})
