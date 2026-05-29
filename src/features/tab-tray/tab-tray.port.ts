import { setTabTrayStore } from './store'
import type { TabListUpdatedPayload } from '@/shared/messaging/types'
import { MessageType } from '@/shared/messaging/types'
import type { TabEntry, RecentlyClosedEntry } from './types'

let port: chrome.runtime.Port | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1000
const MAX_RECONNECT_DELAY = 30_000

function onPortMessage(msg: unknown) {
  if (typeof msg !== 'object' || msg === null) return
  const m = msg as { type: string; payload: unknown }
  if (m.type === MessageType.TAB_LIST_UPDATED) {
    const payload = m.payload as TabListUpdatedPayload
    setTabTrayStore({
      openTabs: payload.openTabs as TabEntry[],
      recentlyClosed: payload.recentlyClosed as RecentlyClosedEntry[],
      connected: true,
    })
  }
}

function connect() {
  try {
    port = chrome.runtime.connect({ name: 'tab-tray' })
    reconnectDelay = 1000

    setTabTrayStore('connected', false) // wait for first message

    port.onMessage.addListener(onPortMessage)

    port.onDisconnect.addListener(() => {
      port = null
      setTabTrayStore('connected', false)
      scheduleReconnect()
    })
  } catch (err) {
    console.error('[KaTab] Tab tray port connect failed', err)
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, reconnectDelay)
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
}

export function connectTabTray(): () => void {
  connect()
  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (port) {
      port.disconnect()
      port = null
    }
  }
}
