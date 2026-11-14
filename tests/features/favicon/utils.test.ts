import { describe, expect, it } from 'vitest'
import {
  getFaviconFetchCandidates,
  isWeakFaviconUrl,
  resolveStoredFaviconUrl,
} from '@/features/favicon/utils'
import { FAVICON_FETCH_CONCURRENCY, FAVICON_FETCH_TIMEOUT_MS } from '@/shared/constants'
import { normalizeSiteUrl } from '@/shared/utils/site-url'

describe('favicon utils', () => {
  it('normalizeSiteUrl strips trailing slash on path', () => {
    expect(normalizeSiteUrl('https://example.com/foo/')).toBe('https://example.com/foo')
    expect(normalizeSiteUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('isWeakFaviconUrl treats empty and chrome URLs as weak', () => {
    expect(isWeakFaviconUrl('')).toBe(true)
    expect(isWeakFaviconUrl('chrome://newtab')).toBe(true)
    expect(isWeakFaviconUrl('https://cdn.example.com/icon.png')).toBe(false)
  })

  it('resolveStoredFaviconUrl skips google placeholder until cache fills', () => {
    expect(resolveStoredFaviconUrl('', 'https://github.com')).toContain('google.com/s2/favicons')
    expect(
      resolveStoredFaviconUrl(
        'https://www.google.com/s2/favicons?domain=github.com&sz=32',
        'https://github.com',
      ),
    ).toBe('')
    expect(resolveStoredFaviconUrl('https://cdn.example.com/i.png', 'https://github.com')).toBe(
      'https://cdn.example.com/i.png',
    )
  })

  it('uses 2s per-candidate fetch timeout constant', () => {
    expect(FAVICON_FETCH_TIMEOUT_MS).toBe(2_000)
  })

  it('uses concurrency 10 for parallel favicon waves', () => {
    expect(FAVICON_FETCH_CONCURRENCY).toBe(10)
  })

  it('getFaviconFetchCandidates includes google and duckduckgo', () => {
    const urls = getFaviconFetchCandidates('https://example.com/path')
    expect(urls.some((u) => u.includes('google.com/s2/favicons'))).toBe(true)
    expect(urls.some((u) => u.includes('duckduckgo.com'))).toBe(true)
  })
})