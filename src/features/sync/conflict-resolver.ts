import type { ConflictRecord } from './types'

/**
 * Determines if a storage change represents a conflict.
 * Conflict conditions (all three must be true):
 *  1. Remote hash ≠ local cached hash
 *  2. Local updatedAt > lastSyncAt (local has unsync'd changes)
 *  3. Remote updatedAt > lastSyncAt (remote also has changes)
 */
export function isConflict(
  localHash: string,
  remoteHash: string,
  localUpdatedAt: number,
  remoteUpdatedAt: number,
  lastSyncAt: number,
): boolean {
  return localHash !== remoteHash && localUpdatedAt > lastSyncAt && remoteUpdatedAt > lastSyncAt
}

export function resolveConflict(conflict: ConflictRecord, choice: 'local' | 'remote'): unknown {
  return choice === 'local' ? conflict.localValue : conflict.remoteValue
}
