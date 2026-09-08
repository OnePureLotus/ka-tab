export function getFaviconUrl(rawUrl: string): string {
  try {
    const domain = new URL(rawUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

export function isValidUrl(rawUrl: string): boolean {
  try {
    new URL(rawUrl)
    return true
  } catch {
    return false
  }
}
