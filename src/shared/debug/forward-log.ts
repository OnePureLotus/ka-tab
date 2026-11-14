import { MessageType } from '@/shared/messaging/types'

/** Pages (newtab/options) forward lines to the service worker for unified file logging. */
export function forwardKatabLog(
  level: 'info' | 'warn' | 'error' | 'debug',
  scope: string,
  ...parts: unknown[]
): void {
  const serialized = parts.map((p) => {
    if (p instanceof Error) return { __error: true, name: p.name, message: p.message, stack: p.stack }
    return p
  })
  void chrome.runtime
    .sendMessage({
      type: MessageType.KATAB_DEBUG_LOG,
      payload: { level, scope, parts: serialized },
    })
    .catch(() => {
      // SW asleep — ignore
    })
}