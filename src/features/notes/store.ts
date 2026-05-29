import { createStore, produce } from 'solid-js/store'
import type { Note } from './types'
import {
  getAllNotes,
  setNote as persistNote,
  deleteNote as removeFromStorage,
} from '@/shared/storage/client'

export interface NotesState {
  items: Note[]
  loading: boolean
  error: string | null
}

const [notesStore, setNotesStore] = createStore<NotesState>({
  items: [],
  loading: false,
  error: null,
})

export { notesStore, setNotesStore }

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function loadNotes(): Promise<void> {
  setNotesStore('loading', true)
  try {
    const items = await getAllNotes()
    setNotesStore(
      produce((s) => {
        s.items = items
        s.loading = false
        s.error = null
      }),
    )
  } catch (err) {
    console.error('[KaTab] Failed to load notes', err)
    setNotesStore(
      produce((s) => {
        s.loading = false
        s.error = String(err)
      }),
    )
  }
}

export async function addNote(note: Note): Promise<void> {
  await persistNote(note)
  setNotesStore(
    produce((s) => {
      s.items.push(note)
    }),
  )
}

export async function updateNote(note: Note): Promise<void> {
  await persistNote(note)
  setNotesStore(
    produce((s) => {
      const idx = s.items.findIndex((n) => n.id === note.id)
      if (idx !== -1) s.items[idx] = note
    }),
  )
}

export async function removeNote(id: string): Promise<void> {
  await removeFromStorage(id)
  setNotesStore(
    produce((s) => {
      s.items = s.items.filter((n) => n.id !== id)
    }),
  )
}
