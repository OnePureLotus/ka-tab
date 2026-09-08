import { isConflict, resolveConflict } from '@/features/sync/conflict-resolver'
import type { ConflictRecord } from '@/features/sync/types'
import { describe, expect, it } from 'vitest'

const LAST_SYNC = 1000
const BEFORE_SYNC = 999
const AFTER_SYNC = 1001

describe('isConflict', () => {
  it('S-01: hash 相同 → 无冲突', () => {
    expect(isConflict('abc', 'abc', AFTER_SYNC, AFTER_SYNC, LAST_SYNC)).toBe(false)
  })

  it('S-02: 本地无未同步变更（localUpdatedAt <= lastSyncAt）→ 无冲突', () => {
    expect(isConflict('local', 'remote', BEFORE_SYNC, AFTER_SYNC, LAST_SYNC)).toBe(false)
  })

  it('S-03: 远端无变更（remoteUpdatedAt <= lastSyncAt）→ 无冲突', () => {
    expect(isConflict('local', 'remote', AFTER_SYNC, BEFORE_SYNC, LAST_SYNC)).toBe(false)
  })

  it('S-04: 三个条件全满足 → 有冲突', () => {
    expect(isConflict('localHash', 'remoteHash', AFTER_SYNC, AFTER_SYNC, LAST_SYNC)).toBe(true)
  })

  it('S-05: localUpdatedAt 恰好等于 lastSyncAt → 无冲突（> 非 >=）', () => {
    expect(isConflict('local', 'remote', LAST_SYNC, AFTER_SYNC, LAST_SYNC)).toBe(false)
  })

  it('S-06: remoteUpdatedAt 恰好等于 lastSyncAt → 无冲突（> 非 >=）', () => {
    expect(isConflict('local', 'remote', AFTER_SYNC, LAST_SYNC, LAST_SYNC)).toBe(false)
  })
})

describe('resolveConflict', () => {
  const conflict: ConflictRecord = {
    key: 'local:katab:collection:abc',
    localValue: { name: 'local version' },
    remoteValue: { name: 'remote version' },
    detectedAt: Date.now(),
  }

  it('S-07: 选择 local → 返回 localValue', () => {
    const result = resolveConflict(conflict, 'local')
    expect(result).toEqual(conflict.localValue)
  })

  it('S-08: 选择 remote → 返回 remoteValue', () => {
    const result = resolveConflict(conflict, 'remote')
    expect(result).toEqual(conflict.remoteValue)
  })

  it('S-09: resolveConflict 不修改原 ConflictRecord', () => {
    const original = { ...conflict }
    resolveConflict(conflict, 'local')
    resolveConflict(conflict, 'remote')
    expect(conflict).toEqual(original)
  })
})
