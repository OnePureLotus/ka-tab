import { FAVICON_FETCH_BATCH_SIZE, FAVICON_RATE_WINDOW_MS } from '@/shared/constants'

const WINDOW_MS = FAVICON_RATE_WINDOW_MS

let windowStartMs = Date.now()
let fetchesInWindow = 0

function rollWindow(): void {
  const now = Date.now()
  if (now - windowStartMs >= WINDOW_MS) {
    windowStartMs = now
    fetchesInWindow = 0
  }
}

export function remainingFaviconFetchQuota(): number {
  rollWindow()
  return Math.max(0, FAVICON_FETCH_BATCH_SIZE - fetchesInWindow)
}

export function tryConsumeFaviconFetchSlot(): boolean {
  rollWindow()
  if (fetchesInWindow >= FAVICON_FETCH_BATCH_SIZE) return false
  fetchesInWindow += 1
  return true
}