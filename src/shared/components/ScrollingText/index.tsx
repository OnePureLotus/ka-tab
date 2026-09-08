import type { Component, JSX } from 'solid-js'
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'

interface ScrollingTextProps {
  active?: boolean
  children: JSX.Element
  textStyle?: string
}

let animCounter = 0

const ScrollingText: Component<ScrollingTextProps> = (props) => {
  const animId = `katab-scroll-${++animCounter}`
  let containerRef: HTMLDivElement | undefined
  let measureRef: HTMLSpanElement | undefined
  const [overflowing, setOverflowing] = createSignal(false)
  const [scrollDistance, setScrollDistance] = createSignal(0)
  const [reduceMotion, setReduceMotion] = createSignal(false)

  function measure() {
    if (!containerRef || !measureRef) return
    const available = containerRef.clientWidth
    const content = measureRef.getBoundingClientRect().width
    const diff = content - available
    setOverflowing(diff > 2)
    setScrollDistance(Math.max(0, diff))
  }

  function scheduleMeasure() {
    requestAnimationFrame(measure)
  }

  onMount(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    scheduleMeasure()
    const observer = new ResizeObserver(scheduleMeasure)
    if (containerRef) observer.observe(containerRef)
    onCleanup(() => observer.disconnect())
  })

  createEffect(() => {
    props.active
    props.children
    scheduleMeasure()
  })

  const shouldScroll = () => Boolean(props.active && overflowing() && !reduceMotion())
  const duration = () => Math.max(3, scrollDistance() / 28)

  return (
    <>
      <style>
        {`
          @keyframes ${animId} {
            0%, 15% { transform: translateX(0); }
            85%, 100% { transform: translateX(-${scrollDistance()}px); }
          }
          .${animId}__label {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
          }
          .${animId}__label--scroll {
            display: inline-block;
            white-space: nowrap;
            animation: ${animId} ${duration()}s linear infinite;
            will-change: transform;
          }
        `}
      </style>
      <div ref={containerRef} style="overflow: hidden; min-width: 0; flex: 1; position: relative;">
        <span
          ref={measureRef}
          aria-hidden="true"
          style={`position: absolute; left: 0; top: 0; visibility: hidden; white-space: nowrap; pointer-events: none; ${props.textStyle ?? ''}`}
        >
          {props.children}
        </span>
        <span
          class={shouldScroll() ? `${animId}__label--scroll` : `${animId}__label`}
          style={props.textStyle ?? ''}
        >
          {props.children}
        </span>
      </div>
    </>
  )
}

export default ScrollingText
