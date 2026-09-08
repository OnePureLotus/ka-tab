import { registerCollectionHandlers } from '@/background/handlers/collection.handler'
import { registerNoteHandlers } from '@/background/handlers/note.handler'
import { registerSyncHandlers } from '@/background/handlers/sync.handler'
import { registerTabHandlers } from '@/background/handlers/tab.handler'
import { initPortManager } from '@/background/port-manager'
import { initTabSnapshot } from '@/background/tab-snapshot.service'
import { createNote } from '@/features/notes/service'
import { migrateFromChromeSync } from '@/features/sync/migrate-from-chrome-sync'
import { initSyncEngine } from '@/features/sync/webdav/engine'
import { STORAGE_KEYS, storage } from '@/shared/storage/client'
import { defineBackground } from 'wxt/utils/define-background'

const CONTEXT_MENU_SAVE_NOTE = 'katab-save-selection'
const CONTEXT_MENU_OPEN_NEWTAB = 'katab-open-newtab'

export default defineBackground(() => {
  initTabSnapshot()
  initPortManager()

  void migrateFromChromeSync().then(() => initSyncEngine())

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_SAVE_NOTE,
      title: 'Save to KaTab',
      contexts: ['selection'],
    })
    chrome.contextMenus.create({
      id: CONTEXT_MENU_OPEN_NEWTAB,
      title: 'Open KaTab',
      contexts: ['action'],
    })
  })

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_SAVE_NOTE) {
      const text = info.selectionText?.trim()
      if (!text) return
      const note = createNote(text, {
        sourceUrl: info.pageUrl,
        sourceDomain: tab?.url ? new URL(tab.url).hostname : undefined,
      })
      const index = (await storage.getItem<string[]>(STORAGE_KEYS.NOTES_INDEX)) ?? []
      await storage.setItem(STORAGE_KEYS.NOTES_INDEX, [...index, note.id])
      await storage.setItem(STORAGE_KEYS.NOTE(note.id), note)
    }
  })

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handled =
      registerCollectionHandlers(message, sender, sendResponse) ||
      registerTabHandlers(message, sender, sendResponse) ||
      registerNoteHandlers(message, sender, sendResponse) ||
      registerSyncHandlers(message, sender, sendResponse)

    return handled
  })
})
