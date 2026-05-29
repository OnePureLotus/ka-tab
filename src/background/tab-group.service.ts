import { mapToTabGroupColor } from '@/shared/color/tab-group-mapper'
import type { Collection } from '@/features/collections/types'

export async function openCollectionAsTabGroup(collection: Collection): Promise<void> {
  const tabGroupColor = collection.tabGroupColor ?? mapToTabGroupColor(collection.color)

  const tabIds: number[] = []
  for (const site of collection.sites) {
    const tab = await chrome.tabs.create({ url: site.url, active: false })
    if (tab.id !== undefined) tabIds.push(tab.id)
  }

  if (tabIds.length === 0) return

  // chrome.tabs.group requires at least one tabId
  const groupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] })
  await chrome.tabGroups.update(groupId, {
    title: collection.name,
    color: tabGroupColor,
  })
}

export async function openCollectionInNewWindow(collection: Collection): Promise<void> {
  if (collection.sites.length === 0) return

  const firstSite = collection.sites[0]
  if (!firstSite) return

  const newWindow = await chrome.windows.create({ url: firstSite.url, focused: true })
  if (!newWindow?.id) return

  for (const site of collection.sites.slice(1)) {
    await chrome.tabs.create({ windowId: newWindow.id, url: site.url, active: false })
  }
}
