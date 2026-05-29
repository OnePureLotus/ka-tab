import { describe, it, expect } from 'vitest'
import * as v from 'valibot'
import {
  SettingsSchema,
  ColorEntrySchema,
  DEFAULT_SETTINGS,
  DEFAULT_COLOR_PALETTE,
} from '@/features/settings/types'

// ─── 8.1 主题 ─────────────────────────────────────────────────────────────────

describe('主题 (SE-01 / SE-02 / SE-03 / SE-04)', () => {
  it('SE-01: 默认主题为 system', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('system')
  })

  it('SE-02: light 是合法的 theme 值', () => {
    const result = v.safeParse(SettingsSchema, { ...DEFAULT_SETTINGS, theme: 'light' })
    expect(result.success).toBe(true)
  })

  it('SE-03: dark 是合法的 theme 值', () => {
    const result = v.safeParse(SettingsSchema, { ...DEFAULT_SETTINGS, theme: 'dark' })
    expect(result.success).toBe(true)
  })

  it('SE-04: system 是合法的 theme 值', () => {
    const result = v.safeParse(SettingsSchema, { ...DEFAULT_SETTINGS, theme: 'system' })
    expect(result.success).toBe(true)
  })
})

// ─── 8.2 强调色 ───────────────────────────────────────────────────────────────

describe('强调色 (SE-06 / SE-07 / SE-08)', () => {
  it('SE-06: 默认强调色为 #6366f1', () => {
    expect(DEFAULT_SETTINGS.accentColor).toBe('#6366f1')
  })

  it('SE-07: 合法 hex 颜色通过校验', () => {
    const result = v.safeParse(SettingsSchema, { ...DEFAULT_SETTINGS, accentColor: '#059669' })
    expect(result.success).toBe(true)
  })

  it('SE-08: 非 hex 格式被 Schema 拒绝', () => {
    const result = v.safeParse(SettingsSchema, { ...DEFAULT_SETTINGS, accentColor: 'blue' })
    expect(result.success).toBe(false)
  })
})

// ─── 8.3 调色板管理 ───────────────────────────────────────────────────────────

describe('调色板 (SE-10 / SE-12 / SE-13 / SE-14)', () => {
  it('SE-10: 默认调色板含 6 个预设颜色', () => {
    expect(DEFAULT_COLOR_PALETTE).toHaveLength(6)
    const ids = DEFAULT_COLOR_PALETTE.map((e) => e.id)
    expect(ids).toContain('indigo')
    expect(ids).toContain('green')
    expect(ids).toContain('blue')
    expect(ids).toContain('pink')
    expect(ids).toContain('orange')
    expect(ids).toContain('teal')
  })

  it('SE-12: 每个调色板条目字段完整（id/name/color）', () => {
    for (const entry of DEFAULT_COLOR_PALETTE) {
      expect(entry.id).toBeTruthy()
      expect(entry.name).toBeTruthy()
      expect(entry.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('SE-13: 非 hex 颜色格式被 ColorEntrySchema 拒绝', () => {
    const result = v.safeParse(ColorEntrySchema, {
      id: 'test',
      name: 'Test',
      color: 'rgb(0,0,0)',
    })
    expect(result.success).toBe(false)
  })

  it('SE-14: tabGroupColor 字段为可选（省略不报错）', () => {
    const result = v.safeParse(ColorEntrySchema, {
      id: 'test',
      name: 'Test',
      color: '#123456',
    })
    expect(result.success).toBe(true)
  })
})

// ─── 8.4 打开 Collection 模式 ─────────────────────────────────────────────────

describe('openCollectionMode (SE-15 / SE-16 / SE-17 / SE-18)', () => {
  it('SE-15: 默认模式为 tab-group', () => {
    expect(DEFAULT_SETTINGS.openCollectionMode).toBe('tab-group')
  })

  it('SE-16: new-window 是合法值', () => {
    const result = v.safeParse(SettingsSchema, {
      ...DEFAULT_SETTINGS,
      openCollectionMode: 'new-window',
    })
    expect(result.success).toBe(true)
  })

  it('SE-17: tab-group 是合法值', () => {
    const result = v.safeParse(SettingsSchema, {
      ...DEFAULT_SETTINGS,
      openCollectionMode: 'tab-group',
    })
    expect(result.success).toBe(true)
  })

  it('SE-18: 非法 mode 值被 Schema 拒绝', () => {
    const result = v.safeParse(SettingsSchema, {
      ...DEFAULT_SETTINGS,
      openCollectionMode: 'popup',
    })
    expect(result.success).toBe(false)
  })
})

// ─── 8.5 域名黑名单 ───────────────────────────────────────────────────────────

describe('域名黑名单 (SE-20)', () => {
  it('SE-20: 默认黑名单为空数组', () => {
    expect(DEFAULT_SETTINGS.blockedDomains).toEqual([])
  })
})

// ─── 8.6 SettingsSchema 整体校验 ─────────────────────────────────────────────

describe('SettingsSchema 整体校验 (SE-27 / SE-28 / SE-29)', () => {
  it('SE-27: DEFAULT_SETTINGS 通过 SettingsSchema 校验', () => {
    expect(() => v.parse(SettingsSchema, DEFAULT_SETTINGS)).not.toThrow()
  })

  it('SE-28: 缺少必填字段 theme 时校验失败', () => {
    const { theme: _t, ...withoutTheme } = DEFAULT_SETTINGS
    const result = v.safeParse(SettingsSchema, withoutTheme)
    expect(result.success).toBe(false)
  })

  it('SE-29: 省略 colorPalette 时自动填充 DEFAULT_COLOR_PALETTE', () => {
    const { colorPalette: _cp, ...withoutPalette } = DEFAULT_SETTINGS
    const result = v.safeParse(SettingsSchema, withoutPalette)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.colorPalette).toEqual(DEFAULT_COLOR_PALETTE)
    }
  })
})
