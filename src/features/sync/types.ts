import * as v from 'valibot'

export const ConflictRecordSchema = v.object({
  key: v.string(),
  entityType: v.optional(v.picklist(['board', 'collection', 'note', 'settings'])),
  localValue: v.unknown(),
  remoteValue: v.unknown(),
  detectedAt: v.number(),
})

export type ConflictRecord = v.InferOutput<typeof ConflictRecordSchema>

export const TombstoneSchema = v.object({
  entityType: v.picklist(['board', 'collection', 'note']),
  id: v.string(),
  deletedAt: v.number(),
})

export type Tombstone = v.InferOutput<typeof TombstoneSchema>

export const SyncMetaSchema = v.object({
  deviceId: v.string(),
  lastSyncAt: v.number(),
  lastRemoteExportedAt: v.number(),
  lastLocalChangeAt: v.number(),
  pendingConflicts: v.array(ConflictRecordSchema),
  dirty: v.boolean(),
  lastRemoteEtag: v.nullable(v.string()),
  lastRemoteRevision: v.number(),
  settingsUpdatedAt: v.number(),
  tombstones: v.array(TombstoneSchema),
})

export type SyncMeta = v.InferOutput<typeof SyncMetaSchema>
