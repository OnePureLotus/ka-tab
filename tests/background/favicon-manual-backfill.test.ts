import { describe, expect, it } from 'vitest'
import { MessageType } from '@/shared/messaging/types'

describe('Favicon manual backfill', () => {
  it('exposes FAVICON_BACKFILL_MANUAL_ALL message type', () => {
    expect(MessageType.FAVICON_BACKFILL_MANUAL_ALL).toBe('FAVICON_BACKFILL_MANUAL_ALL')
  })

  it('keeps periodic kick separate from manual all', () => {
    expect(MessageType.FAVICON_BACKFILL_KICK).not.toBe(MessageType.FAVICON_BACKFILL_MANUAL_ALL)
  })
})