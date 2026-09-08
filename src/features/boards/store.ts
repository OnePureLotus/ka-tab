import { watchBoardsIndex } from '@/shared/messaging/storage-sync'
import {
  getAllBoards,
  getSettings,
  setBoard as persistBoard,
  deleteBoard as removeBoardFromStorage,
  setSettings,
} from '@/shared/storage/client'
import { onCleanup, onMount } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import {
  addCollectionToBoard,
  createBoard,
  removeCollectionFromBoard,
  renameBoard,
} from './service'
import type { Board } from './types'

export interface BoardsState {
  items: Board[]
  loading: boolean
  error: string | null
  activeBoardId: string | null
}

const [boardsStore, setBoardsStore] = createStore<BoardsState>({
  items: [],
  loading: false,
  error: null,
  activeBoardId: null,
})

export { boardsStore, setBoardsStore }

export async function loadBoards(): Promise<void> {
  setBoardsStore('loading', true)
  try {
    const items = await getAllBoards()
    const settings = await getSettings()
    let activeBoardId = settings.activeBoardId ?? null

    if (!activeBoardId || !items.some((b) => b.id === activeBoardId)) {
      activeBoardId = items[0]?.id ?? null
      if (activeBoardId) {
        await setSettings({ ...settings, activeBoardId })
      }
    }

    setBoardsStore(
      produce((s) => {
        s.items = items
        s.loading = false
        s.error = null
        s.activeBoardId = activeBoardId
      }),
    )
  } catch (err) {
    console.error('[KaTab] Failed to load boards', err)
    setBoardsStore(
      produce((s) => {
        s.loading = false
        s.error = String(err)
      }),
    )
  }
}

export async function setActiveBoard(boardId: string): Promise<void> {
  setBoardsStore('activeBoardId', boardId)
  const settings = await getSettings()
  await setSettings({ ...settings, activeBoardId: boardId })
}

export async function addBoard(name: string): Promise<Board> {
  const board = createBoard(name)
  await persistBoard(board)
  setBoardsStore(
    produce((s) => {
      s.items.push(board)
      s.activeBoardId = board.id
    }),
  )
  const settings = await getSettings()
  await setSettings({ ...settings, activeBoardId: board.id })
  return board
}

export async function updateBoard(board: Board): Promise<void> {
  await persistBoard(board)
  setBoardsStore(
    produce((s) => {
      const idx = s.items.findIndex((b) => b.id === board.id)
      if (idx !== -1) s.items[idx] = board
    }),
  )
}

export async function removeBoard(id: string): Promise<void> {
  await removeBoardFromStorage(id)
  setBoardsStore(
    produce((s) => {
      s.items = s.items.filter((b) => b.id !== id)
      if (s.activeBoardId === id) {
        s.activeBoardId = s.items[0]?.id ?? null
      }
    }),
  )
  const settings = await getSettings()
  const newActive = boardsStore.activeBoardId
  if (settings.activeBoardId !== newActive) {
    await setSettings({ ...settings, activeBoardId: newActive ?? undefined })
  }
}

export async function attachCollectionToBoard(
  boardId: string,
  collectionId: string,
): Promise<void> {
  const board = boardsStore.items.find((b) => b.id === boardId)
  if (!board) return
  const updated = addCollectionToBoard(board, collectionId)
  await updateBoard(updated)
}

export async function detachCollectionFromBoard(
  boardId: string,
  collectionId: string,
): Promise<void> {
  const board = boardsStore.items.find((b) => b.id === boardId)
  if (!board) return
  const updated = removeCollectionFromBoard(board, collectionId)
  await updateBoard(updated)
}

export async function renameBoardInStore(id: string, name: string): Promise<void> {
  const board = boardsStore.items.find((b) => b.id === id)
  if (!board) return
  await updateBoard(renameBoard(board, name))
}

export function getActiveBoard(): Board | null {
  const id = boardsStore.activeBoardId
  if (!id) return null
  return boardsStore.items.find((b) => b.id === id) ?? null
}

export function subscribeBoardsStorage(): () => void {
  return watchBoardsIndex(() => {
    loadBoards()
  })
}

export function useBoardsStorageSync(): void {
  onMount(() => {
    const unwatch = subscribeBoardsStorage()
    onCleanup(unwatch)
  })
}
