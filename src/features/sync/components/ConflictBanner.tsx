import type { Component } from 'solid-js'
import { Show } from 'solid-js'
import { syncStore } from '../sync.store'

interface ConflictBannerProps {
  onOpenModal: () => void
}

const ConflictBanner: Component<ConflictBannerProps> = (props) => {
  const count = () => syncStore.conflicts().length

  return (
    <Show when={count() > 0}>
      <div
        style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #fef3c7; border-bottom: 1px solid #fde68a; font-size: 12px; color: #92400e;"
        role="alert"
      >
        <span>⚠️</span>
        <span>
          {count()} sync conflict{count() > 1 ? 's' : ''} detected
        </span>
        <button
          onClick={props.onOpenModal}
          style="margin-left: auto; padding: 3px 10px; background: #d97706; color: #fff; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;"
        >
          Resolve
        </button>
      </div>
    </Show>
  )
}

export default ConflictBanner
