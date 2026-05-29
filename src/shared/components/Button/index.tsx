import type { Component, JSX } from 'solid-js'

interface ButtonProps {
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: JSX.Element
}

const Button: Component<ButtonProps> = (props) => {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      class={`btn btn--${props.variant ?? 'primary'} btn--${props.size ?? 'md'}`}
    >
      {props.children}
    </button>
  )
}

export default Button
