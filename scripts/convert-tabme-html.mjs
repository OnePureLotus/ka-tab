/**
 * Convert Netscape bookmark HTML (e.g. Tabme export) to KaTab sync snapshot JSON.
 * Usage: node scripts/convert-tabme-html.mjs <input.html> [output.json]
 */
import fs from 'node:fs'
import path from 'node:path'
import { nanoid } from 'nanoid'

const COLORS = [
  { color: '#4f46e5', tabGroupColor: 'blue' },
  { color: '#059669', tabGroupColor: 'green' },
  { color: '#2563eb', tabGroupColor: 'blue' },
  { color: '#db2777', tabGroupColor: 'pink' },
  { color: '#f97316', tabGroupColor: 'orange' },
  { color: '#0f766e', tabGroupColor: 'cyan' },
]

const DEFAULT_SETTINGS = {
  theme: 'system',
  accentColor: '#6366f1',
  blockedDomains: [],
  openCollectionMode: 'tab-group',
  colorPalette: [
    { id: 'indigo', name: 'Indigo', color: '#4f46e5', tabGroupColor: 'blue' },
    { id: 'green', name: 'Green', color: '#059669', tabGroupColor: 'green' },
    { id: 'blue', name: 'Blue', color: '#2563eb', tabGroupColor: 'blue' },
    { id: 'pink', name: 'Pink', color: '#db2777', tabGroupColor: 'pink' },
    { id: 'orange', name: 'Orange', color: '#f97316', tabGroupColor: 'orange' },
    { id: 'teal', name: 'Teal', color: '#0f766e', tabGroupColor: 'cyan' },
  ],
}

function hashContentSync(value) {
  const str = JSON.stringify(value)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash >>>= 0
  }
  return hash.toString(16).padStart(8, '0')
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

function truncateName(name, max = 50) {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

function findMatchingDlEnd(content, dlStart) {
  const openTag = '<DL><p>'
  const closeTag = '</DL><p>'
  let depth = 1
  let pos = dlStart + openTag.length

  while (pos < content.length && depth > 0) {
    const nextOpen = content.indexOf(openTag, pos)
    const nextClose = content.indexOf(closeTag, pos)
    if (nextClose === -1) break

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      pos = nextOpen + openTag.length
    } else {
      depth--
      if (depth === 0) return nextClose + closeTag.length
      pos = nextClose + closeTag.length
    }
  }

  return -1
}

function parseDLContent(content) {
  const directLinks = []
  const subfolders = []
  let i = 0

  while (i < content.length) {
    const dt = content.indexOf('<DT>', i)
    if (dt === -1) break

    const slice = content.slice(dt)
    const linkMatch = slice.match(/^<DT><A HREF="([^"]*)"[^>]*>([^<]*)<\/A>/i)
    if (linkMatch) {
      directLinks.push({
        url: decodeHtml(linkMatch[1]),
        title: decodeHtml(linkMatch[2]) || decodeHtml(linkMatch[1]),
      })
      i = dt + linkMatch[0].length
      continue
    }

    const folderHeader = slice.match(/^<DT><H3>([^<]*)<\/H3>\s*<DL><p>/i)
    if (folderHeader) {
      const name = decodeHtml(folderHeader[1])
      const innerStart = dt + folderHeader[0].length
      const innerEnd = findMatchingDlEnd(content, innerStart - '<DL><p>'.length)
      if (innerEnd === -1) break
      const inner = content.slice(innerStart, innerEnd - '</DL><p>'.length)
      const parsed = parseDLContent(inner)
      if (name.toLowerCase() === 'bookmarks') {
        directLinks.push(...parsed.directLinks)
        subfolders.push(...parsed.subfolders)
      } else {
        subfolders.push({ name, ...parsed })
      }
      i = innerEnd
      continue
    }

    i = dt + 4
  }

  return { directLinks, subfolders }
}

function makeCollection(boardId, name, links, colorIndex, now) {
  const palette = COLORS[colorIndex % COLORS.length]
  const sites = links.map((link) => ({
    id: nanoid(),
    url: link.url,
    title: link.title.slice(0, 200),
    favicon: getFaviconUrl(link.url),
    addedAt: now,
  }))
  const collectionName = truncateName(name)
  const color = palette.color
  const hash = hashContentSync({ name: collectionName, color, sites })
  return {
    id: nanoid(),
    boardId,
    name: collectionName,
    color,
    tabGroupColor: palette.tabGroupColor,
    sites,
    createdAt: now,
    updatedAt: now,
    hash,
  }
}

/** Add collections for each subfolder (own title only), under the given board. */
function addCollectionsForFolder(boardId, folder, collections, collectionIds, colorIndexRef, now) {
  for (const child of folder.subfolders) {
    if (child.directLinks.length > 0) {
      const col = makeCollection(boardId, child.name, child.directLinks, colorIndexRef.value++, now)
      collections.push(col)
      collectionIds.push(col.id)
    }
    if (child.subfolders.length > 0) {
      addCollectionsForFolder(boardId, child, collections, collectionIds, colorIndexRef, now)
    }
  }
}

function buildSnapshot(html) {
  const rootMatch = html.match(/<H1>Bookmarks<\/H1>\s*<DL><p>([\s\S]*)<\/DL><p>\s*$/i)
  if (!rootMatch) throw new Error('Could not find bookmark root')

  const root = parseDLContent(rootMatch[1])
  const boards = []
  const collections = []
  const now = Date.now()
  const colorIndexRef = { value: 0 }

  for (const boardFolder of root.subfolders) {
    const boardId = nanoid()
    const collectionIds = []

    addCollectionsForFolder(boardId, boardFolder, collections, collectionIds, colorIndexRef, now)

    if (boardFolder.directLinks.length > 0) {
      const col = makeCollection(
        boardId,
        '其他',
        boardFolder.directLinks,
        colorIndexRef.value++,
        now,
      )
      collections.push(col)
      collectionIds.push(col.id)
    }

    if (collectionIds.length === 0) continue

    boards.push({
      id: boardId,
      name: truncateName(boardFolder.name),
      collectionIds,
      createdAt: now,
      updatedAt: now,
    })
  }

  const settings = {
    ...DEFAULT_SETTINGS,
    activeBoardId: boards[0]?.id,
  }

  return {
    schemaVersion: 1,
    exportedAt: now,
    deviceId: 'tabme-import',
    boards,
    collections,
    notes: [],
    settings,
  }
}

const inputPath = process.argv[2]
const outputPath = process.argv[3] ?? 'katab-import-from-tabme.json'

if (!inputPath) {
  console.error('Usage: node scripts/convert-tabme-html.mjs <input.html> [output.json]')
  process.exit(1)
}

const html = fs.readFileSync(path.resolve(inputPath), 'utf8')
const snapshot = buildSnapshot(html)
fs.writeFileSync(path.resolve(outputPath), JSON.stringify(snapshot, null, 2), 'utf8')

const siteCount = snapshot.collections.reduce((n, c) => n + c.sites.length, 0)
console.log(
  `Wrote ${outputPath}: ${snapshot.boards.length} boards, ${snapshot.collections.length} collections, ${siteCount} sites`,
)
