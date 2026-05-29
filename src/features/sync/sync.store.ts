import { createSignal } from 'solid-js'
import type { ConflictRecord } from './types'
import { getSyncMeta, setSyncMeta } from './storage-sync'

const [conflicts, setConflicts] = createSignal<ConflictRecord[]>([])
const [loading, setLoading] = createSignal(false)

export const syncStore = { conflicts, loading }

export async function loadConflicts(): Promise<void> {
  setLoading(true)
  try {
    const meta = await getSyncMeta()
    setConflicts(meta?.pendingConflicts ?? [])
  } finally {
    setLoading(false)
  }
}

export function addConflict(record: ConflictRecord): void {
  setConflicts((prev) => {
    const filtered = prev.filter((c) => c.key !== record.key)
    return [...filtered, record]
  })
  persistConflicts()
}

export function removeConflict(key: string): void {
  setConflicts((prev) => prev.filter((c) => c.key !== key))
  persistConflicts()
}

async function persistConflicts(): Promise<void> {
  try {
    const meta = await getSyncMeta()
    if (!meta) return
    await setSyncMeta({ ...meta, pendingConflicts: conflicts() })
  } catch (err) {
    console.error('[KaTab] syncStore: failed to persist conflicts', err)
  }
}
