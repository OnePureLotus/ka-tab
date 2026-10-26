import { WebDavError, downloadSnapshot, uploadSnapshot } from '@/features/sync/webdav/client'
import { DEFAULT_WEBDAV_CONFIG } from '@/features/sync/webdav/types'
import { afterEach, describe, expect, it, vi } from 'vitest'

const config = {
  ...DEFAULT_WEBDAV_CONFIG,
  enabled: true,
  baseUrl: 'https://dav.example.com/files',
  remotePath: '/katab-sync.json',
  username: 'user',
  password: 'secret',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('webdav client preconditions', () => {
  it('returns the body and ETag from a download', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"schemaVersion":2}', { status: 200, headers: { ETag: '"abc"' } }),
      ),
    )
    await expect(downloadSnapshot(config)).resolves.toEqual({
      body: '{"schemaVersion":2}',
      etag: '"abc"',
    })
  })

  it('returns null when the remote file is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    await expect(downloadSnapshot(config)).resolves.toBeNull()
  })

  it('sends If-Match when uploading over an existing file', async () => {
    const fetchMock = vi.fn(
      async () => new Response('', { status: 200, headers: { ETag: '"next"' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(uploadSnapshot(config, '{}', { ifMatch: '"abc"' })).resolves.toBe('"next"')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['If-Match']).toBe('"abc"')
  })

  it('sends If-None-Match when creating a file', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    await uploadSnapshot(config, '{}', { ifNoneMatch: '*' })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect((init.headers as Record<string, string>)['If-None-Match']).toBe('*')
  })

  it('throws a 412 WebDavError when the precondition fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 412 })),
    )
    const error = await uploadSnapshot(config, '{}', { ifMatch: '"stale"' }).then(
      () => null,
      (err: unknown) => err,
    )
    expect(error).toBeInstanceOf(WebDavError)
    expect((error as WebDavError).status).toBe(412)
  })
})
