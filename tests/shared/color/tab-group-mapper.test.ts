import { describe, it, expect } from 'vitest'
import { mapToTabGroupColor } from '@/shared/color/tab-group-mapper'

const ALL_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']

describe('mapToTabGroupColor', () => {
  it('T-01: #1a73e8 → blue', () => {
    expect(mapToTabGroupColor('#1a73e8')).toBe('blue')
  })

  it('T-02: #d93025 → red', () => {
    expect(mapToTabGroupColor('#d93025')).toBe('red')
  })

  it('T-03: #f9ab00 → yellow', () => {
    expect(mapToTabGroupColor('#f9ab00')).toBe('yellow')
  })

  it('T-04: #188038 → green', () => {
    expect(mapToTabGroupColor('#188038')).toBe('green')
  })

  it('T-05: #e65100 → orange', () => {
    expect(mapToTabGroupColor('#e65100')).toBe('orange')
  })

  it('T-06: 偏紫色 #a020a0 → purple', () => {
    expect(mapToTabGroupColor('#a020a0')).toBe('purple')
  })

  it('T-07: 返回值必须在 9 种枚举内', () => {
    const testColors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000', '#4f46e5']
    for (const hex of testColors) {
      expect(ALL_COLORS).toContain(mapToTabGroupColor(hex))
    }
  })

  it('T-08: 极端黑色 #000000 不崩溃，返回合法枚举值', () => {
    expect(() => mapToTabGroupColor('#000000')).not.toThrow()
    expect(ALL_COLORS).toContain(mapToTabGroupColor('#000000'))
  })

  it('T-09: 极端白色 #ffffff 不崩溃，返回合法枚举值', () => {
    expect(() => mapToTabGroupColor('#ffffff')).not.toThrow()
    expect(ALL_COLORS).toContain(mapToTabGroupColor('#ffffff'))
  })

  it('T-10: 对 DEFAULT_COLOR_PALETTE 所有颜色均能映射（无 undefined）', async () => {
    const { DEFAULT_COLOR_PALETTE } = await import('@/features/settings/types')
    for (const entry of DEFAULT_COLOR_PALETTE) {
      const result = mapToTabGroupColor(entry.color)
      expect(result).toBeTruthy()
      expect(ALL_COLORS).toContain(result)
    }
  })
})
