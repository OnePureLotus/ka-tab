import * as v from 'valibot'

export const ColorEntrySchema = v.object({
  id: v.string(),
  name: v.string(),
  color: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
  tabGroupColor: v.optional(
    v.picklist(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']),
  ),
})

export type ColorEntry = v.InferOutput<typeof ColorEntrySchema>

export const DEFAULT_COLOR_PALETTE: ColorEntry[] = [
  { id: 'indigo', name: 'Indigo', color: '#4f46e5', tabGroupColor: 'blue' },
  { id: 'green', name: 'Green', color: '#059669', tabGroupColor: 'green' },
  { id: 'blue', name: 'Blue', color: '#2563eb', tabGroupColor: 'blue' },
  { id: 'pink', name: 'Pink', color: '#db2777', tabGroupColor: 'pink' },
  { id: 'orange', name: 'Orange', color: '#f97316', tabGroupColor: 'orange' },
  { id: 'teal', name: 'Teal', color: '#0f766e', tabGroupColor: 'cyan' },
]

export const SettingsSchema = v.object({
  theme: v.picklist(['system', 'light', 'dark']),
  accentColor: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
  blockedDomains: v.array(v.string()),
  openCollectionMode: v.picklist(['tab-group', 'new-window']),
  colorPalette: v.optional(v.array(ColorEntrySchema), DEFAULT_COLOR_PALETTE),
  activeBoardId: v.optional(v.string()),
})

export type Settings = v.InferOutput<typeof SettingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accentColor: '#6366f1',
  blockedDomains: [],
  openCollectionMode: 'tab-group',
  colorPalette: DEFAULT_COLOR_PALETTE,
}
