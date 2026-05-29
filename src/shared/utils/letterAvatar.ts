/** Deterministic letter avatar color + initial from a title/URL string */

const AVATAR_COLORS = [
  '#f87171', // red
  '#fb923c', // orange
  '#fbbf24', // amber
  '#4ade80', // green
  '#34d399', // emerald
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#818cf8', // indigo
  '#a78bfa', // violet
  '#f472b6', // pink
  '#2dd4bf', // teal
  '#a3e635', // lime
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff
  }
  return h
}

export function getLetterAvatar(title: string): { color: string; letter: string } {
  const clean = title.trim()
  const letter = (clean[0] ?? '?').toUpperCase()
  const color = AVATAR_COLORS[hash(clean) % AVATAR_COLORS.length] ?? '#818cf8'
  return { color, letter }
}
