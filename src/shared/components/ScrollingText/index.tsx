import type { Component, JSX } from 'solid-js'
import { createSignal, onCleanup, onMount } from 'solid-js'

interface ScrollingTextProps {
  active?: boolean
  children: JSX.Element
  style?: string
}

const ScrollingText: Component<ScrollingTextProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  let textRef: HTMLSpanElement | undefined
  const [overflowing, setOverflowing] = createSignal(false)
  const [scrollDistance, setScrollDistance] = createSignal(0)
  const [reduceMotion, setReduceMotion] = createSignal(false)

  function measure() {
    if (!containerRef || !textRef) return
    const diff = textRef.scrollWidth - containerRef.clientWidth
    setOverflowing(diff > 2)
    setScrollDistance(Math.max(0, diff))
  }

  onMount(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    measure()
    const observer = new ResizeObserver(measure)
    if (containerRef) observer.observe(containerRef)
    if (textRef) observer.observe(textRef)
    onCleanup(() => observer.disconnect())
  })

  const shouldScroll = () => props.active && overflowing() && !reduceMotion()
  const duration = () => Math.max(3, scrollDistance() / 28)

  return (
    <div ref={containerRef} style={`overflow: hidden; min-width: 0; flex: 1; ${props.style ?? ''}`}>
      <span
        ref={textRef}
        style={
          shouldScroll()
            ? `display: inline-block; white-space: nowrap; animation: katab-scroll-text ${duration()}s linear infinite; ${props.style ?? ''}`
            : `display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${props.style ?? ''}`
        }
      >
        {props.children}
      </span>
      <style>
        {`
          @keyframes katab-scroll-text {
            0%, 12% { transform: translateX(0); }
            88%, 100% { transform: translateX(-${scrollDistance()}px); }
          }
        `}
      </style>
    </div>
  )
}

export default ScrollingText
