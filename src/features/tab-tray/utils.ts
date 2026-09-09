import type { TabEntry } from './types'

export function normalizeTrayUrl(url: string): string {
  return url?.replace(/\/+$/, '') ?? ''
}

export function isUrlCurrentlyOpen(url: string, openTabs: TabEntry[]): boolean {
  const key = normalizeTrayUrl(url)
  return openTabs.some((t) => normalizeTrayUrl(t.url) === key)
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
