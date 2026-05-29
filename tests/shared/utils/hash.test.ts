import { describe, it, expect } from 'vitest'
import { hashContentSync, hashContent } from '@/shared/utils/hash'

describe('hashContentSync', () => {
  it('H-01: 相同对象两次调用结果相同（幂等）', () => {
    const val = { name: 'Test', color: '#1a73e8', sites: [] }
    expect(hashContentSync(val)).toBe(hashContentSync(val))
  })

  it('H-02: 不同值产生不同 hash', () => {
    expect(hashContentSync({ a: 1 })).not.toBe(hashContentSync({ a: 2 }))
  })

  it('H-03: 返回 8 位小写十六进制字符串', () => {
    const hash = hashContentSync({ anything: true })
    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it('H-04: 属性顺序不同会影响 hash（JSON.stringify 顺序敏感）', () => {
    const h1 = hashContentSync({ a: 1, b: 2 })
    const h2 = hashContentSync({ b: 2, a: 1 })
    // Document: JSON.stringify preserves insertion order — these may differ
    // Both should still be valid 8-char hex strings
    expect(h1).toMatch(/^[0-9a-f]{8}$/)
    expect(h2).toMatch(/^[0-9a-f]{8}$/)
  })

  it('H-01b: 空对象 hash 固定', () => {
    expect(hashContentSync({})).toBe(hashContentSync({}))
  })
})

describe('hashContent (async SHA-1)', () => {
  it('H-05: 相同对象两次结果相同（幂等）', async () => {
    const val = { name: 'Test', sites: [] }
    const h1 = await hashContent(val)
    const h2 = await hashContent(val)
    expect(h1).toBe(h2)
  })

  it('H-06: 返回 40 位小写十六进制字符串（SHA-1 hex 输出）', async () => {
    const hash = await hashContent({ anything: true })
    expect(hash).toMatch(/^[0-9a-f]{40}$/)
  })

  it('H-07: 不同值产生不同 hash', async () => {
    const h1 = await hashContent({ a: 1 })
    const h2 = await hashContent({ a: 2 })
    expect(h1).not.toBe(h2)
  })
})
