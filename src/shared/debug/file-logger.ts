import {
  getChromeLocalValue,
  setChromeLocalValue,
} from '@/shared/utils/chrome-storage-key'

/** Local relay: `npm run log:relay` → `.logs/katab-favicon.log` */
export const KATAB_LOG_RELAY_URL = 'http://127.0.0.1:39281/log'

const STORAGE_KEY = 'local:katab:debug-log'
const MAX_STORAGE_LINES = 1_000
const FLUSH_MS = 1_500
const MAX_BATCH = 80

let pending: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | undefined

function serializeArg(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function formatLine(level: string, scope: string, parts: unknown[]): string {
  const ts = new Date().toISOString()
  const body = parts.map(serializeArg).join(' ')
  return `${ts} [${level}] [${scope}] ${body}`
}

function mirrorToConsole(level: string, scope: string, parts: unknown[]): void {
  const tag = `[${scope}]`
  if (level === 'ERROR') console.error(tag, ...parts)
  else if (level === 'WARN') console.warn(tag, ...parts)
  else if (level === 'DEBUG') console.debug(tag, ...parts)
  else console.info(tag, ...parts)
}

function scheduleFlush(): void {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = undefined
    void flushPending()
  }, FLUSH_MS)
}

async function flushPending(): Promise<void> {
  if (pending.length === 0) return
  const batch = pending.splice(0, MAX_BATCH)
  const payload = `${batch.join('\n')}\n`

  try {
    await fetch(KATAB_LOG_RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: payload,
      keepalive: true,
    })
  } catch {
    // Relay not running — lines remain in chrome.storage.local
  }

  try {
    const prev = (await getChromeLocalValue<string[]>(STORAGE_KEY)) ?? []
    const next = [...prev, ...batch].slice(-MAX_STORAGE_LINES)
    await setChromeLocalValue(STORAGE_KEY, next)
  } catch (err) {
    console.error('[KaTab Log] storage persist failed', err)
  }

  if (pending.length > 0) scheduleFlush()
}

function enqueue(level: string, scope: string, parts: unknown[]): void {
  mirrorToConsole(level, scope, parts)
  pending.push(formatLine(level, scope, parts))
  scheduleFlush()
}

export const katabLog = {
  info(scope: string, ...parts: unknown[]): void {
    enqueue('INFO', scope, parts)
  },
  warn(scope: string, ...parts: unknown[]): void {
    enqueue('WARN', scope, parts)
  },
  error(scope: string, ...parts: unknown[]): void {
    enqueue('ERROR', scope, parts)
  },
  debug(scope: string, ...parts: unknown[]): void {
    enqueue('DEBUG', scope, parts)
  },
}

const ALARM_LOG_FLUSH = 'katab-debug-log-flush'

export function initKatabFileLogger(): void {
  katabLog.info('KaTab Log', 'file logger ready', KATAB_LOG_RELAY_URL)
  void chrome.alarms.clear(ALARM_LOG_FLUSH).then(() => {
    chrome.alarms.create(ALARM_LOG_FLUSH, { periodInMinutes: 1 })
  })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_LOG_FLUSH) flushKatabLogNow()
  })
}

export function flushKatabLogNow(): void {
  if (flushTimer != null) {
    clearTimeout(flushTimer)
    flushTimer = undefined
  }
  void flushPending()
}

export function appendKatabLogLine(level: string, scope: string, parts: unknown[]): void {
  enqueue(level.toUpperCase(), scope, parts)
}