import { getCollectionsForBoard, removeCollection } from '@/features/collections/store'
import { getBoard, setBoard } from '@/shared/storage/client'
import type { Component } from 'solid-js'
import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js'
import { Portal } from 'solid-js/web'
import { addCollectionToBoard } from '../service'
import { addBoard, boardsStore, removeBoard, renameBoardInStore, setActiveBoard } from '../store'
import { detachCollectionFromBoard } from '../store'
import CreateBoardModal from './CreateBoardModal'
import DeleteBoardModal from './DeleteBoardModal'
import RenameBoardModal from './RenameBoardModal'

interface BoardSwitcherProps {
  onBoardChange?: (boardId: string) => void
}

const BoardSwitcher: Component<BoardSwitcherProps> = (props) => {
  const [showCreate, setShowCreate] = createSignal(false)
  const [menuBoardId, setMenuBoardId] = createSignal<string | null>(null)
  const [menuPos, setMenuPos] = createSignal({ top: 0, right: 0 })
  const [renameBoardId, setRenameBoardId] = createSignal<string | null>(null)
  const [deleteBoardId, setDeleteBoardId] = createSignal<string | null>(null)
  const [tabRefs, setTabRefs] = createSignal<Record<string, HTMLButtonElement>>({})

  function openMenu(boardId: string, e: MouseEvent) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuBoardId(boardId)
  }

  function closeMenu() {
    setMenuBoardId(null)
  }

  onCleanup(() => closeMenu())

  createEffect(() => {
    const activeId = boardsStore.activeBoardId
    if (!activeId) return
    const el = tabRefs()[activeId]
    el?.scrollIntoView({ inline: 'nearest', behavior: 'smooth', block: 'nearest' })
  })

  async function handleSelect(boardId: string) {
    await setActiveBoard(boardId)
    props.onBoardChange?.(boardId)
  }

  async function handleCreate(name: string) {
    const board = await addBoard(name)
    props.onBoardChange?.(board.id)
  }

  async function handleDelete(mode: 'move' | 'delete-all', targetBoardId?: string) {
    const boardId = deleteBoardId()
    if (!boardId) return
    const board = boardsStore.items.find((b) => b.id === boardId)
    if (!board) return

    const collections = getCollectionsForBoard(boardId)

    if (mode === 'move' && targetBoardId) {
      const target = await getBoard(targetBoardId)
      if (!target) return
      let updatedTarget = target
      for (const col of collections) {
        await detachCollectionFromBoard(boardId, col.id)
        const updatedCol = { ...col, boardId: targetBoardId, updatedAt: Date.now() }
        const { updateCollection } = await import('@/features/collections/store')
        await updateCollection(updatedCol)
        updatedTarget = addCollectionToBoard(updatedTarget, col.id)
      }
      await setBoard(updatedTarget)
      const { loadBoards } = await import('../store')
      await loadBoards()
    } else {
      for (const col of collections) {
        await removeCollection(col.id, boardId)
      }
    }

    await removeBoard(boardId)
    props.onBoardChange?.(boardsStore.activeBoardId ?? '')
    setDeleteBoardId(null)
  }

  const deleteBoard = () => boardsStore.items.find((b) => b.id === deleteBoardId()) ?? null

  const menuItemStyle =
    'display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 8px 14px; border: none; background: transparent; cursor: pointer; font-size: 13px; color: var(--katab-color-text-primary); transition: background 100ms;'

  return (
    <div data-testid="board-switcher" style="margin-bottom: 16px;">
      <div
        role="tablist"
        aria-label="Boards"
        style="display: flex; align-items: center; gap: 4px; padding: 4px; background: var(--katab-color-surface-secondary); border-radius: 12px; overflow-x: auto; scrollbar-width: thin;"
      >
        <For each={boardsStore.items}>
          {(board) => {
            const isActive = () => boardsStore.activeBoardId === board.id
            return (
              <div
                ref={(el) => {
                  if (el) {
                    const btn = el.querySelector('button[data-board-tab]') as HTMLButtonElement
                    if (btn) setTabRefs((prev) => ({ ...prev, [board.id]: btn }))
                  }
                }}
                style={`display: flex; align-items: center; gap: 2px; height: 32px; padding: ${isActive() ? '0 4px 0 4px' : '0 4px'}; border-radius: 8px; flex-shrink: 0; transition: background 150ms, box-shadow 150ms; background: ${isActive() ? 'var(--katab-color-surface)' : 'transparent'}; box-shadow: ${isActive() ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};`}
                onMouseEnter={(e) => {
                  if (!isActive()) {
                    ;(e.currentTarget as HTMLElement).style.background =
                      'color-mix(in srgb, var(--katab-color-surface) 60%, transparent)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive()) {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                <button
                  type="button"
                  role="tab"
                  data-board-tab
                  aria-selected={isActive()}
                  onClick={() => handleSelect(board.id)}
                  style={`height: 32px; padding: 0 10px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px; font-weight: ${isActive() ? '600' : '500'}; white-space: nowrap; color: ${isActive() ? 'var(--katab-color-accent)' : 'var(--katab-color-text-secondary)'};`}
                >
                  <span style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: middle;">
                    {board.name}
                  </span>
                </button>
                <Show when={isActive()}>
                  <button
                    type="button"
                    aria-label="Board options"
                    title="Board options"
                    onClick={(e) => openMenu(board.id, e)}
                    style="width: 24px; height: 24px; border: none; background: transparent; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--katab-color-text-secondary); font-size: 14px; font-weight: 700; letter-spacing: 1px; flex-shrink: 0;"
                  >
                    ...
                  </button>
                </Show>
              </div>
            )
          }}
        </For>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          title="New board"
          style="display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px dashed var(--katab-color-border); background: transparent; cursor: pointer; color: var(--katab-color-accent); font-size: 13px; font-weight: 500; flex-shrink: 0; white-space: nowrap; transition: background 150ms, border-color 150ms;"
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--katab-color-chip-bg)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          + New board
        </button>
      </div>

      <Show when={menuBoardId()}>
        <Portal>
          <div style="position: fixed; inset: 0; z-index: 999;" onClick={closeMenu} />
          <div
            style={`position: fixed; top: ${menuPos().top}px; right: ${menuPos().right}px; background: var(--katab-color-surface); border: 1px solid var(--katab-color-border); border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.16); z-index: 1000; min-width: 180px; padding: 6px 0; overflow: hidden;`}
          >
            <div style="padding: 4px 14px 6px; font-size: 10px; font-weight: 700; color: var(--katab-color-text-muted); letter-spacing: 0.08em;">
              BOARD
            </div>
            <button
              type="button"
              onClick={() => {
                setRenameBoardId(menuBoardId())
                closeMenu()
              }}
              style={menuItemStyle}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  'var(--katab-color-surface-secondary)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--katab-color-text-secondary); flex-shrink: 0; border: 1.5px solid var(--katab-color-text-secondary); border-radius: 3px;">
                T
              </span>
              <span>Rename</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteBoardId(menuBoardId())
                closeMenu()
              }}
              disabled={boardsStore.items.length <= 1}
              style={`${menuItemStyle} color: ${boardsStore.items.length <= 1 ? 'var(--katab-color-text-secondary)' : '#ef4444'}; opacity: ${boardsStore.items.length <= 1 ? 0.5 : 1}; cursor: ${boardsStore.items.length <= 1 ? 'not-allowed' : 'pointer'};`}
              onMouseEnter={(e) => {
                if (boardsStore.items.length > 1) {
                  ;(e.currentTarget as HTMLElement).style.background =
                    'var(--katab-color-surface-secondary)'
                }
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #ef4444; flex-shrink: 0;">
                ×
              </span>
              <span>Delete</span>
            </button>
          </div>
        </Portal>
      </Show>

      <CreateBoardModal
        open={showCreate()}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <RenameBoardModal
        open={renameBoardId() !== null}
        board={boardsStore.items.find((b) => b.id === renameBoardId()) ?? null}
        onClose={() => setRenameBoardId(null)}
        onRename={(name) => {
          const id = renameBoardId()
          if (id) renameBoardInStore(id, name)
          setRenameBoardId(null)
        }}
      />

      <DeleteBoardModal
        open={deleteBoardId() !== null}
        board={deleteBoard()}
        otherBoards={boardsStore.items.filter((b) => b.id !== deleteBoardId())}
        onClose={() => setDeleteBoardId(null)}
        onDelete={handleDelete}
      />
    </div>
  )
}

export default BoardSwitcher
