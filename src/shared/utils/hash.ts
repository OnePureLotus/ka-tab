/**
 * Computes a SHA-1 hex hash of a JSON-serializable value.
 * Used for conflict detection (remote hash ≠ local hash → potential conflict).
 */
export async function hashContent(value: unknown): Promise<string> {
  const json = JSON.stringify(value)
  const buffer = new TextEncoder().encode(json)
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Sync version for cases where async is not feasible (use sparingly)
// Uses a fast djb2 hash - NOT for security, only for change detection
export function hashContentSync(value: unknown): string {
  const str = JSON.stringify(value)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
