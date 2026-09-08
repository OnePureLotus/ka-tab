import * as v from 'valibot'

export const BoardSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  collectionIds: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

export type Board = v.InferOutput<typeof BoardSchema>

export const DEFAULT_BOARD_NAME = 'Default'
