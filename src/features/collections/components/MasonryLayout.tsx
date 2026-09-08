import type { Accessor, Component, JSX } from 'solid-js'
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js'

export interface MasonryPosition {
  x: number
  y: number
  width: number
}

interface MasonryContextValue {
  registerElement: (id: string, el: HTMLElement) => void
  unregisterElement: (id: string) => void
  scheduleLayout: () => void
  position: (id: string) => MasonryPosition | undefined
}

const MasonryContext = createContext<MasonryContextValue>()

function columnCountForWidth(width: number, minColumnWidth: number, gap: number): number {
  if (width <= 0) return 1
  return Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)))
}

function columnWidthForContainer(width: number, columnCount: number, gap: number): number {
  return (width - gap * (columnCount - 1)) / columnCount
}

function layoutShortestColumn(
  itemIds: string[],
  heights: Map<string, number>,
  columnCount: number,
  columnWidth: number,
  gap: number,
): { positions: Record<string, MasonryPosition>; containerHeight: number } {
  const colHeights = new Array<number>(columnCount).fill(0)
  const positions: Record<string, MasonryPosition> = {}

  for (const id of itemIds) {
    const height = heights.get(id) ?? 0
    let column = 0
    for (let i = 1; i < columnCount; i++) {
      if (colHeights[i]! < colHeights[column]!) column = i
    }
    const y = colHeights[column]!
    positions[id] = {
      x: column * (columnWidth + gap),
      y,
      width: columnWidth,
    }
    colHeights[column] = y + height + gap
  }

  const containerHeight = colHeights.length > 0 ? Math.max(...colHeights, 0) - gap : 0
  return { positions, containerHeight: Math.max(0, containerHeight) }
}

interface MasonryLayoutProps {
  itemIds: Accessor<string[]>
  minColumnWidth: number
  gap: number
  relayoutToken?: Accessor<number | string>
  children: JSX.Element
}

export const MasonryLayout: Component<MasonryLayoutProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  const itemElements = new Map<string, HTMLElement>()
  const [positions, setPositions] = createSignal<Record<string, MasonryPosition>>({})
  const [containerHeight, setContainerHeight] = createSignal(0)

  let layoutFrame: number | null = null

  function runLayout() {
    if (!containerRef) return
    const width = containerRef.clientWidth
    const ids = props.itemIds()
    const heights = new Map<string, number>()
    for (const id of ids) {
      const el = itemElements.get(id)
      heights.set(id, el?.offsetHeight ?? 0)
    }

    const columnCount = columnCountForWidth(width, props.minColumnWidth, props.gap)
    const columnWidth = columnWidthForContainer(width, columnCount, props.gap)
    const result = layoutShortestColumn(ids, heights, columnCount, columnWidth, props.gap)
    setPositions(result.positions)
    setContainerHeight(result.containerHeight)
  }

  function scheduleLayout() {
    if (layoutFrame != null) cancelAnimationFrame(layoutFrame)
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = null
      runLayout()
    })
  }

  const contextValue: MasonryContextValue = {
    registerElement(id, el) {
      itemElements.set(id, el)
      scheduleLayout()
    },
    unregisterElement(id) {
      itemElements.delete(id)
      scheduleLayout()
    },
    scheduleLayout,
    position: (id) => positions()[id],
  }

  onMount(() => {
    if (!containerRef) return
    const observer = new ResizeObserver(() => scheduleLayout())
    observer.observe(containerRef)
    scheduleLayout()
    onCleanup(() => observer.disconnect())
  })

  createEffect(() => {
    props.itemIds()
    props.minColumnWidth
    props.gap
    props.relayoutToken?.()
    scheduleLayout()
  })

  return (
    <MasonryContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: `${containerHeight()}px`,
          'min-height': '120px',
        }}
      >
        {props.children}
      </div>
    </MasonryContext.Provider>
  )
}

interface MasonryItemProps {
  id: string
  children: JSX.Element
}

export const MasonryItem: Component<MasonryItemProps> = (props) => {
  const ctx = useContext(MasonryContext)
  if (!ctx) throw new Error('MasonryItem must be used within MasonryLayout')

  let itemRef: HTMLDivElement | undefined

  onMount(() => {
    if (!itemRef) return
    ctx.registerElement(props.id, itemRef)
    const observer = new ResizeObserver(() => ctx.scheduleLayout())
    observer.observe(itemRef)
    onCleanup(() => {
      ctx.unregisterElement(props.id)
      observer.disconnect()
    })
    ctx.scheduleLayout()
  })

  const pos = createMemo(() => ctx.position(props.id))

  return (
    <div
      ref={itemRef}
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        width: pos() ? `${pos()!.width}px` : '100%',
        transform: pos() ? `translate(${pos()!.x}px, ${pos()!.y}px)` : undefined,
        'will-change': 'transform',
      }}
    >
      {props.children}
    </div>
  )
}

export function useMasonryLayout(): MasonryContextValue {
  const ctx = useContext(MasonryContext)
  if (!ctx) throw new Error('useMasonryLayout must be used within MasonryLayout')
  return ctx
}
