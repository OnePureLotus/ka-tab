import { defineConfig, presetAttributify, presetUno } from 'unocss'
import { presetWind } from '@unocss/preset-wind'

export default defineConfig({
  presets: [presetWind(), presetAttributify()],
  theme: {
    colors: {
      'katab-accent': 'var(--katab-color-accent)',
      'katab-surface': 'var(--katab-color-surface)',
      'katab-border': 'var(--katab-color-border)',
    },
  },
  shortcuts: {
    card: 'rounded-xl bg-katab-surface border border-katab-border p-4 shadow-sm',
    'btn-primary':
      'px-4 py-2 rounded-lg bg-katab-accent text-white font-medium hover:opacity-90 transition-opacity',
    'btn-ghost': 'px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
  },
})
