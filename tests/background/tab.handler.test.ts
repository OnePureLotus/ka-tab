import { registerTabHandlers } from '@/background/handlers/tab.handler'
import { MessageType } from '@/shared/messaging/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/background/tab-snapshot.service', () => ({
  refreshTabSnapshot: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/features/tab-tray/dismissed-recent', () => ({
  dismissRecentSession: vi.fn().mockResolvedValue(undefined),
}))

const { refreshTabSnapshot } = await import('@/background/tab-snapshot.service')
const { dismissRecentSession } = await import('@/features/tab-tray/dismissed-recent')

beforeEach(() => {
  vi.clearAllMocks()
  chrome.tabs.remove = vi.fn((_tabId, cb) => cb?.())
  chrome.tabs.update = vi.fn((_tabId, _props, cb) => cb?.())
  chrome.sessions.restore = vi.fn((_sessionId, cb) => cb?.())
})

describe('registerTabHandlers', () => {
  it('TH-01: TAB_CLOSE calls chrome.tabs.remove with tabId', () => {
    const sendResponse = vi.fn()
    const handled = registerTabHandlers(
      { type: MessageType.TAB_CLOSE, payload: { tabId: 42 } },
      {},
      sendResponse,
    )

    expect(handled).toBe(true)
    expect(chrome.tabs.remove).toHaveBeenCalledWith(42, expect.any(Function))
    const cb = vi.mocked(chrome.tabs.remove).mock.calls[0]![1]
    cb?.()
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, data: undefined })
  })

  it('TH-02: TAB_DISMISS_RECENT dismisses by sessionId and refreshes snapshot', async () => {
    const sendResponse = vi.fn()
    const handled = registerTabHandlers(
      {
        type: MessageType.TAB_DISMISS_RECENT,
        payload: { sessionId: 'sess-1' },
      },
      {},
      sendResponse,
    )

    expect(handled).toBe(true)
    await vi.waitFor(() => {
      expect(dismissRecentSession).toHaveBeenCalledWith('sess-1')
      expect(refreshTabSnapshot).toHaveBeenCalled()
      expect(sendResponse).toHaveBeenCalledWith({ ok: true, data: undefined })
    })
  })

  it('TH-03: unknown message type returns false', () => {
    const handled = registerTabHandlers(
      { type: 'UNKNOWN' as typeof MessageType.TAB_CLOSE, payload: {} },
      {},
      vi.fn(),
    )
    expect(handled).toBe(false)
  })
})
