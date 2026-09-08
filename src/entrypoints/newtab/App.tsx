import { runBoardMigration } from '@/features/boards/migrate'
import {
  boardsStore,
  loadBoards,
  setActiveBoard,
  useBoardsStorageSync,
} from '@/features/boards/store'
import CollectionBoard from '@/features/collections/components/CollectionBoard'
import { collectionsStore } from '@/features/collections/store'
import { loadCollections, useCollectionsStorageSync } from '@/features/collections/store'
import NotePanel from '@/features/notes/components/NotePanel'
import type { Settings } from '@/features/settings/types'
import ConflictBanner from '@/features/sync/components/ConflictBanner'
import ConflictModal from '@/features/sync/components/ConflictModal'
import { loadConflicts } from '@/features/sync/sync.store'
import TabTray from '@/features/tab-tray/components/TabTray'
import Toast from '@/shared/components/Toast'
import { sendCommand } from '@/shared/messaging/client'
import { watchSettings } from '@/shared/messaging/storage-sync'
import { MessageType } from '@/shared/messaging/types'
import type { CollectionOpenPayload, Result } from '@/shared/messaging/types'
import { getSettings } from '@/shared/storage/client'
import { showToast } from '@/shared/toast'
import type { Component } from 'solid-js'
import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import TopBar from './components/TopBar'

function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark')
  if (theme === 'light') root.classList.add('theme-light')
  else if (theme === 'dark') root.classList.add('theme-dark')
}

const App: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal('')
  const [triggerCreateCollection, setTriggerCreateCollection] = createSignal(0)
  const [showConflictModal, setShowConflictModal] = createSignal(false)

  useBoardsStorageSync()
  useCollectionsStorageSync()

  onMount(async () => {
    loadConflicts()
    await runBoardMigration()
    await loadBoards()
    await loadCollections()

    const s = await getSettings()
    applyTheme(s.theme)
    const unwatch = watchSettings((updated) => {
      if (updated) applyTheme(updated.theme)
    })
    onCleanup(unwatch)
  })

  async function handleOpenCollection(id: string) {
    const settings = await getSettings()
    const col = collectionsStore.items.find((c) => c.id === id)
    if (!col || col.sites.length === 0) return
    try {
      const result = await sendCommand<CollectionOpenPayload, Result<void>>({
        type: MessageType.COLLECTION_OPEN,
        payload: { collectionId: id, mode: settings.openCollectionMode },
      })
      if (!result.ok) {
        showToast(result.error.message, { type: 'error' })
      }
    } catch (err) {
      showToast(String(err), { type: 'error' })
    }
  }

  async function handleSwitchBoard(boardId: string) {
    await setActiveBoard(boardId)
  }

  return (
    <div style="display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: var(--katab-color-bg);">
      <TopBar
        onAddCollection={() => setTriggerCreateCollection((n) => n + 1)}
        onSearch={setSearchQuery}
        onOpenSettings={() => chrome.runtime.openOptionsPage()}
        onSwitchBoard={handleSwitchBoard}
      />
      <ConflictBanner onOpenModal={() => setShowConflictModal(true)} />

      <div style="display: flex; flex: 1; overflow: hidden;">
        <aside
          class="tab-tray-panel"
          style="width: 240px; flex-shrink: 0; border-right: 1px solid var(--katab-color-border); overflow: hidden; background: var(--katab-color-surface);"
        >
          <TabTray />
        </aside>

        <main
          class="collections-panel"
          style="flex: 1; overflow: hidden; background: var(--katab-color-bg);"
        >
          <CollectionBoard
            activeBoardId={boardsStore.activeBoardId}
            onOpenCollection={handleOpenCollection}
            onSwitchBoard={handleSwitchBoard}
            triggerCreate={triggerCreateCollection()}
            searchQuery={searchQuery()}
          />
        </main>

        <aside
          class="notes-panel"
          style="width: 300px; flex-shrink: 0; border-left: 1px solid var(--katab-color-border); overflow: hidden; background: var(--katab-color-surface);"
        >
          <NotePanel />
        </aside>
      </div>

      <Show when={showConflictModal()}>
        <ConflictModal onClose={() => setShowConflictModal(false)} />
      </Show>

      <Toast />
    </div>
  )
}

export default App
