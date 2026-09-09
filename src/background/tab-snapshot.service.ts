import { isRecentDismissed, pruneDismissedSessionIds } from '@/features/tab-tray/dismissed-recent'
import type { RecentlyClosedEntry, TabEntry } from '@/features/tab-tray/types'
import { cacheAndBroadcastSnapshot, setTabTrayConnectHandler } from './port-manager'

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
    if (session.tab.windowId !== undefined) entry.windowId = session.tab.windowId
    if (session.tab.favIconUrl !== undefined) entry.favIconUrl = session.tab.favIconUrl
    return entry
  }
  return null
}

export async function refreshTabSnapshot(): Promise<void> {
  const [tabs, sessions] = await Promise.all([
    chrome.tabs.query({}),
    chrome.sessions.getRecentlyClosed({ maxResults: 25 }),
  ])

  const openTabs = tabs.map(mapTab)
  const mapped = sessions.map(mapSession).filter((e): e is RecentlyClosedEntry => e !== null)

  const activeSessionIds = mapped
    .map((e) => e.sessionId)
    .filter((id): id is string => id !== undefined)

  const dismissed = await pruneDismissedSessionIds(activeSessionIds)
  const recentlyClosed = mapped.filter((e) => !isRecentDismissed(e, dismissed))

  cacheAndBroadcastSnapshot({ openTabs, recentlyClosed })
}

export function initTabSnapshot(): void {
  setTabTrayConnectHandler(() => {
    refreshTabSnapshot().catch(console.error)
  })

  const pushSnapshot = () => {
    refreshTabSnapshot().catch(console.error)
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
