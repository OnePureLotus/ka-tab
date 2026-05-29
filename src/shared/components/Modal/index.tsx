import type { Component, JSX } from 'solid-js'
import { Show, Portal } from 'solid-js/web'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: JSX.Element
}

const Modal: Component<ModalProps> = (props) => {
  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="modal-overlay"
          style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;"
          onClick={props.onClose}
        >
          <div
            class="modal-content"
            style="background: var(--katab-color-surface); border-radius: 12px; padding: 24px; min-width: 400px; max-width: 90vw;"
            onClick={(e) => e.stopPropagation()}
          >
            <Show when={props.title}>
              <h2 style="margin: 0 0 16px; font-size: 18px;">{props.title}</h2>
            </Show>
            {props.children}
          </div>
        </div>
      </Portal>
    </Show>
  )
}

export default Modal
