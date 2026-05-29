import * as v from 'valibot'

// Chrome TabGroup color enum (9 colors)
export type TabGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange'

export const SiteSchema = v.object({
  id: v.string(),
  url: v.pipe(v.string(), v.url()),
  title: v.string(),
  favicon: v.string(),
  addedAt: v.number(),
})

export type Site = v.InferOutput<typeof SiteSchema>

export const CollectionSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  color: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
  tabGroupColor: v.optional(
    v.picklist(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']),
  ),
  sites: v.array(SiteSchema),
  createdAt: v.number(),
  updatedAt: v.number(),
  hash: v.string(),
})

export type Collection = v.InferOutput<typeof CollectionSchema>
