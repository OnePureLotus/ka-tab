/** WXT `local:*` keys are stored in chrome.storage.local without the `local:` prefix. */
export function wxtKeyToChromeLocalKey(wxtKey: string): string {
  return wxtKey.startsWith('local:') ? wxtKey.slice('local:'.length) : wxtKey
}

export async function getChromeLocalValue<T>(wxtKey: string): Promise<T | undefined> {
  const bare = wxtKeyToChromeLocalKey(wxtKey)
  const row = await chrome.storage.local.get([bare, wxtKey])
  return (row[bare] ?? row[wxtKey]) as T | undefined
}

export async function setChromeLocalValue(wxtKey: string, value: unknown): Promise<void> {
  const bare = wxtKeyToChromeLocalKey(wxtKey)
  await chrome.storage.local.set({ [bare]: value })
}

export async function migrateDuplexKeyToBare(wxtKey: string): Promise<void> {
  const bare = wxtKeyToChromeLocalKey(wxtKey)
  const row = await chrome.storage.local.get([bare, wxtKey])
  if (row[bare] != null || row[wxtKey] == null) return
  await chrome.storage.local.set({ [bare]: row[wxtKey] })
  await chrome.storage.local.remove(wxtKey)
}