const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/**
 * Format a timestamp as a relative time string in Chinese.
 * e.g. "2 分钟前", "3 小时前", "昨天", "5 天前"
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp

  if (diff < MINUTE) return '刚刚'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  if (diff < 2 * DAY) return '昨天'
  return `${Math.floor(diff / DAY)} 天前`
}
