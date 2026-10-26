import type { ConflictRecord, SyncMeta, Tombstone } from '@/features/sync/types'
import { getWebDavConfig } from '@/features/sync/webdav-config'
import { MessageType } from '@/shared/messaging/types'
import { getSyncMeta, setSyncMeta } from '@/shared/storage/client'
import { nanoid } from 'nanoid'
import { WebDavError, downloadSnapshot, uploadSnapshot } from './client'
import type { UploadCondition } from './client'
import {
  applyConflictWinner,
  applySnapshotReplace,
  buildSnapshot,
  mergeSnapshots,
  mergeTombstones,
  parseSnapshot,
  snapshotContentHash,
} from './snapshot'
import type { SyncRuntimeStatus, SyncSnapshot } from './types'

const PUSH_DEBOUNCE_MS = 2_000
const PERIODIC_MINUTES = 5
const PUSH_ATTEMPTS = 3
const KEEPALIVE_MS = 20_000
const ALARM_PERIODIC = 'katab-webdav-periodic'
const ALARM_PUSH = 'katab-webdav-push'
const ENTITY_KEY_RE = /^katab:(board|collection|note):([^:]+)$/

const INTERNAL_KEYS = new Set([
  'katab:sync_meta',
  'katab:webdav_config',
  'katab:migration_v1_boards',
  'katab:migration_chrome_sync_v1',
])

function normalizeStorageKey(key: string): string {
  return key.startsWith('local:') ? key.slice('local:'.length) : key
}

function isUserDataKey(key: string): boolean {
  if (INTERNAL_KEYS.has(key)) return false
  return key.startsWith('katab:')
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let applyingRemote = false
let tail: Promise<void> = Promise.resolve()

const runtimeStatus: SyncRuntimeStatus = {
  phase: 'idle',
  lastSuccessAt: null,
  lastError: null,
  lastDirection: null,
}

export function isApplyingRemoteSnapshot(): boolean {
  return applyingRemote
}

export async function runApplyingRemote<T>(fn: () => Promise<T>): Promise<T> {
  applyingRemote = true
  try {
    return await fn()
  } finally {
    // Storage listeners can run after setItem resolves. Keep the flag through that turn.
    await new Promise((resolve) => setTimeout(resolve, 0))
    applyingRemote = false
  }
}

export function getSyncRuntimeStatus(): SyncRuntimeStatus {
  return { ...runtimeStatus }
}

function normalizeSyncMeta(meta: Partial<SyncMeta> & { deviceId?: string }): SyncMeta {
  return {
    deviceId: meta.deviceId ?? nanoid(),
    lastSyncAt: meta.lastSyncAt ?? 0,
    lastRemoteExportedAt: meta.lastRemoteExportedAt ?? 0,
    lastLocalChangeAt: meta.lastLocalChangeAt ?? 0,
    pendingConflicts: meta.pendingConflicts ?? [],
    dirty: meta.dirty ?? false,
    lastRemoteEtag: meta.lastRemoteEtag ?? null,
    lastRemoteRevision: meta.lastRemoteRevision ?? 0,
    settingsUpdatedAt: meta.settingsUpdatedAt ?? 0,
    tombstones: meta.tombstones ?? [],
  }
}

function isCompleteSyncMeta(meta: SyncMeta): boolean {
  const record = meta as SyncMeta & {
    dirty?: boolean
    lastRemoteEtag?: string | null
    lastRemoteRevision?: number
    settingsUpdatedAt?: number
    tombstones?: Tombstone[]
  }
  return (
    typeof record.dirty === 'boolean' &&
    (record.lastRemoteEtag === null || typeof record.lastRemoteEtag === 'string') &&
    typeof record.lastRemoteRevision === 'number' &&
    typeof record.settingsUpdatedAt === 'number' &&
    Array.isArray(record.tombstones) &&
    Array.isArray(record.pendingConflicts)
  )
}

export async function ensureSyncMeta(): Promise<SyncMeta> {
  const existing = await getSyncMeta()
  if (existing && isCompleteSyncMeta(existing)) return normalizeSyncMeta(existing)
  const meta = normalizeSyncMeta(existing ?? {})
  await setSyncMeta(meta)
  return meta
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task)
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function setPhase(phase: SyncRuntimeStatus['phase'], error?: string) {
  runtimeStatus.phase = phase
  runtimeStatus.lastError = error ?? null
}

function markSuccess(direction: SyncRuntimeStatus['lastDirection']) {
  runtimeStatus.lastSuccessAt = Date.now()
  runtimeStatus.lastDirection = direction
  setPhase('idle')
}

function notifySyncDataReload(): void {
  const sent = chrome.runtime.sendMessage({ type: MessageType.SYNC_DATA_APPLIED }) as
    | Promise<unknown>
    | undefined
  void sent?.catch(() => {})
}

function pingServiceWorker(): void {
  if (typeof chrome.runtime.getPlatformInfo !== 'function') return
  void chrome.runtime.getPlatformInfo().catch(() => {})
}

async function withKeepAlive<T>(fn: () => Promise<T>): Promise<T> {
  pingServiceWorker()
  const timer = setInterval(pingServiceWorker, KEEPALIVE_MS)
  try {
    return await fn()
  } finally {
    clearInterval(timer)
  }
}

async function loadLocalSnapshot(meta: SyncMeta): Promise<SyncSnapshot> {
  return buildSnapshot(meta.deviceId, {
    revision: meta.lastRemoteRevision,
    tombstones: meta.tombstones,
    settingsUpdatedAt: meta.settingsUpdatedAt,
  })
}

function tombstoneFromChange(key: string, change: chrome.storage.StorageChange): Tombstone | null {
  if (change.newValue !== undefined || change.oldValue == null) return null
  const match = ENTITY_KEY_RE.exec(key)
  const entityType = match?.[1]
  const id = match?.[2]
  if (!id) return null
  if (entityType !== 'board' && entityType !== 'collection' && entityType !== 'note') return null
  return { entityType, id, deletedAt: Date.now() }
}

async function recordLocalEdit(input: {
  tombstones: Tombstone[]
  settingsChanged: boolean
}): Promise<void> {
  const meta = await ensureSyncMeta()
  const now = Date.now()
  await setSyncMeta({
    ...meta,
    dirty: true,
    lastLocalChangeAt: now,
    settingsUpdatedAt: input.settingsChanged ? now : meta.settingsUpdatedAt,
    tombstones: mergeTombstones(meta.tombstones, input.tombstones, now),
  })
}

export function scheduleDebouncedPush(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void push().catch((err) => console.error('[KaTab] debounced push failed', err))
  }, PUSH_DEBOUNCE_MS)
  chrome.alarms.create(ALARM_PUSH, { delayInMinutes: 1 })
}

async function syncScheduleWithConfig(): Promise<void> {
  const config = await getWebDavConfig()
  if (!config.enabled) {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    void chrome.alarms.clear(ALARM_PERIODIC)
    void chrome.alarms.clear(ALARM_PUSH)
    return
  }
  chrome.alarms.create(ALARM_PERIODIC, { periodInMinutes: PERIODIC_MINUTES })
  await syncNow()
}

export function initSyncEngine(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_PERIODIC) {
      void syncNow().catch((err) => console.error('[KaTab] periodic sync failed', err))
    } else if (alarm.name === ALARM_PUSH) {
      void push().catch((err) => console.error('[KaTab] scheduled push failed', err))
    }
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    const entries = Object.entries(changes).map(([key, change]) => ({
      key: normalizeStorageKey(key),
      change,
    }))
    if (entries.some((entry) => entry.key === 'katab:webdav_config')) {
      void syncScheduleWithConfig().catch((err) =>
        console.error('[KaTab] WebDAV config sync failed', err),
      )
    }
    if (applyingRemote) return

    const tombstones: Tombstone[] = []
    let settingsChanged = false
    for (const entry of entries) {
      const tombstone = tombstoneFromChange(entry.key, entry.change)
      if (tombstone) tombstones.push(tombstone)
      if (entry.key === 'katab:settings' && entry.change.newValue !== undefined) {
        settingsChanged = true
      }
    }
    if (!entries.some((entry) => isUserDataKey(entry.key))) return

    void enqueue(async () => {
      await recordLocalEdit({ tombstones, settingsChanged })
      const config = await getWebDavConfig()
      if (config.enabled) scheduleDebouncedPush()
    })
  })

  void syncScheduleWithConfig().catch((err) => console.error('[KaTab] startup sync failed', err))
}

async function finishSyncMeta(input: {
  changeStamp: number
  merged: SyncSnapshot
  dirty: boolean
  etag: string | null
  revision: number
  exportedAt: number
}): Promise<void> {
  const latest = await ensureSyncMeta()
  const interrupted = latest.lastLocalChangeAt !== input.changeStamp
  await setSyncMeta({
    ...latest,
    pendingConflicts: [],
    tombstones: mergeTombstones(input.merged.tombstones, latest.tombstones),
    settingsUpdatedAt: Math.max(input.merged.settingsUpdatedAt, latest.settingsUpdatedAt),
    dirty: input.dirty || interrupted,
    lastRemoteEtag: input.etag,
    lastRemoteRevision: input.revision,
    lastSyncAt: input.exportedAt,
    lastRemoteExportedAt: input.exportedAt,
    lastLocalChangeAt: interrupted ? latest.lastLocalChangeAt : input.exportedAt,
  })
  if (interrupted) scheduleDebouncedPush()
}

async function pullBody(): Promise<{ ok: boolean; error?: string }> {
  const config = await getWebDavConfig()
  if (!config.enabled) return { ok: false, error: 'WebDAV sync is disabled' }

  setPhase('syncing')
  try {
    await withKeepAlive(async () => {
      const meta = await ensureSyncMeta()
      const changeStamp = meta.lastLocalChangeAt
      const downloaded = await downloadSnapshot(config)
      if (!downloaded) {
        if (meta.pendingConflicts.length > 0) {
          await setSyncMeta({ ...meta, pendingConflicts: [] })
        }
        return
      }

      // Same ETag means the file bytes have not changed, even if this device is dirty.
      if (downloaded.etag && meta.lastRemoteEtag === downloaded.etag) {
        if (meta.pendingConflicts.length > 0) {
          await setSyncMeta({ ...meta, pendingConflicts: [] })
        }
        return
      }

      const remote = parseSnapshot(downloaded.body)
      const local = await loadLocalSnapshot(meta)
      const merged = mergeSnapshots(local, remote)
      const localHash = snapshotContentHash(local)
      const mergedHash = snapshotContentHash(merged)
      const remoteHash = snapshotContentHash(remote)
      if (localHash !== mergedHash) {
        await runApplyingRemote(() => applySnapshotReplace(merged))
        notifySyncDataReload()
      }
      await finishSyncMeta({
        changeStamp,
        merged,
        dirty: mergedHash !== remoteHash,
        etag: downloaded.etag,
        revision: remote.revision,
        exportedAt: remote.exportedAt,
      })
    })
    markSuccess('pull')
    return { ok: true }
  } catch (err) {
    const message = err instanceof WebDavError ? err.message : String(err)
    setPhase('error', message)
    return { ok: false, error: message }
  }
}

async function pushAttempt(): Promise<void> {
  const config = await getWebDavConfig()
  if (!config.enabled) return

  const meta = await ensureSyncMeta()
  const changeStamp = meta.lastLocalChangeAt
  const downloaded = await downloadSnapshot(config)
  const local = await loadLocalSnapshot(meta)
  const remote = downloaded ? parseSnapshot(downloaded.body) : null
  const merged = remote ? mergeSnapshots(local, remote) : local
  const localHash = snapshotContentHash(local)
  const mergedHash = snapshotContentHash(merged)
  const remoteHash = remote ? snapshotContentHash(remote) : null

  if (remote && localHash !== mergedHash) {
    await runApplyingRemote(() => applySnapshotReplace(merged))
    notifySyncDataReload()
  }

  if (remote && remoteHash === mergedHash) {
    await finishSyncMeta({
      changeStamp,
      merged,
      dirty: false,
      etag: downloaded?.etag ?? null,
      revision: remote.revision,
      exportedAt: remote.exportedAt,
    })
    return
  }

  const exportedAt = Date.now()
  const revision = (remote?.revision ?? 0) + 1
  const uploaded: SyncSnapshot = {
    ...merged,
    schemaVersion: 2,
    deviceId: meta.deviceId,
    exportedAt,
    revision,
  }
  const condition: UploadCondition | undefined = !remote
    ? { ifNoneMatch: '*' }
    : downloaded?.etag
      ? { ifMatch: downloaded.etag }
      : undefined
  const newEtag =
    (await uploadSnapshot(config, JSON.stringify(uploaded, null, 2), condition)) ?? null
  await finishSyncMeta({
    changeStamp,
    merged: uploaded,
    dirty: false,
    etag: newEtag,
    revision,
    exportedAt,
  })
}

async function pushBody(): Promise<{ ok: boolean; error?: string }> {
  const config = await getWebDavConfig()
  if (!config.enabled) return { ok: false, error: 'WebDAV sync is disabled' }

  setPhase('syncing')
  try {
    await withKeepAlive(async () => {
      for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt++) {
        try {
          await pushAttempt()
          return
        } catch (err) {
          const retry = err instanceof WebDavError && err.status === 412 && attempt < PUSH_ATTEMPTS
          if (!retry) throw err
        }
      }
    })
    markSuccess('push')
    if (!debounceTimer) void chrome.alarms.clear(ALARM_PUSH)
    return { ok: true }
  } catch (err) {
    const message = err instanceof WebDavError ? err.message : String(err)
    setPhase('error', message)
    return { ok: false, error: message }
  }
}

export function pull(): Promise<{ ok: boolean; error?: string }> {
  return enqueue(() => pullBody())
}

export function push(): Promise<{ ok: boolean; error?: string }> {
  return enqueue(() => pushBody())
}

export function syncNow(): Promise<{ ok: boolean; error?: string }> {
  return enqueue(async () => {
    const pullResult = await pullBody()
    if (!pullResult.ok) return pullResult
    const meta = await ensureSyncMeta()
    if (!meta.dirty) {
      runtimeStatus.lastDirection = 'pull'
      return { ok: true }
    }
    const pushResult = await pushBody()
    if (pushResult.ok) runtimeStatus.lastDirection = 'both'
    return pushResult
  })
}

export async function resolveConflictAndPush(
  key: string,
  choice: 'local' | 'remote',
  conflict: ConflictRecord,
): Promise<void> {
  const meta = await ensureSyncMeta()
  const winner = choice === 'local' ? conflict.localValue : conflict.remoteValue
  await applyConflictWinner(key, winner)
  await setSyncMeta({
    ...meta,
    pendingConflicts: meta.pendingConflicts.filter((item) => item.key !== key),
    lastLocalChangeAt: Date.now(),
    dirty: true,
  })
  if ((await getWebDavConfig()).enabled) await push()
}
