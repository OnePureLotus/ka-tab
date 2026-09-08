import type { WebDavConfig } from '@/features/sync/webdav/types'
import { DEFAULT_WEBDAV_CONFIG } from '@/features/sync/webdav/types'
import { STORAGE_KEYS, storage } from '@/shared/storage/client'

export async function getWebDavConfig(): Promise<WebDavConfig> {
  return (
    (await storage.getItem<WebDavConfig>(STORAGE_KEYS.WEBDAV_CONFIG)) ?? {
      ...DEFAULT_WEBDAV_CONFIG,
    }
  )
}

export async function setWebDavConfig(config: WebDavConfig): Promise<void> {
  await storage.setItem(STORAGE_KEYS.WEBDAV_CONFIG, config)
}
