import { defineBackground } from 'wxt/utils/define-background'
import { registerCollectionHandlers } from '@/background/handlers/collection.handler'
import { registerTabHandlers } from '@/background/handlers/tab.handler'
import { registerNoteHandlers } from '@/background/handlers/note.handler'
import { registerSyncHandlers } from '@/background/handlers/sync.handler'
import { initPortManager } from '@/background/port-manager'
import { initTabSnapshot } from '@/background/tab-snapshot.service'
import { createNote } from '@/features/notes/service'
import { storage, STORAGE_KEYS } from '@/shared/storage/client'
import type { SyncMeta } from '@/features/sync/types'

const CONTEXT_MENU_SAVE_NOTE = 'katab-save-selection'
const CONTEXT_MENU_OPEN_NEWTAB = 'katab-open-newtab'

export default defineBackground(() => {
  initTabSnapshot()
  initPortManager()

  // ─── Context Menus ──────────────────────────────────────────────────────────
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

  // ─── Conflict Detection ─────────────────────────────────────────────────────
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'sync') return

    const conflictKeys = Object.keys(changes).filter(
      (key) => key.startsWith('katab:collection:') || key.startsWith('katab:note:'),
    )
    if (conflictKeys.length === 0) return

    const raw = await chrome.storage.local.get('katab:sync_meta')
    const syncMeta = raw['katab:sync_meta'] as SyncMeta | undefined
    if (!syncMeta) return

    const pendingConflicts = [...(syncMeta.pendingConflicts ?? [])]
    let hasNew = false

    for (const key of conflictKeys) {
      const { oldValue, newValue } = changes[key] as {
        oldValue?: Record<string, number>
        newValue?: Record<string, number>
      }
      if (!oldValue || !newValue) continue

      const localUpdatedAt = oldValue.updatedAt ?? 0
      const remoteUpdatedAt = newValue.updatedAt ?? 0

      // Both sides modified after last sync → conflict
      if (
        localUpdatedAt > syncMeta.lastSyncAt &&
        remoteUpdatedAt > syncMeta.lastSyncAt &&
        localUpdatedAt !== remoteUpdatedAt
      ) {
        if (!pendingConflicts.some((c) => c.key === key)) {
          pendingConflicts.push({
            key,
            localValue: oldValue,
            remoteValue: newValue,
            detectedAt: Date.now(),
          })
          hasNew = true
        }
      }
    }

    if (hasNew) {
      await chrome.storage.local.set({ 'katab:sync_meta': { ...syncMeta, pendingConflicts } })
    }
  })

  // ─── Message Handlers ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handled =
      registerCollectionHandlers(message, sender, sendResponse) ||
      registerTabHandlers(message, sender, sendResponse) ||
      registerNoteHandlers(message, sender, sendResponse) ||
      registerSyncHandlers(message, sender, sendResponse)

    return handled // returning true keeps the message channel open for async responses
  })
})
