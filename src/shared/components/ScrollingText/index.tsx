import type { Component, JSX } from 'solid-js'
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'

interface ScrollingTextProps {
  active?: boolean
  children: JSX.Element
  textStyle?: string
}

const ScrollingText: Component<ScrollingTextProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  let measureRef: HTMLSpanElement | undefined
  const [overflowing, setOverflowing] = createSignal(false)
  const [scrollDistance, setScrollDistance] = createSignal(0)
  const [reduceMotion, setReduceMotion] = createSignal(false)

  function measure() {
    if (!containerRef || !measureRef) return
    const available = containerRef.clientWidth
    const content = measureRef.scrollWidth
    const diff = content - available
    setOverflowing(diff > 2)
    setScrollDistance(Math.max(0, diff))
  }

  onMount(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    measure()
    const observer = new ResizeObserver(measure)
    if (containerRef) observer.observe(containerRef)
    onCleanup(() => observer.disconnect())
  })

  createEffect(() => {
    props.active
    props.children
    measure()
  })

  const shouldScroll = () => props.active && overflowing() && !reduceMotion()
  const duration = () => Math.max(3, scrollDistance() / 28)

  return (
    <>
      <style>
        {`
          @keyframes katab-scroll-text {
            0%, 12% { transform: translateX(0); }
            88%, 100% { transform: translateX(calc(-1 * var(--katab-scroll-distance, 0px))); }
          }
          .katab-scrolling-text__label {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .katab-scrolling-text__label--scroll {
            display: inline-block;
            white-space: nowrap;
            animation: katab-scroll-text var(--katab-scroll-duration, 4s) linear infinite;
          }
        `}
      </style>
      <div ref={containerRef} style="overflow: hidden; min-width: 0; flex: 1; position: relative;">
        <span
          ref={measureRef}
          aria-hidden="true"
          style={`position: absolute; visibility: hidden; white-space: nowrap; pointer-events: none; height: 0; overflow: hidden; ${props.textStyle ?? ''}`}
        >
          {props.children}
        </span>
        <span
          class={
            shouldScroll() ? 'katab-scrolling-text__label--scroll' : 'katab-scrolling-text__label'
          }
          style={
            shouldScroll()
              ? `--katab-scroll-distance: ${scrollDistance()}px; --katab-scroll-duration: ${duration()}s; ${props.textStyle ?? ''}`
              : (props.textStyle ?? '')
          }
        >
          {props.children}
        </span>
      </div>
    </>
  )
}

export default ScrollingText
