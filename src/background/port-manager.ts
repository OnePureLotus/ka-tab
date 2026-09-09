import type { TabListUpdatedPayload } from '@/shared/messaging/types'
import { MessageType } from '@/shared/messaging/types'

const activePorts: Set<chrome.runtime.Port> = new Set()
let latestSnapshot: TabListUpdatedPayload | null = null
let onTabTrayConnect: (() => void) | null = null

export function setTabTrayConnectHandler(handler: () => void): void {
  onTabTrayConnect = handler
}

export function initPortManager(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'tab-tray') return

    activePorts.add(port)

    // Send current snapshot immediately on connect
    if (latestSnapshot) {
      try {
        port.postMessage({ type: MessageType.TAB_LIST_UPDATED, payload: latestSnapshot })
      } catch {
        activePorts.delete(port)
        return
      }
    } else {
      onTabTrayConnect?.()
    }

    port.onDisconnect.addListener(() => {
      activePorts.delete(port)
    })
  })
}

export function broadcastToTabTray(data: unknown): void {
  for (const port of activePorts) {
    try {
      port.postMessage(data)
    } catch {
      activePorts.delete(port)
    }
  }
}

export function cacheAndBroadcastSnapshot(payload: TabListUpdatedPayload): void {
  latestSnapshot = payload
  broadcastToTabTray({ type: MessageType.TAB_LIST_UPDATED, payload })
}
