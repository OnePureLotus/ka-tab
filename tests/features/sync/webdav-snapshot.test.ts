import { DEFAULT_SETTINGS } from '@/features/settings/types'
import { detectConflicts } from '@/features/sync/webdav/snapshot'
import type { SyncSnapshot } from '@/features/sync/webdav/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function emptySnapshot(exportedAt = 1000, deviceId = 'dev-1'): SyncSnapshot {
  return {
    schemaVersion: 1,
    exportedAt,
    deviceId,
    boards: [],
    collections: [],
    notes: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

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
