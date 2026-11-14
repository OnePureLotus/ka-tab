/** Canonical site URL for favicon cache keys (trailing slash on path removed). */
export function normalizeSiteUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    let pathname = parsed.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    return `${parsed.origin}${pathname}${parsed.search}`
  } catch {
    return rawUrl.trim()
  }
}