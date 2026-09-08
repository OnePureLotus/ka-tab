import type { Component } from 'solid-js'
import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'

interface EllipsisTitleProps {
  text: string
  showTooltip: boolean
  textStyle?: string
}

const EllipsisTitle: Component<EllipsisTitleProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  let titleRef: HTMLSpanElement | undefined
  let measureRef: HTMLSpanElement | undefined
  const [overflowing, setOverflowing] = createSignal(false)
  const [tipPos, setTipPos] = createSignal({ top: 0, left: 0, width: 0 })

  function measure() {
    if (!titleRef || !measureRef) return
    setOverflowing(measureRef.getBoundingClientRect().width > titleRef.clientWidth + 1)
  }

  function updateTipPos() {
    if (!titleRef || !measureRef) return
    const rect = titleRef.getBoundingClientRect()
    const contentWidth = measureRef.getBoundingClientRect().width
    const padX = 20
    const margin = 12
    const maxWidth = window.innerWidth - margin * 2
    const tipWidth = Math.min(contentWidth + padX, maxWidth)
    let left = rect.left
    if (left + tipWidth > window.innerWidth - margin) {
      left = window.innerWidth - margin - tipWidth
    }
    left = Math.max(margin, left)
    setTipPos({
      top: rect.bottom + 6,
      left,
      width: tipWidth,
    })
  }

  onMount(() => {
    measure()
    const observer = new ResizeObserver(() => measure())
    if (containerRef) observer.observe(containerRef)
    onCleanup(() => observer.disconnect())
  })

  createEffect(() => {
    props.text
    measure()
  })

  createEffect(() => {
    if (props.showTooltip && overflowing()) {
      updateTipPos()
    }
  })

  const shouldShowTooltip = () => props.showTooltip && overflowing()

  return (
    <div ref={containerRef} style="flex: 1; min-width: 0; position: relative; overflow: hidden;">
      <span
        ref={measureRef}
        aria-hidden="true"
        style={`position: absolute; left: 0; top: 0; visibility: hidden; white-space: nowrap; pointer-events: none; ${props.textStyle ?? ''}`}
      >
        {props.text}
      </span>
      <span
        ref={titleRef}
        style={`display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; ${props.textStyle ?? ''}`}
      >
        {props.text}
      </span>
      <Show when={shouldShowTooltip()}>
        <Portal>
          <div
            style={`position: fixed; top: ${tipPos().top}px; left: ${tipPos().left}px; width: ${tipPos().width}px; box-sizing: border-box; z-index: 2000; padding: 6px 10px; border: 1px solid var(--katab-color-border); border-radius: 4px; background: var(--katab-color-surface); color: var(--katab-color-text-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.12); line-height: 1.4; white-space: normal; word-break: break-word; overflow-wrap: anywhere; pointer-events: none; ${props.textStyle ?? ''}`}
          >
            {props.text}
          </div>
        </Portal>
      </Show>
    </div>
  )
}

export default EllipsisTitle
