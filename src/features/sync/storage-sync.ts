import { storage } from 'wxt/utils/storage'
import { STORAGE_KEYS } from '@/shared/storage/client'
import type { SyncMeta } from './types'

export async function getSyncMeta(): Promise<SyncMeta | null> {
  return storage.getItem<SyncMeta>(STORAGE_KEYS.SYNC_META)
}

export async function setSyncMeta(meta: SyncMeta): Promise<void> {
  await storage.setItem(STORAGE_KEYS.SYNC_META, meta)
}
