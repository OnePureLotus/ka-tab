import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mapTab, mapSession } from '@/background/tab-snapshot.service'

// Prevent real port/broadcast communication
vi.mock('@/background/port-manager', () => ({
  cacheAndBroadcastSnapshot: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── TS-01 to TS-03: mapTab ───────────────────────────────────────────────────

describe('mapTab', () => {
  it('TS-01: 映射全部必要字段', () => {
    const tab = {
      id: 42,
      title: 'GitHub',
      url: 'https://github.com',
      favIconUrl: 'https://github.com/favicon.ico',
      windowId: 1,
      active: true,
      pinned: false,
    } as chrome.tabs.Tab

    const entry = mapTab(tab)
    expect(entry.id).toBe(42)
    expect(entry.title).toBe('GitHub')
    expect(entry.url).toBe('https://github.com')
    expect(entry.favIconUrl).toBe('https://github.com/favicon.ico')
    expect(entry.windowId).toBe(1)
    expect(entry.active).toBe(true)
    expect(entry.pinned).toBe(false)
  })

  it('TS-02: tab.id 为 undefined → entry.id === -1', () => {
    const tab = { title: 'Test', url: 'https://test.com', windowId: 1 } as chrome.tabs.Tab
    const entry = mapTab(tab)
    expect(entry.id).toBe(-1)
  })

  it('TS-03: title / url 为 undefined → 对应字段为空字符串', () => {
    const tab = { id: 1, windowId: 1 } as chrome.tabs.Tab
    const entry = mapTab(tab)
    expect(entry.title).toBe('')
    expect(entry.url).toBe('')
  })
})

// ─── TS-04 to TS-07: mapSession ───────────────────────────────────────────────

describe('mapSession', () => {
  it('TS-04: session 含 tab → 返回 RecentlyClosedEntry', () => {
    const session: chrome.sessions.Session = {
      lastModified: 1700000000,
      tab: {
        title: 'Example',
        url: 'https://example.com',
        favIconUrl: 'https://example.com/fav.ico',
        sessionId: 'sess123',
      } as chrome.tabs.Tab,
    }
    const entry = mapSession(session)
    expect(entry).not.toBeNull()
    expect(entry!.title).toBe('Example')
    expect(entry!.url).toBe('https://example.com')
    expect(entry!.lastModified).toBe(1700000000)
  })

  it('TS-05: session 无 tab → 返回 null', () => {
    const session: chrome.sessions.Session = {
      lastModified: 1700000000,
      window: {} as chrome.windows.Window,
    }
    expect(mapSession(session)).toBeNull()
  })

  it('TS-06: session.tab 含 sessionId → entry.sessionId 写入', () => {
    const session: chrome.sessions.Session = {
      lastModified: 1700000000,
      tab: { title: 'T', url: 'https://t.com', sessionId: 'abc123' } as chrome.tabs.Tab,
    }
    const entry = mapSession(session)
    expect(entry?.sessionId).toBe('abc123')
  })

  it('TS-07: session.tab 无 favIconUrl → entry 不含 favIconUrl 字段', () => {
    const session: chrome.sessions.Session = {
      lastModified: 1700000000,
      tab: { title: 'T', url: 'https://t.com' } as chrome.tabs.Tab,
    }
    const entry = mapSession(session)
    expect(entry?.favIconUrl).toBeUndefined()
  })
})

// ─── TS-08 to TS-10: buildAndBroadcastSnapshot（通过 initTabSnapshot 间接测试）

describe('initTabSnapshot', () => {
  it('TS-08: null session 条目被过滤，不出现在 recentlyClosed', async () => {
    const { cacheAndBroadcastSnapshot } = await import('@/background/port-manager')

    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, title: 'Tab1', url: 'https://t1.com', favIconUrl: '', windowId: 1, active: false, pinned: false } as chrome.tabs.Tab,
    ])
    vi.mocked(chrome.sessions.getRecentlyClosed).mockResolvedValue([
      // valid tab session
      { lastModified: 100, tab: { title: 'Closed', url: 'https://closed.com' } as chrome.tabs.Tab },
      // window session (no tab) — should be filtered
      { lastModified: 200, window: {} as chrome.windows.Window },
    ])

    const { initTabSnapshot } = await import('@/background/tab-snapshot.service')
    initTabSnapshot()

    // Allow microtasks to flush
    await new Promise((r) => setTimeout(r, 0))

    expect(cacheAndBroadcastSnapshot).toHaveBeenCalled()
    const payload = vi.mocked(cacheAndBroadcastSnapshot).mock.calls[0]![0]
    expect(payload.recentlyClosed.every((e) => e !== null)).toBe(true)
  })

  it('TS-09: snapshot 包含所有 openTabs', async () => {
    const { cacheAndBroadcastSnapshot } = await import('@/background/port-manager')
    vi.mocked(cacheAndBroadcastSnapshot).mockClear()

    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, title: 'A', url: 'https://a.com', favIconUrl: '', windowId: 1, active: false, pinned: false } as chrome.tabs.Tab,
      { id: 2, title: 'B', url: 'https://b.com', favIconUrl: '', windowId: 1, active: true, pinned: false } as chrome.tabs.Tab,
      { id: 3, title: 'C', url: 'https://c.com', favIconUrl: '', windowId: 1, active: false, pinned: true } as chrome.tabs.Tab,
    ])
    vi.mocked(chrome.sessions.getRecentlyClosed).mockResolvedValue([])

    const { initTabSnapshot } = await import('@/background/tab-snapshot.service')
    initTabSnapshot()
    await new Promise((r) => setTimeout(r, 0))

    const payload = vi.mocked(cacheAndBroadcastSnapshot).mock.calls.at(-1)![0]
    expect(payload.openTabs).toHaveLength(3)
  })

  it('TS-10: 最近关闭条目数 <= 25（getRecentlyClosed maxResults 限制）', async () => {
    const { cacheAndBroadcastSnapshot } = await import('@/background/port-manager')
    vi.mocked(cacheAndBroadcastSnapshot).mockClear()

    vi.mocked(chrome.tabs.query).mockResolvedValue([])
    // Simulate API returning at most 25
    const sessions = Array.from({ length: 25 }, (_, i) => ({
      lastModified: i,
      tab: { title: `Tab${i}`, url: `https://t${i}.com` } as chrome.tabs.Tab,
    }))
    vi.mocked(chrome.sessions.getRecentlyClosed).mockResolvedValue(sessions)

    const { initTabSnapshot } = await import('@/background/tab-snapshot.service')
    initTabSnapshot()
    await new Promise((r) => setTimeout(r, 0))

    const payload = vi.mocked(cacheAndBroadcastSnapshot).mock.calls.at(-1)![0]
    expect(payload.recentlyClosed.length).toBeLessThanOrEqual(25)
  })
})
