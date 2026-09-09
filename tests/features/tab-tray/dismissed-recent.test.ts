import {
  dismissRecentSession,
  getDismissedSessionIds,
  isRecentDismissed,
  pruneDismissedSessionIds,
} from '@/features/tab-tray/dismissed-recent'
import type { RecentlyClosedEntry } from '@/features/tab-tray/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const storageData: Record<string, unknown> = {}

vi.mock('wxt/utils/storage', () => ({
  storage: {
    getItem: vi.fn(async (key: string) => storageData[key] ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      storageData[key] = value
    }),
  },
}))

beforeEach(() => {
  for (const key of Object.keys(storageData)) {
    delete storageData[key]
  }
})

describe('dismissed-recent', () => {
  it('DR-01: dismissRecentSession stores sessionId only', async () => {
    await dismissRecentSession('s1')

    const list = await getDismissedSessionIds()
    expect(list).toEqual(['s1'])
  })

  it('DR-02: isRecentDismissed matches sessionId only, not URL', () => {
    const dismissed = ['s1']
    const sameSession: RecentlyClosedEntry = {
      sessionId: 's1',
      title: 'Example',
      url: 'https://example.com/page',
      lastModified: 1,
    }
    const newSession: RecentlyClosedEntry = {
      sessionId: 's2',
      title: 'Example',
      url: 'https://example.com/page',
      lastModified: 2,
    }

    expect(isRecentDismissed(sameSession, dismissed)).toBe(true)
    expect(isRecentDismissed(newSession, dismissed)).toBe(false)
  })

  it('DR-03: pruneDismissedSessionIds removes stale IDs', async () => {
    await dismissRecentSession('old')
    await dismissRecentSession('keep')

    const pruned = await pruneDismissedSessionIds(['keep'])
    expect(pruned).toEqual(['keep'])
    expect(await getDismissedSessionIds()).toEqual(['keep'])
  })
})
