import type { TabEntry } from '@/features/tab-tray/types'
import { isUrlCurrentlyOpen, normalizeTrayUrl } from '@/features/tab-tray/utils'
import { describe, expect, it } from 'vitest'

describe('normalizeTrayUrl', () => {
  it('TU-01: strips trailing slashes', () => {
    expect(normalizeTrayUrl('https://example.com/path/')).toBe('https://example.com/path')
    expect(normalizeTrayUrl('https://example.com/')).toBe('https://example.com')
  })

  it('TU-02: handles empty input', () => {
    expect(normalizeTrayUrl('')).toBe('')
  })
})

describe('isUrlCurrentlyOpen', () => {
  const openTabs: TabEntry[] = [
    {
      id: 1,
      title: 'Example',
      url: 'https://example.com/page/',
      favIconUrl: '',
      windowId: 1,
      active: false,
      pinned: false,
    },
  ]

  it('TU-03: matches normalized URLs', () => {
    expect(isUrlCurrentlyOpen('https://example.com/page', openTabs)).toBe(true)
    expect(isUrlCurrentlyOpen('https://other.com', openTabs)).toBe(false)
  })

  it('TU-04: returns false when no open tabs', () => {
    expect(isUrlCurrentlyOpen('https://example.com/page', [])).toBe(false)
  })
})
