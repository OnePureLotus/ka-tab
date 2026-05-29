import type { Message } from './types'

/**
 * Type-safe sendMessage wrapper.
 * Returns a Promise resolving to the response from the Service Worker.
 */
export function sendCommand<TPayload, TResponse = void>(
  message: Message<TPayload>,
): Promise<TResponse> {
  return chrome.runtime.sendMessage(message)
}
