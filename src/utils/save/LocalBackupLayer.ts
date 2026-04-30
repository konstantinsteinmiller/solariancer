import type { LocalStorageAccessor } from './types'
import { isInternalKey } from './types'

// ─── LocalBackupLayer (IDB second-tier persistence) ───────────────────────
//
// Mirrors a snapshot of localStorage into IndexedDB. Sits ALONGSIDE the
// active `SaveStrategy` as a second device-local tier — never replaces the
// strategy, never owns cross-device sync.
//
// Why: mobile webviews on iOS sometimes preserve IDB across force-close
// while wiping localStorage. If localStorage is gone but IDB is still
// there, `SaveManager.init()` reads the IDB snapshot and seeds localStorage
// BEFORE the strategy hydrates — so the player keeps their progress even
// in offline / anonymous scenarios where the cloud strategy can't help.
//
// On every game-state write, a debounced 1s timer schedules a fresh
// snapshot to IDB. `flush()` (called from pagehide / visibilitychange in
// `main.ts`) cancels the timer and writes immediately.

export interface AsyncKVStore {
  get(key: string): Promise<string | null>

  set(key: string, value: string): Promise<void>

  remove(key: string): Promise<void>
}

interface BackupSnapshot {
  version: number
  savedAt: string
  payload: Record<string, string>
  checksum: string
}

const SNAPSHOT_KEY = 'sol_localBackup_v1'
const SNAPSHOT_VERSION = 1
const WRITE_DEBOUNCE_MS = 1000

// djb2 — short, dependency-free hash for corruption detection. Not a
// security primitive; the cost of a malformed snapshot is "we don't restore"
// not "we lose data".
const checksumOf = (payload: Record<string, string>): string => {
  let h = 5381
  const keys = Object.keys(payload).sort()
  for (const k of keys) {
    const v = payload[k]!
    for (let i = 0; i < k.length; i++) h = ((h * 33) ^ k.charCodeAt(i)) >>> 0
    h = ((h * 33) ^ 0x5e) >>> 0
    for (let i = 0; i < v.length; i++) h = ((h * 33) ^ v.charCodeAt(i)) >>> 0
  }
  return h.toString(16)
}

// ─── Production store ──────────────────────────────────────────────────
export class IndexedDBStore implements AsyncKVStore {
  private dbName: string
  private storeName: string
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(dbName = 'sol_save_backup', storeName = 'snapshots') {
    this.dbName = dbName
    this.storeName = storeName
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('IDB open failed'))
    })
    return this.dbPromise
  }

  async get(key: string): Promise<string | null> {
    try {
      const db = await this.openDb()
      return await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const req = store.get(key)
        req.onsuccess = () => {
          const v = req.result
          resolve(typeof v === 'string' ? v : null)
        }
        req.onerror = () => reject(req.error ?? new Error('IDB get failed'))
      })
    } catch (e) {
      console.warn('[save/idb] get failed', e)
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const db = await this.openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        tx.objectStore(this.storeName).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('IDB set failed'))
        tx.onabort = () => reject(tx.error ?? new Error('IDB set aborted'))
      })
    } catch (e) {
      console.warn('[save/idb] set failed', e)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        tx.objectStore(this.storeName).delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('IDB remove failed'))
        tx.onabort = () => reject(tx.error ?? new Error('IDB remove aborted'))
      })
    } catch (e) {
      console.warn('[save/idb] remove failed', e)
    }
  }
}

// ─── Test-side store ───────────────────────────────────────────────────
export class MemoryStore implements AsyncKVStore {
  private map = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.map.has(key) ? this.map.get(key)! : null
  }

  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value)
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key)
  }
}

export class LocalBackupLayer {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private latestSnapshot: BackupSnapshot | null = null
  private hasInitialSnapshot = false
  private disposed = false

  constructor(private readonly store: AsyncKVStore) {
  }

  /** Probe for an existing snapshot. Should be awaited once before
   *  `SaveManager` calls `restoreInto` — this populates `hasSnapshot()`
   *  cheaply. */
  async init(): Promise<void> {
    const raw = await this.store.get(SNAPSHOT_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as BackupSnapshot
      if (
        parsed?.version === SNAPSHOT_VERSION &&
        parsed?.payload && typeof parsed.payload === 'object' &&
        typeof parsed.checksum === 'string' &&
        checksumOf(parsed.payload) === parsed.checksum
      ) {
        this.latestSnapshot = parsed
        this.hasInitialSnapshot = true
      } else {
        console.warn('[save/backup] snapshot checksum mismatch — discarding')
      }
    } catch (e) {
      console.warn('[save/backup] snapshot parse failed', e)
    }
  }

  hasSnapshot(): boolean {
    return this.hasInitialSnapshot
  }

  /** If we found a usable snapshot at init time, restore its non-internal
   *  keys into localStorage. Strategy.hydrate runs AFTER this so it sees
   *  the IDB-restored state when reading per-key values. */
  restoreInto(local: LocalStorageAccessor): void {
    if (!this.latestSnapshot) return
    for (const [k, v] of Object.entries(this.latestSnapshot.payload)) {
      if (isInternalKey(k)) continue
      // Only seed missing keys — if localStorage already has a value we
      // trust it (same-session restore). The strategy still gets a chance
      // to override on `remote-wins`.
      if (local.get(k) == null) local.set(k, v)
    }
  }

  /** Capture the current state of localStorage (excluding internal keys)
   *  into IDB. Debounced 1s by default; pass through `flush()` to bypass. */
  scheduleWrite(local: LocalStorageAccessor): void {
    if (this.disposed) return
    if (this.debounceTimer !== null) return
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      void this.writeNow(local)
    }, WRITE_DEBOUNCE_MS)
  }

  async flush(local?: LocalStorageAccessor): Promise<void> {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (local) await this.writeNow(local)
  }

  dispose(): void {
    this.disposed = true
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }

  private async writeNow(local: LocalStorageAccessor): Promise<void> {
    const payload: Record<string, string> = {}
    for (const k of local.keys()) {
      if (isInternalKey(k)) continue
      const v = local.get(k)
      if (v != null) payload[k] = v
    }
    const snapshot: BackupSnapshot = {
      version: SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      payload,
      checksum: checksumOf(payload)
    }
    this.latestSnapshot = snapshot
    this.hasInitialSnapshot = true
    try {
      await this.store.set(SNAPSHOT_KEY, JSON.stringify(snapshot))
    } catch (e) {
      console.warn('[save/backup] writeNow failed', e)
    }
  }
}
