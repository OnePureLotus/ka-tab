import { DEFAULT_SETTINGS } from '@/features/settings/types'
import { ensureSyncMeta, runApplyingRemote } from '@/features/sync/webdav/engine'
import { applySnapshotReplace, buildSnapshot, parseSnapshot } from '@/features/sync/webdav/snapshot'
import type { SyncSnapshot } from '@/features/sync/webdav/types'
import { MessageType } from '@/shared/messaging/types'
import { setSyncMeta } from '@/shared/storage/client'

type LegacyBackup = {
  schemaVersion?: number
  exportedAt?: number
  deviceId?: string
  boards?: SyncSnapshot['boards']
  collections?: SyncSnapshot['collections']
  notes?: SyncSnapshot['notes']
  settings?: Partial<SyncSnapshot['settings']>
}

export function parseImportSnapshot(raw: string, deviceId: string): SyncSnapshot {
  try {
    return parseSnapshot(raw)
  } catch {
    const data = JSON.parse(raw) as LegacyBackup
    if (data.schemaVersion !== undefined && data.schemaVersion !== 1) {
      throw new Error('Unsupported snapshot schema version')
    }
    const hasData =
      data.boards !== undefined ||
      data.collections !== undefined ||
      data.notes !== undefined ||
      data.settings !== undefined
    if (!hasData) {
      throw new Error('Invalid backup file: missing data')
    }
    return {
      schemaVersion: 1,
      exportedAt: data.exportedAt ?? Date.now(),
      deviceId: data.deviceId ?? deviceId,
      boards: data.boards ?? [],
      collections: data.collections ?? [],
      notes: data.notes ?? [],
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
    }
  }
}

export async function exportSnapshotJson(): Promise<{ json: string; filename: string }> {
  const meta = await ensureSyncMeta()
  const snapshot = await buildSnapshot(meta.deviceId)
  const json = JSON.stringify(snapshot, null, 2)
  const date = new Date().toISOString().slice(0, 10)
  return { json, filename: `katab-sync-${date}.json` }
}

export type ImportSnapshotResult =
  | { ok: true; stats: { boards: number; collections: number; notes: number } }
  | { ok: false; error: string }

export async function importSnapshotJson(raw: string): Promise<ImportSnapshotResult> {
  try {
    const meta = await ensureSyncMeta()
    const snapshot = parseImportSnapshot(raw, meta.deviceId)

    await runApplyingRemote(() => applySnapshotReplace(snapshot))

    await setSyncMeta({
      ...meta,
      lastSyncAt: snapshot.exportedAt,
      lastRemoteExportedAt: snapshot.exportedAt,
      lastLocalChangeAt: snapshot.exportedAt,
      pendingConflicts: [],
    })

    chrome.runtime.sendMessage({ type: MessageType.SYNC_DATA_APPLIED }).catch(() => {})

    return {
      ok: true,
      stats: {
        boards: snapshot.boards.length,
        collections: snapshot.collections.length,
        notes: snapshot.notes.length,
      },
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
