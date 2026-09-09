export interface TabEntry {
  id: number
  title: string
  url: string
  favIconUrl: string
  windowId: number
  active: boolean
  pinned: boolean
}

export interface RecentlyClosedEntry {
  sessionId?: string
  windowId?: number
  title: string
  url: string
  favIconUrl?: string
  lastModified: number
}

export interface TabTrayState {
  openTabs: TabEntry[]
  recentlyClosed: RecentlyClosedEntry[]
  connected: boolean
}
