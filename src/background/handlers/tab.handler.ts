import type { MessageType } from '@/shared/messaging/types'
import type { TabFocusPayload } from '@/shared/messaging/types'

export function registerTabHandlers(
  message: { type: MessageType; payload: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  switch (message.type) {
    case 'TAB_GET_CURRENT': {
      chrome.tabs.query({}, (tabs) => {
        const validTabs = tabs
          .filter((t) => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'))
          .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
        sendResponse(validTabs)
      })
      return true
    }
    case 'TAB_RESTORE': {
      const sessionId = message.payload as string
      chrome.sessions.restore(sessionId, () => sendResponse({ ok: true, data: undefined }))
      return true
    }
    case 'TAB_FOCUS': {
      const { tabId } = message.payload as TabFocusPayload
      chrome.tabs.update(tabId, { active: true }, () => sendResponse({ ok: true, data: undefined }))
      return true
    }
    default:
      return false
  }
}
