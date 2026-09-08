import type { ConflictRecord, SyncMeta } from '@/features/sync/types'
import { getWebDavConfig } from '@/features/sync/webdav-config'
import { MessageType } from '@/shared/messaging/types'
import { getSyncMeta, setSyncMeta } from '@/shared/storage/client'
import { nanoid } from 'nanoid'
import { WebDavError, downloadSnapshot, uploadSnapshot } from './client'
import {
  applySnapshotReplace,
  buildSnapshot,
  detectConflicts,
  hasLocalChangesSince,
  parseSnapshot,
} from './snapshot'
import type { SyncRuntimeStatus } from './types'

const DEBOUNCE_MS = 3000

const INTERNAL_KEYS = new Set([
  'katab:sync_meta',
  'katab:webdav_config',
  'katab:migration_v1_boards',
  'katab:migration_chrome_sync_v1',
])

function isUserDataKey(key: string): boolean {
  if (INTERNAL_KEYS.has(key)) return false
  return key.startsWith('katab:')
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let syncing = false
let applyingRemote = false

export function isApplyingRemoteSnapshot(): boolean {
  return applyingRemote
}

const runtimeStatus: SyncRuntimeStatus = {
  phase: 'idle',
  lastSuccessAt: null,
  lastError: null,
  lastDirection: null,
}

export function getSyncRuntimeStatus(): SyncRuntimeStatus {
  return { ...runtimeStatus }
}

function normalizeSyncMeta(meta: SyncMeta): SyncMeta {
  return {
    ...meta,
    lastRemoteExportedAt: meta.lastRemoteExportedAt ?? 0,
    lastLocalChangeAt: meta.lastLocalChangeAt ?? 0,
    pendingConflicts: meta.pendingConflicts ?? [],
  }
}

export async function ensureSyncMeta(): Promise<SyncMeta> {
  const existing = await getSyncMeta()
  if (existing) return normalizeSyncMeta(existing)
  const meta: SyncMeta = {
    deviceId: nanoid(),
    lastSyncAt: 0,
    lastRemoteExportedAt: 0,
    lastLocalChangeAt: 0,
    pendingConflicts: [],
  }
  await setSyncMeta(meta)
  return meta
}

function setPhase(phase: SyncRuntimeStatus['phase'], error?: string) {
  runtimeStatus.phase = phase
  runtimeStatus.lastError = error ?? null
}

function notifySyncDataReload(): void {
  chrome.runtime.sendMessage({ type: MessageType.SYNC_DATA_APPLIED }).catch(() => {})
}

async function touchLocalChange(): Promise<void> {
  if (applyingRemote) return
  const meta = await ensureSyncMeta()
  await setSyncMeta({ ...meta, lastLocalChangeAt: Date.now() })
}

export function scheduleDebouncedPush(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    push().catch((err) => console.error('[KaTab] debounced push failed', err))
  }, DEBOUNCE_MS)
}

export function initSyncEngine(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || applyingRemote) return
    const keys = Object.keys(changes)
    if (!keys.some(isUserDataKey)) return
    void touchLocalChange()
    void getWebDavConfig().then((cfg) => {
      if (cfg.enabled) scheduleDebouncedPush()
    })
  })

  void getWebDavConfig().then((cfg) => {
    if (cfg.enabled) {
      pull().catch((err) => console.error('[KaTab] startup pull failed', err))
    }
  })
}

export async function pull(): Promise<{ ok: boolean; error?: string }> {
  const config = await getWebDavConfig()
  if (!config.enabled) return { ok: false, error: 'WebDAV sync is disabled' }

  if (syncing) return { ok: false, error: 'Sync already in progress' }
  syncing = true
  setPhase('syncing')

  try {
    const meta = await ensureSyncMeta()
    const raw = await downloadSnapshot(config)
    if (!raw) {
      setPhase('idle')
      runtimeStatus.lastDirection = 'pull'
      return { ok: true }
    }

    const remote = parseSnapshot(raw)
    const local = await buildSnapshot(meta.deviceId)
    const conflicts = detectConflicts(local, remote, meta.lastSyncAt, meta.lastLocalChangeAt)

    if (conflicts.length > 0) {
      const merged = [...meta.pendingConflicts]
      for (const c of conflicts) {
        if (!merged.some((m) => m.key === c.key)) merged.push(c)
      }
      await setSyncMeta({ ...meta, pendingConflicts: merged })
      setPhase('error', 'Sync conflicts detected — resolve in the new tab page')
      return { ok: false, error: 'Conflicts detected' }
    }

    applyingRemote = true
    try {
      await applySnapshotReplace(remote)
    } finally {
      applyingRemote = false
    }

    await setSyncMeta({
      ...meta,
      lastSyncAt: remote.exportedAt,
      lastRemoteExportedAt: remote.exportedAt,
      lastLocalChangeAt: remote.exportedAt,
    })
    notifySyncDataReload()
    runtimeStatus.lastSuccessAt = Date.now()
    runtimeStatus.lastDirection = 'pull'
    setPhase('idle')
    return { ok: true }
  } catch (err) {
    const message = err instanceof WebDavError ? err.message : String(err)
    setPhase('error', message)
    return { ok: false, error: message }
  } finally {
    syncing = false
  }
}

export async function push(): Promise<{ ok: boolean; error?: string }> {
  const config = await getWebDavConfig()
  if (!config.enabled) return { ok: false, error: 'WebDAV sync is disabled' }

  const meta = await ensureSyncMeta()
  if (meta.pendingConflicts.length > 0) {
    return { ok: false, error: 'Resolve pending conflicts before syncing' }
  }

  if (syncing) return { ok: false, error: 'Sync already in progress' }
  syncing = true
  setPhase('syncing')

  try {
    const local = await buildSnapshot(meta.deviceId)
    const rawRemote = await downloadSnapshot(config)

    if (rawRemote) {
      const remote = parseSnapshot(rawRemote)
      const localModified = hasLocalChangesSince(meta.lastSyncAt, local, meta.lastLocalChangeAt)
      if (remote.exportedAt > meta.lastSyncAt && localModified) {
        const conflicts = detectConflicts(local, remote, meta.lastSyncAt, meta.lastLocalChangeAt)
        if (conflicts.length > 0) {
          const merged = [...meta.pendingConflicts]
          for (const c of conflicts) {
            if (!merged.some((m) => m.key === c.key)) merged.push(c)
          }
          await setSyncMeta({ ...meta, pendingConflicts: merged })
          setPhase('error', 'Sync conflicts detected — resolve in the new tab page')
          return { ok: false, error: 'Conflicts detected' }
        }
      }
    }

    const body = JSON.stringify(local, null, 2)
    await uploadSnapshot(config, body)
    await setSyncMeta({
      ...meta,
      lastSyncAt: local.exportedAt,
      lastRemoteExportedAt: local.exportedAt,
      lastLocalChangeAt: local.exportedAt,
    })
    runtimeStatus.lastSuccessAt = Date.now()
    runtimeStatus.lastDirection = 'push'
    setPhase('idle')
    return { ok: true }
  } catch (err) {
    const message = err instanceof WebDavError ? err.message : String(err)
    setPhase('error', message)
    return { ok: false, error: message }
  } finally {
    syncing = false
  }
}

export async function syncNow(): Promise<{ ok: boolean; error?: string }> {
  const pullResult = await pull()
  if (!pullResult.ok && pullResult.error !== 'Conflicts detected') {
    return pullResult
  }
  const pushResult = await push()
  if (pushResult.ok) runtimeStatus.lastDirection = 'both'
  return pushResult
}

export async function resolveConflictAndPush(
  key: string,
  choice: 'local' | 'remote',
  conflict: ConflictRecord,
): Promise<void> {
  const meta = await ensureSyncMeta()
  const winner = choice === 'local' ? conflict.localValue : conflict.remoteValue
  const { applyConflictWinner } = await import('./snapshot')
  await applyConflictWinner(key, winner)
  await setSyncMeta({
    ...meta,
    pendingConflicts: meta.pendingConflicts.filter((c) => c.key !== key),
    lastSyncAt: Date.now(),
    lastLocalChangeAt: Date.now(),
  })
  if ((await getWebDavConfig()).enabled) {
    await push()
  }
}
