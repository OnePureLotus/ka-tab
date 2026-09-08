import type { Board } from '@/features/boards/types'
import type { Collection } from '@/features/collections/types'
import type { Note } from '@/features/notes/types'
import type { Settings } from '@/features/settings/types'
import * as v from 'valibot'

export const WebDavConfigSchema = v.object({
  enabled: v.boolean(),
  baseUrl: v.string(),
  remotePath: v.string(),
  username: v.string(),
  password: v.string(),
})

export type WebDavConfig = v.InferOutput<typeof WebDavConfigSchema>

export const DEFAULT_WEBDAV_CONFIG: WebDavConfig = {
  enabled: false,
  baseUrl: '',
  remotePath: '/katab-sync.json',
  username: '',
  password: '',
}

export const SyncSnapshotSchema = v.object({
  schemaVersion: v.literal(1),
  exportedAt: v.number(),
  deviceId: v.string(),
  boards: v.array(v.unknown()),
  collections: v.array(v.unknown()),
  notes: v.array(v.unknown()),
  settings: v.unknown(),
})

export type SyncSnapshot = {
  schemaVersion: 1
  exportedAt: number
  deviceId: string
  boards: Board[]
  collections: Collection[]
  notes: Note[]
  settings: Settings
}

export type SyncPhase = 'idle' | 'syncing' | 'error'

export type SyncRuntimeStatus = {
  phase: SyncPhase
  lastSuccessAt: number | null
  lastError: string | null
  lastDirection: 'push' | 'pull' | 'both' | null
}
