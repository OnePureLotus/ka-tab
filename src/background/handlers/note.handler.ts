import type { MessageType, NoteSavePayload } from '@/shared/messaging/types'
import { createNote } from '@/features/notes/service'
import { storage, STORAGE_KEYS } from '@/shared/storage/client'

export function registerNoteHandlers(
  message: { type: MessageType; payload: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  switch (message.type) {
    case 'NOTE_SAVE': {
      const payload = message.payload as NoteSavePayload
      handleNoteSave(payload).then(sendResponse).catch(console.error)
      return true
    }
    default:
      return false
  }
}

async function handleNoteSave(payload: NoteSavePayload): Promise<void> {
  const note = createNote(payload.content, {
    sourceUrl: payload.sourceUrl,
    sourceDomain: payload.sourceDomain,
  })

  const index = (await storage.getItem<string[]>(STORAGE_KEYS.NOTES_INDEX)) ?? []
  await storage.setItem(STORAGE_KEYS.NOTES_INDEX, [...index, note.id])
  await storage.setItem(STORAGE_KEYS.NOTE(note.id), note)
}
