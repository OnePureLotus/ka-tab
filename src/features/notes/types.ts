import * as v from 'valibot'

export const NoteSchema = v.object({
  id: v.string(),
  content: v.string(),
  sourceUrl: v.optional(v.string()),
  sourceDomain: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  hash: v.string(),
})

export type Note = v.InferOutput<typeof NoteSchema>
