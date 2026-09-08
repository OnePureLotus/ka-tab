import BoardSwitcher from '@/features/boards/components/BoardSwitcher'
import { boardsStore } from '@/features/boards/store'
import Skeleton from '@/shared/components/Skeleton'
import { showToast } from '@/shared/toast'
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  type DragEvent as SolidDnDEvent,
  SortableProvider,
  closestCenter,
  createSortable,
  maybeTransformStyle,
} from '@thisbeyond/solid-dnd'
import type { Component } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import {
  COLLECTION_CARD_GAP,
  COLLECTION_CARD_MIN_HEIGHT,
  COLLECTION_CARD_MIN_WIDTH,
} from '../constants'
import {
  addSiteToCollection,
  createCollection,
  removeSiteFromCollection,
  renameCollection,
  updateCollectionColor,
} from '../service'
import { collectionsStore } from '../store'
import {
  addCollection,
  getCollectionById,
  getCollectionsForBoard,
  removeCollection,
  reorderCollectionsInStore,
  updateCollection,
} from '../store'
import type { Collection } from '../types'
import AddSiteDialog from './AddSiteDialog'
import ChangeColorModal from './ChangeColorModal'
import CollectionCard from './CollectionCard'
import CollectionModal from './CollectionModal'
import CreateCollectionModal from './CreateCollectionModal'
import EditSiteDialog from './EditSiteDialog'
import { MasonryItem, MasonryLayout } from './MasonryLayout'

const CREATE_COLLECTION_ITEM_ID = '__create_collection__'

// ─── Sortable card wrapper ────────────────────────────────────────────────────

interface SortableCardProps {
  collection: Collection
  onRename: (id: string, name: string) => void
  onChangeColor: (id: string, color: string) => void
  onDelete: (id: string) => void
  onAddSite: (id: string) => void
  onOpenModal: (id: string) => void
  onOpenCollection: (id: string) => void
  onEditSite: (collectionId: string, siteId: string) => void
  onDeleteSite: (collectionId: string, siteId: string) => void
  onTabDrop?: (url: string, title: string, favicon: string) => void
}

const SortableCard: Component<SortableCardProps> = (props) => {
  const sortable = createSortable(props.collection.id)

  return (
    <div
      ref={sortable.ref}
      data-collection-id={props.collection.id}
      style={{
        ...maybeTransformStyle(sortable.transform),
        opacity: sortable.isActiveDraggable ? 0.5 : 1,
        transition: 'transform 150ms ease-out',
      }}
      {...sortable.dragActivators}
    >
      <CollectionCard
        collection={props.collection}
        onRename={props.onRename}
        onChangeColor={props.onChangeColor}
        onDelete={props.onDelete}
        onAddSite={props.onAddSite}
        onOpenModal={props.onOpenModal}
        onOpenCollection={props.onOpenCollection}
        onEditSite={props.onEditSite}
        onDeleteSite={props.onDeleteSite}
        {...(props.onTabDrop ? { onTabDrop: props.onTabDrop } : {})}
      />
    </div>
  )
}

// ─── Main Board ───────────────────────────────────────────────────────────────

interface CollectionBoardProps {
  activeBoardId: string | null
  onOpenCollection: (id: string) => void
  onSwitchBoard?: (boardId: string) => void
  triggerCreate?: number
  searchQuery?: string
}

const CollectionBoard: Component<CollectionBoardProps> = (props) => {
  const [showCreate, setShowCreate] = createSignal(false)
  const [addSiteFor, setAddSiteFor] = createSignal<string | null>(null)
  const [colorChangeFor, setColorChangeFor] = createSignal<string | null>(null)
  const [modalCollectionId, setModalCollectionId] = createSignal<string | null>(null)
  const [editSiteFor, setEditSiteFor] = createSignal<{
    collectionId: string
    siteId: string
  } | null>(null)
  const [masonryRelayout, setMasonryRelayout] = createSignal(0)

  const skeletonGridStyle = `display: grid; grid-template-columns: repeat(auto-fill, minmax(${COLLECTION_CARD_MIN_WIDTH}px, 1fr)); gap: ${COLLECTION_CARD_GAP}px;`

  createEffect(() => {
    const trigger = props.triggerCreate
    if (trigger && trigger > 0) setShowCreate(true)
  })

  const boardCollections = createMemo(() => {
    const boardId = props.activeBoardId
    if (!boardId) return []
    return getCollectionsForBoard(boardId)
  })

  const sortableIds = createMemo(() => boardCollections().map((c) => c.id))

  const filteredCollections = createMemo(() => {
    const q = (props.searchQuery ?? '').toLowerCase().trim()
    const items = boardCollections()
    if (!q) return items
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sites.some((s) => s.title.toLowerCase().includes(q) || s.url.toLowerCase().includes(q)),
    )
  })

  const masonryItemIds = createMemo(() => [
    ...filteredCollections().map((c) => c.id),
    CREATE_COLLECTION_ITEM_ID,
  ])

  const modalCollection = createMemo(() => {
    const id = modalCollectionId()
    if (!id) return null
    return getCollectionById(id) ?? null
  })

  const editSiteContext = createMemo(() => {
    const target = editSiteFor()
    if (!target) return null
    const collection = getCollectionById(target.collectionId)
    if (!collection) return null
    const site = collection.sites.find((s) => s.id === target.siteId)
    if (!site) return null
    return { collection, site }
  })

  async function handleCreate(name: string, color: string) {
    const boardId = props.activeBoardId
    if (!boardId) {
      showToast('No board selected', { type: 'error' })
      return
    }
    const collection = createCollection(name, color, boardId)
    await addCollection(collection)
  }

  async function handleRename(id: string, name: string) {
    const col = getCollectionById(id)
    if (!col) return
    await updateCollection(renameCollection(col, name))
  }

  async function handleChangeColor(id: string, _currentColor: string) {
    setColorChangeFor(id)
  }

  async function handleColorPicked(id: string, color: string, tabGroupColor?: string) {
    const col = getCollectionById(id)
    if (!col) return
    await updateCollection(
      updateCollectionColor(
        col,
        color,
        tabGroupColor as Parameters<typeof updateCollectionColor>[2],
      ),
    )
    setColorChangeFor(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this collection?')) return
    const col = collectionsStore.items.find((c) => c.id === id)
    await removeCollection(id, col?.boardId)
  }

  async function handleDeleteSite(collectionId: string, siteId: string) {
    const col = getCollectionById(collectionId)
    if (!col) return
    const updated = removeSiteFromCollection(col, siteId)
    await updateCollection(updated)
  }

  function handleEditSite(collectionId: string, siteId: string) {
    setEditSiteFor({ collectionId, siteId })
  }

  async function handleTabDrop(collectionId: string, url: string, title: string, favicon: string) {
    const col = getCollectionById(collectionId)
    if (!col) return
    const isDuplicate = col.sites.some((s) => s.url === url)
    if (isDuplicate) {
      showToast('URL already exists', {
        type: 'warning',
        body: `This URL is already saved in "${col.name}".`,
      })
      return
    }
    const updated = addSiteToCollection(col, { url, title, favicon })
    await updateCollection(updated)
  }

  function handleDragStart(_event: SolidDnDEvent) {
    // no-op: DragOverlay uses the draggable param from its render fn
  }

  async function handleDragEnd({ draggable, droppable }: SolidDnDEvent) {
    const boardId = props.activeBoardId
    if (!boardId || !draggable || !droppable || draggable.id === droppable.id) return
    const items = boardCollections()
    const from = items.findIndex((c) => c.id === draggable.id)
    const to = items.findIndex((c) => c.id === droppable.id)
    if (from === -1 || to === -1) return
    const item = items[from]
    if (!item) return
    const reordered = [...items]
    reordered.splice(from, 1)
    reordered.splice(to, 0, item)
    await reorderCollectionsInStore(boardId, reordered)
    setMasonryRelayout((n) => n + 1)
  }

  const isLoading = () => collectionsStore.loading || boardsStore.loading
  const hasBoard = () => props.activeBoardId != null && boardsStore.items.length > 0
  const isBoardEmpty = () => hasBoard() && boardCollections().length === 0

  return (
    <div style="padding: 24px; height: 100%; overflow-y: auto; box-sizing: border-box;">
      <BoardSwitcher {...(props.onSwitchBoard ? { onBoardChange: props.onSwitchBoard } : {})} />

      {/* Section header */}
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap;">
        <div style="flex: 1;">
          <h1 style="font-size: 22px; font-weight: 700; color: var(--katab-color-text-primary); margin: 0 0 4px; line-height: 1.2;">
            Collections
          </h1>
          <p style="font-size: 14px; color: var(--katab-color-text-secondary); margin: 0;">
            Drop tabs from the left tray into collections.
          </p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
          <span style="font-size: 13px; font-weight: 500; padding: 4px 12px; background: var(--katab-color-chip-bg); color: var(--katab-color-chip-text); border-radius: 20px;">
            {boardCollections().length} collection
            {boardCollections().length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Loading skeleton */}
      <Show when={isLoading()}>
        <div style={skeletonGridStyle}>
          <For each={[1, 2, 3]}>
            {() => (
              <div style="border-radius: 12px; border: 1px solid var(--katab-color-border); background: var(--katab-color-surface); padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                <Skeleton height="20px" width="60%" />
                <Skeleton height="14px" />
                <Skeleton height="14px" />
                <Skeleton height="14px" width="80%" />
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* No board */}
      <Show when={!isLoading() && !hasBoard()}>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--katab-color-text-secondary); text-align: center; padding: 60px 0;">
          <div style="font-size: 48px;">📋</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--katab-color-text-primary);">
            No boards yet
          </div>
          <div style="font-size: 14px; max-width: 300px;">
            Create a board using the switcher above to organize your collections.
          </div>
        </div>
      </Show>

      {/* Empty board */}
      <Show when={!isLoading() && isBoardEmpty()}>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--katab-color-text-secondary); text-align: center; padding: 60px 0;">
          <div style="font-size: 48px;">📚</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--katab-color-text-primary);">
            No collections in this board
          </div>
          <div style="font-size: 14px; max-width: 300px;">
            Organize your favorite sites into collections and open them as tab groups.
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style="padding: 10px 24px; border: none; border-radius: 8px; background: var(--katab-color-accent); color: #fff; cursor: pointer; font-size: 14px; font-weight: 500;"
          >
            Create Collection
          </button>
        </div>
      </Show>

      {/* Collections grid */}
      <Show when={!isLoading() && hasBoard() && boardCollections().length > 0}>
        <DragDropProvider
          collisionDetector={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <DragDropSensors>
            <SortableProvider ids={sortableIds()}>
              <MasonryLayout
                itemIds={masonryItemIds}
                minColumnWidth={COLLECTION_CARD_MIN_WIDTH}
                gap={COLLECTION_CARD_GAP}
                relayoutToken={masonryRelayout}
              >
                <For each={filteredCollections()}>
                  {(collection) => (
                    <MasonryItem id={collection.id}>
                      <SortableCard
                        collection={collection}
                        onRename={handleRename}
                        onChangeColor={handleChangeColor}
                        onDelete={handleDelete}
                        onAddSite={(id) => setAddSiteFor(id)}
                        onOpenModal={(id) => setModalCollectionId(id)}
                        onOpenCollection={props.onOpenCollection}
                        onEditSite={handleEditSite}
                        onDeleteSite={handleDeleteSite}
                        onTabDrop={(url, title, favicon) =>
                          handleTabDrop(collection.id, url, title, favicon)
                        }
                      />
                    </MasonryItem>
                  )}
                </For>

                <MasonryItem id={CREATE_COLLECTION_ITEM_ID}>
                  <button
                    onClick={() => setShowCreate(true)}
                    style={`border: 1px solid var(--katab-color-border); border-radius: 8px; background: var(--katab-color-surface); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 32px 16px; min-height: ${COLLECTION_CARD_MIN_HEIGHT}px; width: 100%; box-sizing: border-box; transition: border-color 150ms, box-shadow 150ms;`}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.borderColor =
                        'var(--katab-color-accent)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow =
                        '0 2px 8px rgba(79,70,229,0.10)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.borderColor =
                        'var(--katab-color-border)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                    }}
                  >
                    <div style="width: 56px; height: 56px; border-radius: 28px; background: var(--katab-color-chip-bg); display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: 700; color: var(--katab-color-accent);">
                      +
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                      <span style="font-size: 18px; font-weight: 600; color: var(--katab-color-text-primary);">
                        Create Collection
                      </span>
                      <span style="font-size: 14px; font-weight: 500; color: var(--katab-color-text-secondary); text-align: center;">
                        Pick a color, then drag tabs into it.
                      </span>
                    </div>
                  </button>
                </MasonryItem>
              </MasonryLayout>
            </SortableProvider>
          </DragDropSensors>

          <DragOverlay>
            {(draggable) => {
              const col = draggable ? boardCollections().find((c) => c.id === draggable.id) : null
              return col ? (
                <div style="opacity: 0.85; transform: scale(1.03); pointer-events: none;">
                  <CollectionCard
                    collection={col}
                    onRename={() => {}}
                    onChangeColor={() => {}}
                    onDelete={() => {}}
                    onAddSite={() => {}}
                    onOpenModal={() => {}}
                    onOpenCollection={() => {}}
                    onEditSite={() => {}}
                    onDeleteSite={() => {}}
                  />
                </div>
              ) : null
            }}
          </DragOverlay>
        </DragDropProvider>

        <Show
          when={addSiteFor() !== null && collectionsStore.items.find((c) => c.id === addSiteFor())}
        >
          <AddSiteDialog
            collection={collectionsStore.items.find((c) => c.id === addSiteFor())!}
            onClose={() => setAddSiteFor(null)}
          />
        </Show>

        <Show when={editSiteContext()}>
          {(ctx) => (
            <EditSiteDialog
              collection={ctx().collection}
              site={ctx().site}
              onClose={() => setEditSiteFor(null)}
            />
          )}
        </Show>

        <Show
          when={
            colorChangeFor() !== null &&
            collectionsStore.items.find((c) => c.id === colorChangeFor())
          }
        >
          <ChangeColorModal
            collection={collectionsStore.items.find((c) => c.id === colorChangeFor())!}
            onClose={() => setColorChangeFor(null)}
            onSave={(color, tabGroupColor) =>
              handleColorPicked(colorChangeFor()!, color, tabGroupColor)
            }
          />
        </Show>
      </Show>

      <CreateCollectionModal
        open={showCreate()}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <CollectionModal
        open={modalCollectionId() !== null}
        collection={modalCollection()}
        onClose={() => setModalCollectionId(null)}
        onAddSite={(id) => {
          setModalCollectionId(null)
          setAddSiteFor(id)
        }}
        onOpenCollection={props.onOpenCollection}
        onEditSite={handleEditSite}
      />
    </div>
  )
}

export default CollectionBoard
