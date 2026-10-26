import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
import {
  TOMBSTONE_TTL_MS,
  detectConflicts,
  mergeSnapshots,
  parseSnapshot,
} from '@/features/sync/webdav/snapshot'
import type { SyncSnapshot } from '@/features/sync/webdav/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function emptySnapshot(exportedAt = 1000, deviceId = 'dev-1'): SyncSnapshot {
  return {
    schemaVersion: 2,
    revision: 0,
    exportedAt,
    deviceId,
    boards: [],
    collections: [],
    notes: [],
    settings: { ...DEFAULT_SETTINGS },
    settingsUpdatedAt: 0,
    tombstones: [],
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

function note(id: string, updatedAt: number): Note {
  return { id, content: id, createdAt: 1, updatedAt, hash: id }
}

describe('parseSnapshot', () => {
  it('reads a schema 1 file as schema 2', () => {
    const snapshot = parseSnapshot(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: 50,
        deviceId: 'dev-old',
        boards: [],
        collections: [],
        notes: [],
        settings: DEFAULT_SETTINGS,
      }),
    )
    expect(snapshot.schemaVersion).toBe(2)
    expect(snapshot.revision).toBe(0)
    expect(snapshot.tombstones).toEqual([])
    expect(snapshot.settingsUpdatedAt).toBe(0)
    expect(snapshot.deviceId).toBe('dev-old')
  })

  it('rejects an unknown schema version', () => {
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 3 }))).toThrow(
      'Unsupported snapshot schema version',
    )
  })
})

describe('mergeSnapshots', () => {
  it('keeps entities that exist on only one side', () => {
    const local = {
      ...emptySnapshot(2000, 'local'),
      collections: [collection('local-only', 1500, 'Local')],
    }
    const remote = {
      ...emptySnapshot(1800, 'remote'),
      collections: [collection('remote-only', 1400, 'Remote')],
    }
    const merged = mergeSnapshots(local, remote)
    expect(merged.collections.map((item) => item.id)).toEqual(['remote-only', 'local-only'])
  })

  it('keeps the newer copy and the remote copy when timestamps match', () => {
    const local = {
      ...emptySnapshot(3000, 'local'),
      collections: [collection('newer', 2200, 'Local newer'), collection('tie', 1800, 'Local tie')],
    }
    const remote = {
      ...emptySnapshot(2500, 'remote'),
      collections: [
        collection('newer', 2000, 'Remote older'),
        collection('tie', 1800, 'Remote tie'),
      ],
    }
    const merged = mergeSnapshots(local, remote)
    expect(merged.collections.find((item) => item.id === 'newer')?.name).toBe('Local newer')
    expect(merged.collections.find((item) => item.id === 'tie')?.name).toBe('Remote tie')
  })

  it('lets a tombstone remove an older copy and a newer edit survive a tombstone', () => {
    const now = 5_000_000
    const local = {
      ...emptySnapshot(now, 'local'),
      collections: [collection('deleted', 1000, 'Gone')],
      notes: [note('edited', 4000), note('deleted', 1000)],
      tombstones: [{ entityType: 'note' as const, id: 'edited', deletedAt: 2000 }],
    }
    const remote = {
      ...emptySnapshot(now, 'remote'),
      collections: [collection('deleted', 1000, 'Still there')],
      notes: [note('edited', 4000)],
      tombstones: [{ entityType: 'collection' as const, id: 'deleted', deletedAt: 3000 }],
    }
    const merged = mergeSnapshots(local, remote, now)
    expect(merged.collections).toEqual([])
    expect(merged.notes.map((item) => item.id)).toEqual(['edited', 'deleted'])
  })

  it('drops tombstones older than 90 days', () => {
    const now = 10_000_000_000_000
    const local = {
      ...emptySnapshot(now, 'local'),
      collections: [collection('old', 10, 'Back')],
      tombstones: [
        {
          entityType: 'collection' as const,
          id: 'old',
          deletedAt: now - TOMBSTONE_TTL_MS - 1,
        },
      ],
    }
    const merged = mergeSnapshots(local, emptySnapshot(now, 'remote'), now)
    expect(merged.collections.map((item) => item.id)).toEqual(['old'])
    expect(merged.tombstones).toEqual([])
  })

  it('keeps the newer settings timestamp and remote settings on a tie', () => {
    const local = {
      ...emptySnapshot(2000, 'local'),
      settings: { ...DEFAULT_SETTINGS, theme: 'light' as const },
      settingsUpdatedAt: 50,
    }
    const remote = {
      ...emptySnapshot(2000, 'remote'),
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' as const },
      settingsUpdatedAt: 40,
    }
    expect(mergeSnapshots(local, remote).settings.theme).toBe('light')

    const tiedLocal = { ...local, settingsUpdatedAt: 40 }
    expect(mergeSnapshots(tiedLocal, remote).settings.theme).toBe('dark')
  })
})

describe('detectConflicts', () => {
  it('returns empty when only remote changed after lastSyncAt', () => {
    const local = emptySnapshot(500)
    const remote = {
      ...emptySnapshot(1500),
      collections: [
        {
          id: 'c1',
          boardId: 'b1',
          name: 'Remote',
          color: '#111111',
          sites: [],
          createdAt: 1,
          updatedAt: 1500,
          hash: 'h1',
        },
      ],
    }
    expect(detectConflicts(local, remote, 1000)).toEqual([])
  })

  it('detects conflict when both sides changed the same collection', () => {
    const base = {
      id: 'c1',
      boardId: 'b1',
      name: 'A',
      color: '#111111',
      sites: [],
      createdAt: 1,
      updatedAt: 1200,
      hash: 'h1',
    }
    const local = {
      ...emptySnapshot(1300),
      collections: [{ ...base, name: 'Local edit', updatedAt: 1300 }],
    }
    const remote = {
      ...emptySnapshot(1400),
      collections: [{ ...base, name: 'Remote edit', updatedAt: 1400 }],
    }
    const conflicts = detectConflicts(local, remote, 1000)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.key).toBe('local:katab:collection:c1')
  })

  it('does not flag settings-only differences as conflicts', () => {
    const local = {
      ...emptySnapshot(2000),
      settings: { ...DEFAULT_SETTINGS, theme: 'light' as const },
    }
    const remote = {
      ...emptySnapshot(1500),
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' as const },
    }
    expect(detectConflicts(local, remote, 1000, 500)).toEqual([])
  })
})

describe('migrateFromChromeSync', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: vi.fn(async () => ({})),
          remove: vi.fn(async () => {}),
        },
        local: {
          set: vi.fn(async () => {}),
        },
      },
    })
  })

  it('marks migration done when sync storage is empty', async () => {
    const { migrateFromChromeSync } = await import('@/features/sync/migrate-from-chrome-sync')
    const { storage } = await import('@/shared/storage/client')
    vi.spyOn(storage, 'getItem').mockResolvedValue(null)
    vi.spyOn(storage, 'setItem').mockResolvedValue()
    await migrateFromChromeSync()
    expect(storage.setItem).toHaveBeenCalledWith('local:katab:migration_chrome_sync_v1', true)
  })
})
