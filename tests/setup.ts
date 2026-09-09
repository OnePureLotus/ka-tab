// Vitest global setup
// Mock chrome extension APIs for unit tests

const _mockStorage: Record<string, unknown> = {}

global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    connect: vi.fn(),
    onConnect: { addListener: vi.fn() },
  },
  storage: {
    sync: {
      get: vi.fn((_keys, cb) => cb?.({})),
      set: vi.fn((_items, cb) => cb?.()),
      onChanged: { addListener: vi.fn() },
    },
    local: {
      get: vi.fn((_keys, cb) => cb?.({})),
      set: vi.fn((_items, cb) => cb?.()),
    },
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    group: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    onCreated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    onActivated: { addListener: vi.fn() },
    onMoved: { addListener: vi.fn() },
  },
  tabGroups: {
    update: vi.fn(),
  },
  sessions: {
    restore: vi.fn(),
    getRecentlyClosed: vi.fn(),
    forgetClosedTab: vi.fn(),
  },
} as unknown as typeof chrome
