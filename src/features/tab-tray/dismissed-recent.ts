import { storage } from 'wxt/utils/storage'
import type { RecentlyClosedEntry } from './types'

const STORAGE_KEY = 'local:katab:tab-tray:dismissed-session-ids'
/** Chrome keeps at most 25 recently-closed entries; pruned list cannot exceed that. */
const MAX_DISMISSED = 25

/** Session IDs the user removed from Tab Tray — scoped per closed tab, not by URL. */
export async function getDismissedSessionIds(): Promise<string[]> {
  return (await storage.getItem<string[]>(STORAGE_KEY)) ?? []
}

export async function dismissRecentSession(sessionId: string): Promise<void> {
  const list = await getDismissedSessionIds()
  if (list.includes(sessionId)) return
  await storage.setItem(STORAGE_KEY, [...list, sessionId].slice(-MAX_DISMISSED))
}

/** Drop IDs no longer present in Chrome's recently-closed list (auto cleanup). */
export async function pruneDismissedSessionIds(activeSessionIds: string[]): Promise<string[]> {
  const active = new Set(activeSessionIds)
  const list = await getDismissedSessionIds()
  const pruned = list.filter((id) => active.has(id))
  if (pruned.length !== list.length) {
    await storage.setItem(STORAGE_KEY, pruned)
  }
  return pruned
}

export function isRecentDismissed(
  entry: RecentlyClosedEntry,
  dismissedSessionIds: string[],
): boolean {
  return entry.sessionId !== undefined && dismissedSessionIds.includes(entry.sessionId)
}
