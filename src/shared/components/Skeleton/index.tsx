import type { Component } from 'solid-js'

interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
}

const Skeleton: Component<SkeletonProps> = (props) => {
  return (
    <div
      class="skeleton"
      style={`width: ${props.width ?? '100%'}; height: ${props.height ?? '16px'}; border-radius: ${props.borderRadius ?? '4px'}; background: var(--katab-color-skeleton); animation: skeleton-pulse 1.5s ease-in-out infinite;`}
    />
  )
}

export default Skeleton
