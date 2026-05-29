import { nanoid } from 'nanoid'
import { hashContentSync } from '@/shared/utils/hash'
import type { Note } from './types'

export function createNote(
  content: string,
  options?: Partial<Pick<Note, 'sourceUrl' | 'sourceDomain'>>,
): Note {
  const now = Date.now()
  const id = nanoid()
  const hash = hashContentSync({ content })

  return {
    id,
    content,
    sourceUrl: options?.sourceUrl,
    sourceDomain: options?.sourceDomain,
    createdAt: now,
    updatedAt: now,
    hash,
  }
}

export function updateNoteContent(note: Note, content: string): Note {
  const updatedAt = Date.now()
  const hash = hashContentSync({ content })

  return { ...note, content, updatedAt, hash }
}
