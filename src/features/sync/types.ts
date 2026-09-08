import * as v from 'valibot'

export const ConflictRecordSchema = v.object({
  key: v.string(),
  entityType: v.optional(v.picklist(['board', 'collection', 'note', 'settings'])),
  localValue: v.unknown(),
  remoteValue: v.unknown(),
  detectedAt: v.number(),
})

export type ConflictRecord = v.InferOutput<typeof ConflictRecordSchema>

export const SyncMetaSchema = v.object({
  deviceId: v.string(),
  lastSyncAt: v.number(),
  lastRemoteExportedAt: v.number(),
  lastLocalChangeAt: v.number(),
  pendingConflicts: v.array(ConflictRecordSchema),
})

export type SyncMeta = v.InferOutput<typeof SyncMetaSchema>
