/** Must match `manifest.version` in wxt.config.ts */
export const EXTENSION_VERSION = '0.0.10'

/** Max real network fetches per rolling window (skipping already-cached does not count). */
export const FAVICON_FETCH_BATCH_SIZE = 10

/** Rate-limit window and backfill alarm interval (Chrome alarms use minutes; 0.5 = 30s). */
export const FAVICON_RATE_WINDOW_MS = 30_000
export const FAVICON_ALARM_PERIOD_MINUTES = 0.5