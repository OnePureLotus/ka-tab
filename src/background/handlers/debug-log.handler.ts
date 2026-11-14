import { appendKatabLogLine, flushKatabLogNow } from '@/shared/debug/file-logger'
import type { MessageType } from '@/shared/messaging/types'

type DebugLogPayload = {
  level?: string
  scope?: string
  parts?: unknown[]
}

export function registerDebugLogHandlers(
  message: { type: MessageType | string; payload?: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  switch (message.type) {
    case 'KATAB_DEBUG_LOG': {
      const p = (message.payload ?? {}) as DebugLogPayload
      appendKatabLogLine(p.level ?? 'info', p.scope ?? 'UI', p.parts ?? [])
      return false
    }
    case 'KATAB_DEBUG_LOG_FLUSH': {
      flushKatabLogNow()
      sendResponse({ ok: true })
      return true
    }
    default:
      return false
  }
}