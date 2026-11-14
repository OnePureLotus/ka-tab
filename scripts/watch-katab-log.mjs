/**
 * 挂测：只读 `.logs/katab-favicon.log`（你的真实浏览器），不启动任何 Playwright。
 *
 *   npm run log:relay          # 另开终端，保持运行
 *   # Helium：重载扩展，打开 KaTab 新标签页
 *   npm run log:watch          # 默认盯 5 分钟
 *
 * 可选：$env:KATAB_EXT_ID="你的扩展ID" 只统计该实例
 *       $env:WATCH_MS="300000"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const logFile = path.join(root, '.logs', 'katab-favicon.log')
const WATCH_MS = Number(process.env.WATCH_MS ?? 5 * 60_000)
const POLL_MS = 15_000
const extIdFilter = process.env.KATAB_EXT_ID?.trim() || ''

function parseKick(line) {
  const m = line.match(/kick status (.+)$/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

function parseUiLoaded(line) {
  const m = line.match(/loaded cache entries (\d+)/)
  return m ? Number(m[1]) : null
}

function summarize(lines) {
  const stats = {
    lines: lines.length,
    boots: [],
    kicks: [],
    uiMax: 0,
    cached: 0,
    fetchFail: 0,
    giveUp: 0,
    newtabKickOk: 0,
    newtabKickErr: 0,
  }
  for (const line of lines) {
    if (extIdFilter && line.includes('background boot') && !line.includes(extIdFilter)) continue
    if (line.includes('[KaTab SW] background boot')) {
      const j = line.match(/\{.*\}/)
      if (j) {
        try {
          stats.boots.push(JSON.parse(j[0]))
        } catch {
          /* ignore */
        }
      }
    }
    if (line.includes('kick status')) {
      const k = parseKick(line)
      if (k) stats.kicks.push(k)
    }
    if (line.includes('[KaTab Favicon UI]')) {
      const n = parseUiLoaded(line)
      if (n != null) stats.uiMax = Math.max(stats.uiMax, n)
    }
    if (line.includes('] cached ')) stats.cached += 1
    if (line.includes('fetch failed, retry')) stats.fetchFail += 1
    if (line.includes('giving up after retries')) stats.giveUp += 1
    if (line.includes('[KaTab Newtab] favicon kick')) {
      if (line.includes('"ok":true')) stats.newtabKickOk += 1
      else stats.newtabKickErr += 1
    }
  }
  const lastKick = stats.kicks.at(-1)
  return { ...stats, lastKick }
}

function printReport(label, s) {
  console.log(`\n[watch] ${label} @ ${new Date().toLocaleTimeString()}`)
  console.log(`  log lines (window): ${s.lines}`)
  if (s.boots.length) {
    const last = s.boots.at(-1)
    console.log(`  last SW boot: v${last?.version} id=${last?.id}`)
  }
  if (s.lastKick) {
    console.log(
      `  last kick: cache=${s.lastKick.cacheCount} pending=${s.lastKick.pendingCount} bytes=${s.lastKick.cacheBytes ?? '?'}`,
    )
  }
  console.log(`  UI cache loaded (max): ${s.uiMax}`)
  console.log(`  cached events: ${s.cached}  fetch-retry: ${s.fetchFail}  give-up: ${s.giveUp}`)
  console.log(`  newtab kick ok/err: ${s.newtabKickOk}/${s.newtabKickErr}`)
}

async function main() {
  if (!fs.existsSync(logFile)) {
    console.error(`[watch] missing ${logFile} — run: npm run log:relay`)
    process.exit(1)
  }
  const startSize = fs.statSync(logFile).size
  const startAt = Date.now()
  console.log(`[watch] file=${logFile}`)
  console.log(`[watch] duration=${WATCH_MS / 1000}s  poll=${POLL_MS / 1000}s`)
  if (extIdFilter) console.log(`[watch] filter ext id=${extIdFilter}`)

  let offset = Math.max(0, startSize - 200_000)

  while (Date.now() - startAt < WATCH_MS) {
    const chunk = fs.readFileSync(logFile, 'utf8')
  const slice = chunk.slice(offset)
    const windowLines = slice.split(/\r?\n/).filter(Boolean)
    const s = summarize(windowLines)
    printReport(`+${Math.round((Date.now() - startAt) / 1000)}s`, s)
    offset = chunk.length
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  console.log('\n[watch] done (no browser was started)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})