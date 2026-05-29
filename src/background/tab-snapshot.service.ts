import { cacheAndBroadcastSnapshot } from './port-manager'
import type { TabEntry, RecentlyClosedEntry } from '@/features/tab-tray/types'

export function mapTab(tab: chrome.tabs.Tab): TabEntry {
  return {
    id: tab.id ?? -1,
    title: tab.title ?? '',
    url: tab.url ?? '',
    favIconUrl: tab.favIconUrl ?? '',
    windowId: tab.windowId,
    active: tab.active,
    pinned: tab.pinned,
  }
}

export function mapSession(session: chrome.sessions.Session): RecentlyClosedEntry | null {
  if (session.tab) {
    const entry: RecentlyClosedEntry = {
      title: session.tab.title ?? '',
      url: session.tab.url ?? '',
      lastModified: session.lastModified,
    }
    if (session.tab.sessionId !== undefined) entry.sessionId = session.tab.sessionId
    if (session.tab.favIconUrl !== undefined) entry.favIconUrl = session.tab.favIconUrl
    return entry
  }
  return null
}

async function buildAndBroadcastSnapshot(): Promise<void> {
  const [tabs, sessions] = await Promise.all([
    chrome.tabs.query({}),
    chrome.sessions.getRecentlyClosed({ maxResults: 25 }),
  ])

  const openTabs = tabs.map(mapTab)
  const recentlyClosed = sessions
    .map(mapSession)
    .filter((e): e is RecentlyClosedEntry => e !== null)

  cacheAndBroadcastSnapshot({ openTabs, recentlyClosed })
}

export function initTabSnapshot(): void {
  const pushSnapshot = () => {
    buildAndBroadcastSnapshot().catch(console.error)
  }

  chrome.tabs.onCreated.addListener(pushSnapshot)
  chrome.tabs.onRemoved.addListener(pushSnapshot)
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo.status === 'complete' || changeInfo.title) pushSnapshot()
  })
  chrome.tabs.onActivated.addListener(pushSnapshot)
  chrome.tabs.onMoved.addListener(pushSnapshot)

  // Initial snapshot
  pushSnapshot()
}
