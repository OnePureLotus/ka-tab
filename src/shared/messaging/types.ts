// ─── Result Pattern ──────────────────────────────────────────────────────────

export type AppError = {
  type:
    | 'STORAGE_QUOTA_EXCEEDED'
    | 'STORAGE_SYNC_FAILED'
    | 'CONFLICT_DETECTED'
    | 'TAB_OPEN_FAILED'
    | 'VALIDATION_ERROR'
    | 'UNKNOWN'
  message: string
  context?: unknown
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }

// ─── Message Types ───────────────────────────────────────────────────────────

/** All chrome.runtime.sendMessage command identifiers — {DOMAIN}_{VERB} */
export const MessageType = {
  // Collection commands
  COLLECTION_OPEN: 'COLLECTION_OPEN',
  COLLECTION_CREATE_TAB_GROUP: 'COLLECTION_CREATE_TAB_GROUP',

  // Tab commands
  TAB_GET_CURRENT: 'TAB_GET_CURRENT',
  TAB_RESTORE: 'TAB_RESTORE',
  TAB_FOCUS: 'TAB_FOCUS',

  // Note commands
  NOTE_SAVE: 'NOTE_SAVE',

  // Sync commands
  SYNC_RESOLVE_CONFLICT: 'SYNC_RESOLVE_CONFLICT',
  SYNC_PUSH: 'SYNC_PUSH',
  SYNC_PULL: 'SYNC_PULL',
  SYNC_NOW: 'SYNC_NOW',
  SYNC_STATUS_GET: 'SYNC_STATUS_GET',
  SYNC_EXPORT_SNAPSHOT: 'SYNC_EXPORT_SNAPSHOT',
  SYNC_IMPORT_SNAPSHOT: 'SYNC_IMPORT_SNAPSHOT',
  SYNC_DATA_APPLIED: 'SYNC_DATA_APPLIED',
  WEBDAV_TEST_CONNECTION: 'WEBDAV_TEST_CONNECTION',
  WEBDAV_SAVE_CONFIG: 'WEBDAV_SAVE_CONFIG',
  WEBDAV_GET_CONFIG: 'WEBDAV_GET_CONFIG',

  // Settings commands
  SETTINGS_GET: 'SETTINGS_GET',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',

  // Data fetch commands (for content script)
  COLLECTIONS_GET_ALL: 'COLLECTIONS_GET_ALL',

  // Port push (SW → newtab)
  TAB_LIST_UPDATED: 'TAB_LIST_UPDATED',
} as const

export type MessageType = (typeof MessageType)[keyof typeof MessageType]

// ─── Payload Types ───────────────────────────────────────────────────────────

export interface CollectionOpenPayload {
  collectionId: string
  mode: 'tab-group' | 'new-window'
}

/** @deprecated use CollectionOpenPayload */
export type OpenCollectionPayload = CollectionOpenPayload

export interface NoteSavePayload {
  content: string
  sourceUrl?: string
  sourceDomain?: string
  collectionId?: string
}

export interface SyncResolveConflictPayload {
  key: string
  choice: 'local' | 'remote'
}

export interface SyncImportSnapshotPayload {
  raw: string
}

/** @deprecated use SyncResolveConflictPayload */
export type ResolveConflictPayload = SyncResolveConflictPayload

export interface TabFocusPayload {
  tabId: number
}

export interface TabListUpdatedPayload {
  openTabs: import('@/features/tab-tray/types').TabEntry[]
  recentlyClosed: import('@/features/tab-tray/types').RecentlyClosedEntry[]
}

export interface SettingsUpdatePayload {
  theme?: 'system' | 'light' | 'dark'
  accentColor?: string
  blockedDomains?: string[]
  openCollectionMode?: 'tab-group' | 'new-window'
}

export interface CollectionsGetAllResult {
  collections: import('@/features/collections/types').Collection[]
}

export interface Message<T = unknown> {
  type: MessageType
  payload?: T
}
