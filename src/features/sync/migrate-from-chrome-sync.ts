import { storage } from '@/shared/storage/client'

const CHROME_SYNC_PREFIX = 'katab:'
const MIGRATION_FLAG = 'local:katab:migration_chrome_sync_v1'

const DATA_KEY_MAP: Record<string, string> = {
  'katab:meta': 'local:katab:meta',
  'katab:boards:index': 'local:katab:boards:index',
  'katab:collections:index': 'local:katab:collections:index',
  'katab:notes:index': 'local:katab:notes:index',
  'katab:settings': 'local:katab:settings',
}

function mapSyncKeyToLocal(chromeKey: string): string | null {
  if (chromeKey in DATA_KEY_MAP) return DATA_KEY_MAP[chromeKey] ?? null
  if (chromeKey.startsWith('katab:board:')) return `local:${chromeKey}`
  if (chromeKey.startsWith('katab:collection:')) return `local:${chromeKey}`
  if (chromeKey.startsWith('katab:note:')) return `local:${chromeKey}`
  return null
}

/** One-time migration from chrome.storage.sync to chrome.storage.local */
export async function migrateFromChromeSync(): Promise<void> {
  const done = await storage.getItem<boolean>(MIGRATION_FLAG)
  if (done) return

  const syncData = await chrome.storage.sync.get(null)
  const keys = Object.keys(syncData).filter((k) => k.startsWith(CHROME_SYNC_PREFIX))
  if (keys.length === 0) {
    await storage.setItem(MIGRATION_FLAG, true)
    return
  }

  const localPayload: Record<string, unknown> = {}
  const keysToRemove: string[] = []

  for (const key of keys) {
    const localKey = mapSyncKeyToLocal(key)
    if (!localKey) continue
    const wxtKey = localKey as `local:${string}`
    const existing = await storage.getItem(wxtKey)
    if (existing == null) {
      localPayload[key] = syncData[key]
      keysToRemove.push(key)
    }
  }

  if (Object.keys(localPayload).length > 0) {
    const toSet: Record<string, unknown> = {}
    for (const [chromeKey, value] of Object.entries(localPayload)) {
      const localKey = mapSyncKeyToLocal(chromeKey)
      if (localKey) toSet[localKey.replace('local:', '')] = value
    }
    await chrome.storage.local.set(toSet)
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.sync.remove(keysToRemove)
  }

  await storage.setItem(MIGRATION_FLAG, true)
}
