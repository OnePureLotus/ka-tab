import type { WebDavConfig } from './types'

export class WebDavError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'WebDavError'
  }
}

function buildAuthHeader(config: WebDavConfig): string {
  const encoded = btoa(`${config.username}:${config.password}`)
  return `Basic ${encoded}`
}

function buildFileUrl(config: WebDavConfig): string {
  const base = config.baseUrl.replace(/\/+$/, '')
  const path = config.remotePath.startsWith('/') ? config.remotePath : `/${config.remotePath}`
  return `${base}${path}`
}

function headers(config: WebDavConfig, extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: buildAuthHeader(config),
    ...extra,
  }
}

export async function testWebDavConnection(config: WebDavConfig): Promise<void> {
  const url = buildFileUrl(config)
  let response = await fetch(url, {
    method: 'OPTIONS',
    headers: headers(config),
  })
  if (!response.ok && response.status !== 404) {
    response = await fetch(url, { method: 'GET', headers: headers(config) })
  }
  if (!response.ok && response.status !== 404) {
    throw new WebDavError(`Connection failed (${response.status})`, response.status)
  }
}

export async function downloadSnapshot(config: WebDavConfig): Promise<string | null> {
  const url = buildFileUrl(config)
  const response = await fetch(url, { method: 'GET', headers: headers(config) })
  if (response.status === 404) return null
  if (!response.ok) {
    throw new WebDavError(`Download failed (${response.status})`, response.status)
  }
  return response.text()
}

export async function uploadSnapshot(config: WebDavConfig, body: string): Promise<void> {
  const url = buildFileUrl(config)
  const response = await fetch(url, {
    method: 'PUT',
    headers: headers(config, { 'Content-Type': 'application/json' }),
    body,
  })
  if (!response.ok) {
    throw new WebDavError(`Upload failed (${response.status})`, response.status)
  }
}
