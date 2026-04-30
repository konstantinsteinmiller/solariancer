import type { LocalStorageAccessor, SaveStrategy } from './types'
import { isInternalKey } from './types'
import type { LocalBackupLayer } from './LocalBackupLayer'

// ─── SaveManager ───────────────────────────────────────────────────────────
//
// Owns the Strategy, the optional `LocalBackupLayer`, the raw localStorage
// bindings, and the monkey-patching that forwards writes into the strategy.
// One instance is created at boot (`main.ts`) and held as a module-level
// singleton; game code keeps calling plain `localStorage.setItem` unchanged
// — the manager intercepts and forwards.
//
// Boot phases (see `MOBILE_PERSISTENCE.md` Part 1):
//   0. backupLayer.init() — probe IDB for a usable snapshot
//   1. backupLayer.restoreInto(local) — seed missing keys from the snapshot
//      BEFORE strategy.hydrate, so the strategy sees the IDB-restored state
//   2. strategy.hydrate(local) — pull cloud (if reachable); merge logic
//      decides whether IDB-restored or cloud values win
//   3. patchLocalStorage() — game code's writes now flow through us
//   4. backupLayer.scheduleWrite(local) — fresh snapshot for next boot

export class SaveManager {
  private readonly rawSet: (key: string, value: string) => void
  private readonly rawRemove: (key: string) => void
  private readonly rawClear: () => void
  private readonly storage: Storage

  private patched = false
  private hydrated = false
  private mirroring = false

  constructor(
    private readonly strategy: SaveStrategy,
    private readonly backupLayer: LocalBackupLayer | null = null,
    storage: Storage = window.localStorage
  ) {
    this.storage = storage
    // Capture raw bindings before we replace them so the mirror can
    // actually write without recursing into itself.
    this.rawSet = storage.setItem.bind(storage)
    this.rawRemove = storage.removeItem.bind(storage)
    this.rawClear = storage.clear.bind(storage)
  }

  /** Strategy name — useful for logs/tests. */
  get strategyName(): string {
    return this.strategy.name
  }

  /** Expose the strategy for `useSaveStatus` / debugging. */
  get strategyRef(): SaveStrategy {
    return this.strategy
  }

  isHydrated(): boolean {
    return this.hydrated
  }

  /**
   * 4-phase boot. Idempotent. MUST be awaited before the Vue app module
   * graph loads, because many composables read `localStorage.getItem(...)`
   * at module evaluation time.
   */
  async init(): Promise<void> {
    if (this.hydrated) return
    this.mirroring = true
    try {
      // Phase 0 + 1 — IDB probe + restore (silently no-ops when no backup).
      if (this.backupLayer) {
        try {
          await this.backupLayer.init()
          this.backupLayer.restoreInto(this.localAccessor())
        } catch (e) {
          console.warn('[save] backup-layer init/restore failed', e)
        }
      }
      // Phase 2 — strategy hydrate (cloud).
      try {
        await this.strategy.hydrate(this.localAccessor())
      } catch (e) {
        console.warn(`[save] hydrate failed (${this.strategy.name})`, e)
      }
    } finally {
      this.mirroring = false
    }
    // Phase 3 — patch.
    this.patchLocalStorage()
    this.hydrated = true
    // Phase 4 — fire-and-forget snapshot of the post-hydrate state so the
    // NEXT boot has fresh data even if the strategy never touches IDB again.
    if (this.backupLayer) {
      this.backupLayer.scheduleWrite(this.localAccessor())
    }
  }

  /** Flush any pending writes. Best-effort — safe to await on unload. */
  async flush(): Promise<void> {
    const local = this.localAccessor()
    await Promise.allSettled([
      this.strategy.flush?.() ?? Promise.resolve(),
      this.backupLayer?.flush(local) ?? Promise.resolve()
    ])
  }

  /** Release timers / listeners held by the strategy and backup layer. */
  dispose(): void {
    try {
      this.strategy.dispose?.()
    } catch { /* ignore */
    }
    try {
      this.backupLayer?.dispose()
    } catch { /* ignore */
    }
  }

  // ─── internals ──────────────────────────────────────────────────────────

  private localAccessor(): LocalStorageAccessor {
    return {
      get: (key) => this.storage.getItem(key),
      set: (key, value) => this.rawSet(key, value),
      remove: (key) => this.rawRemove(key),
      keys: () => {
        const out: string[] = []
        for (let i = 0; i < this.storage.length; i++) {
          const k = this.storage.key(i)
          if (k !== null) out.push(k)
        }
        return out
      }
    }
  }

  private patchLocalStorage(): void {
    if (this.patched) return
    this.patched = true

    this.storage.setItem = (key: string, value: string) => {
      this.rawSet(key, value)
      if (this.mirroring || isInternalKey(key)) return
      try {
        this.strategy.onLocalSet(key, value)
      } catch (e) {
        console.warn(`[save] onLocalSet("${key}") threw`, e)
      }
      // Mirror to IDB on every game-state write (debounced inside).
      this.backupLayer?.scheduleWrite(this.localAccessor())
    }

    this.storage.removeItem = (key: string) => {
      this.rawRemove(key)
      if (this.mirroring || isInternalKey(key)) return
      try {
        this.strategy.onLocalRemove(key)
      } catch (e) {
        console.warn(`[save] onLocalRemove("${key}") threw`, e)
      }
      this.backupLayer?.scheduleWrite(this.localAccessor())
    }

    // `clear()` is rarely used by the game but keeping the mirror honest
    // matters if it ever is. Emits a remove for every tracked key.
    this.storage.clear = () => {
      const keys: string[] = []
      for (let i = 0; i < this.storage.length; i++) {
        const k = this.storage.key(i)
        if (k !== null) keys.push(k)
      }
      this.rawClear()
      for (const k of keys) {
        if (isInternalKey(k)) continue
        try {
          this.strategy.onLocalRemove(k)
        } catch (e) {
          console.warn(`[save] onLocalRemove (clear) threw`, e)
        }
      }
      this.backupLayer?.scheduleWrite(this.localAccessor())
    }
  }
}
