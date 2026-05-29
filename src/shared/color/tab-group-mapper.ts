import { converter } from 'culori'
import type { TabGroupColor } from '@/features/collections/types'

// Chrome TabGroup colors with their approximate HEX values (for nearest-neighbor matching)
const TAB_GROUP_COLOR_MAP: Record<TabGroupColor, string> = {
  grey: '#9e9e9e',
  blue: '#1a73e8',
  red: '#d93025',
  yellow: '#f9ab00',
  green: '#188038',
  pink: '#e91e63',
  purple: '#9c27b0',
  cyan: '#00bcd4',
  orange: '#e65100',
}

const toOklab = converter('oklab')

function colorDistance(hex1: string, hex2: string): number {
  const c1 = toOklab(hex1)
  const c2 = toOklab(hex2)
  if (!c1 || !c2) return Infinity
  return Math.sqrt(Math.pow(c1.l - c2.l, 2) + Math.pow(c1.a - c2.a, 2) + Math.pow(c1.b - c2.b, 2))
}

/**
 * Maps a custom HEX color to the nearest Chrome TabGroup color enum value
 * using Oklab perceptual color distance.
 */
export function mapToTabGroupColor(hex: string): TabGroupColor {
  let nearest: TabGroupColor = 'grey'
  let minDistance = Infinity

  for (const [color, colorHex] of Object.entries(TAB_GROUP_COLOR_MAP) as [
    TabGroupColor,
    string,
  ][]) {
    const distance = colorDistance(hex, colorHex)
    if (distance < minDistance) {
      minDistance = distance
      nearest = color
    }
  }

  return nearest
}
