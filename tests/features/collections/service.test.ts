import {
  addSiteToCollection,
  createCollection,
  removeSiteFromCollection,
  renameCollection,
  reorderCollections,
  reorderSitesInCollection,
  updateCollectionColor,
  validateSiteLimit,
} from '@/features/collections/service'
import { CollectionSchema } from '@/features/collections/types'
import type { Collection } from '@/features/collections/types'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BOARD_ID = 'test-board-id'

function makeSite(overrides: { url?: string; title?: string; favicon?: string } = {}) {
  return {
    url: overrides.url ?? 'https://example.com',
    title: overrides.title ?? 'Example',
    favicon: overrides.favicon ?? '',
  }
}

function makeCollectionWith(n: number): Collection {
  let col = createCollection('Test', '#1a73e8', BOARD_ID)
  for (let i = 0; i < n; i++) {
    col = addSiteToCollection(
      col,
      makeSite({ url: `https://example.com/${i}`, title: `Site ${i}` }),
    )
  }
  return col
}

// ─── 1.1 创建 Collection ──────────────────────────────────────────────────────

describe('createCollection', () => {
  it('C-01: 返回包含所有必要字段的完整结构', () => {
    const col = createCollection('Work', '#1a73e8', BOARD_ID)
    expect(col.id).toBeTruthy()
    expect(col.name).toBe('Work')
    expect(col.color).toBe('#1a73e8')
    expect(col.tabGroupColor).toBeTruthy()
    expect(col.sites).toEqual([])
    expect(col.createdAt).toBeGreaterThan(0)
    expect(col.updatedAt).toBeGreaterThan(0)
    expect(col.hash).toBeTruthy()
  })

  it('C-02: 自动映射 tabGroupColor（蓝色 #1a73e8 → blue）', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    expect(col.tabGroupColor).toBe('blue')
  })

  it('C-03: 相同参数生成相同 hash（hash 具确定性）', () => {
    const col1 = createCollection('Work', '#1a73e8', BOARD_ID)
    const col2 = createCollection('Work', '#1a73e8', BOARD_ID)
    expect(col1.hash).toBe(col2.hash)
  })

  it('C-04: sites 初始为空数组', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    expect(col.sites).toEqual([])
  })

  it('C-05: Collection 名称为空字符串时 Schema 校验失败（minLength 1）', () => {
    const result = v.safeParse(CollectionSchema, {
      id: 'x',
      name: '',
      color: '#1a73e8',
      sites: [],
      createdAt: 1,
      updatedAt: 1,
      hash: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('C-06: Collection 名称超 50 字符时 Schema 校验失败（maxLength 50）', () => {
    const result = v.safeParse(CollectionSchema, {
      id: 'x',
      name: 'a'.repeat(51),
      color: '#1a73e8',
      sites: [],
      createdAt: 1,
      updatedAt: 1,
      hash: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('C-07: 合法 hex color 通过 Schema 校验', () => {
    const col = createCollection('Test', '#4f46e5', BOARD_ID)
    const result = v.safeParse(CollectionSchema, col)
    expect(result.success).toBe(true)
  })

  it('C-08: 非 hex color 格式被 Schema 拒绝', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const invalid = { ...col, color: 'red' }
    const result = v.safeParse(CollectionSchema, invalid)
    expect(result.success).toBe(false)
  })
})

// ─── 1.2 添加网站 ─────────────────────────────────────────────────────────────

describe('addSiteToCollection', () => {
  it('C-09: 添加网站后 sites 长度 +1', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const updated = addSiteToCollection(col, makeSite())
    expect(updated.sites).toHaveLength(1)
  })

  it('C-10: 添加网站后 updatedAt 更新', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const before = col.updatedAt
    const updated = addSiteToCollection(col, makeSite())
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('C-11: 添加网站后 hash 与原值不同', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const updated = addSiteToCollection(col, makeSite())
    expect(updated.hash).not.toBe(col.hash)
  })

  it('C-12: 新 site 自动生成 id 和 addedAt', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const updated = addSiteToCollection(col, makeSite())
    const site = updated.sites[0]!
    expect(site.id).toBeTruthy()
    expect(site.addedAt).toBeGreaterThan(0)
  })
})

// ─── 1.3 删除网站 ─────────────────────────────────────────────────────────────

describe('removeSiteFromCollection', () => {
  it('C-13: 删除已存在的网站后 sites 为空', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const withSite = addSiteToCollection(col, makeSite())
    const siteId = withSite.sites[0]?.id
    const result = removeSiteFromCollection(withSite, siteId)
    expect(result.sites).toHaveLength(0)
  })

  it('C-14: 删除不存在的 siteId 不报错且 sites 不变', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const withSite = addSiteToCollection(col, makeSite())
    expect(() => removeSiteFromCollection(withSite, 'nonexistent')).not.toThrow()
    expect(removeSiteFromCollection(withSite, 'nonexistent').sites).toHaveLength(1)
  })

  it('C-15: 删除后 hash 与原值不同', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const withSite = addSiteToCollection(col, makeSite())
    const siteId = withSite.sites[0]?.id
    const result = removeSiteFromCollection(withSite, siteId)
    expect(result.hash).not.toBe(withSite.hash)
  })
})

// ─── 1.4 重命名与更改颜色 ─────────────────────────────────────────────────────

describe('renameCollection', () => {
  it('C-21: 重命名后 name 更新', () => {
    const col = createCollection('Old', '#1a73e8', BOARD_ID)
    const updated = renameCollection(col, 'NewName')
    expect(updated.name).toBe('NewName')
  })

  it('C-21: 重命名后 hash 变更', () => {
    const col = createCollection('Old', '#1a73e8', BOARD_ID)
    const updated = renameCollection(col, 'NewName')
    expect(updated.hash).not.toBe(col.hash)
  })
})

describe('updateCollectionColor', () => {
  it('C-22: 更改颜色自动映射 tabGroupColor（橙色）', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const updated = updateCollectionColor(col, '#e65100')
    expect(updated.tabGroupColor).toBe('orange')
  })

  it('C-23: 手动指定 tabGroupColor 时不自动映射', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const updated = updateCollectionColor(col, '#e65100', 'red')
    expect(updated.tabGroupColor).toBe('red')
  })

  it('C-24: 更改颜色后 hash 变更', () => {
    const col = createCollection('Test', '#1a73e8', BOARD_ID)
    const updated = updateCollectionColor(col, '#e65100')
    expect(updated.hash).not.toBe(col.hash)
  })
})

// ─── 1.5 网站排序 ─────────────────────────────────────────────────────────────

describe('reorderSitesInCollection', () => {
  function makeABC(): Collection {
    let col = createCollection('Test', '#1a73e8', BOARD_ID)
    col = addSiteToCollection(col, makeSite({ url: 'https://a.com', title: 'A' }))
    col = addSiteToCollection(col, makeSite({ url: 'https://b.com', title: 'B' }))
    col = addSiteToCollection(col, makeSite({ url: 'https://c.com', title: 'C' }))
    return col
  }

  it('C-25: from < to → [B, C, A]', () => {
    const result = reorderSitesInCollection(makeABC(), 0, 2)
    expect(result.sites.map((s) => s.title)).toEqual(['B', 'C', 'A'])
  })

  it('C-26: from > to → [C, A, B]', () => {
    const result = reorderSitesInCollection(makeABC(), 2, 0)
    expect(result.sites.map((s) => s.title)).toEqual(['C', 'A', 'B'])
  })

  it('C-27: 相同 index sites 不变', () => {
    let col = createCollection('Test', '#1a73e8', BOARD_ID)
    col = addSiteToCollection(col, makeSite({ title: 'A' }))
    const result = reorderSitesInCollection(col, 0, 0)
    expect(result.sites.map((s) => s.title)).toEqual(['A'])
  })

  it('C-28: 越界 fromIndex 不崩溃', () => {
    expect(() => reorderSitesInCollection(makeABC(), 5, 0)).not.toThrow()
  })

  it('C-29: 排序后 hash 变更', () => {
    const col = makeABC()
    const result = reorderSitesInCollection(col, 0, 1)
    expect(result.hash).not.toBe(col.hash)
  })
})

// ─── 1.6 Collection 列表排序 ──────────────────────────────────────────────────

describe('reorderCollections', () => {
  it('C-30: [A,B,C] from=0 to=2 → [B, C, A]', () => {
    const a = createCollection('A', '#1a73e8', BOARD_ID)
    const b = createCollection('B', '#d93025', BOARD_ID)
    const c = createCollection('C', '#188038', BOARD_ID)
    const result = reorderCollections([a, b, c], 0, 2)
    expect(result.map((col) => col.name)).toEqual(['B', 'C', 'A'])
  })
})

// ─── 1.7 网站数量限制 ─────────────────────────────────────────────────────────

describe('validateSiteLimit', () => {
  it('C-32: 未达阈值（24 个）→ ok, 无 nearLimit / atLimit', () => {
    const col = makeCollectionWith(24)
    expect(validateSiteLimit(col)).toEqual({
      ok: true,
      count: 24,
      atLimit: false,
      nearLimit: false,
    })
  })

  it('C-33: 接近上限（25 个）→ ok=true, nearLimit=true', () => {
    const col = makeCollectionWith(25)
    const status = validateSiteLimit(col)
    expect(status.ok).toBe(true)
    expect(status.nearLimit).toBe(true)
    expect(status.atLimit).toBe(false)
  })

  it('C-34: 中间区间（27 个）→ ok=true, nearLimit=true, atLimit=false', () => {
    const col = makeCollectionWith(27)
    const status = validateSiteLimit(col)
    expect(status.ok).toBe(true)
    expect(status.nearLimit).toBe(true)
    expect(status.atLimit).toBe(false)
  })

  it('C-35: 达到上限（30 个）→ ok=false, atLimit=true', () => {
    const col = makeCollectionWith(30)
    const status = validateSiteLimit(col)
    expect(status.ok).toBe(false)
    expect(status.atLimit).toBe(true)
    expect(status.count).toBe(30)
  })
})
