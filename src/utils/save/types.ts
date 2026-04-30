// ─── Save Strategy contract ────────────────────────────────────────────────
//
// The game uses the browser's synchronous `localStorage` as the source of
// truth at runtime — ~15 module-level reads fire during app bootstrap and
// many components write back on change. Each environment (plain web,
// CrazyGames, Glitch, GameDistribution) layers a different *backend* on top
// of that local mirror to persist progress between devices.
//
// Rather than scatter build-flag branches through every call site, each
// backend is implemented as a `SaveStrategy`. `SaveManager` picks one at
// boot, hydrates localStorage from the backend, then forwards every
// subsequent local write to the strategy. Adding a new backend is a matter
// of implementing this one interface.

/**
 * Narrow accessor passed to strategies so they can read / write
 * localStorage without re-entering the SaveManager's mirror wrappers.
 * Strategies MUST use this instead of `window.localStorage` during
 * hydration, otherwise they'd trigger their own mirror recursively.
 */
export interface LocalStorageAccessor {
  get(key: string): string | null

  set(key: string, value: string): void

  remove(key: string): void

  keys(): string[]
}

/** State machine for the bulletproof hydrate protocol. A strategy starts
 *  in `'pending'` and transitions to one of the terminal-or-retry states
 *  during `hydrate()`:
 *
 *  - `'success-with-data'`  — cloud reachable, payload restored.
 *  - `'success-empty'`      — cloud reachable, no payload (fresh account).
 *  - `'failed-retrying'`    — cloud unreachable / transient error; the
 *                              strategy will retry in the background.
 *  - `'failed-final'`       — gave up; localStorage stays authoritative.
 *
 *  Why the discriminator matters: a transient SDK error during boot must
 *  NOT be confused with "remote confirmed empty". Without it, a brief
 *  outage at boot would wipe the player's local progress on the next
 *  remote-wins decision. See the `bulletproof-save-manager` skill for the
 *  full failure mode.
 */
export type HydrateState =
  | 'pending'
  | 'success-with-data'
  | 'success-empty'
  | 'failed-retrying'
  | 'failed-final'

export interface HydrateNotice {
  state: HydrateState
  /** Human-readable note for logs / banner UIs. */
  reason?: string
  /** Coins awarded as a "remote-wins" cushion, if any. UI surfaces this
   *  as a toast/banner when set. */
  bonusCoins?: number
}

export type HydrateNoticeListener = (notice: HydrateNotice) => void

export interface SaveStrategy {
  /** Short human-readable name used in logs and for testing. */
  readonly name: string

  /** Current state machine position — set by the strategy during
   *  `hydrate()` / `retryHydrate()`. Optional for back-compat with strategies
   *  that don't implement the bulletproof protocol yet (LocalStorage). */
  readonly hydrateState?: HydrateState

  /**
   * Pull authoritative state from the backend into localStorage. Must
   * resolve before any Vue module reads `localStorage.getItem(...)` at
   * load time — the SaveManager awaits this before the main app graph
   * imports.
   *
   * A strategy should degrade to a no-op if its backend is unavailable
   * (SDK not loaded, auth token missing, network error). The local mirror
   * still works on its own — failing hydrate must never brick the game.
   */
  hydrate(local: LocalStorageAccessor): Promise<void>

  /** Background retry hook for strategies that ended `hydrate()` in
   *  `'failed-retrying'`. SaveManager schedules this on a backoff after
   *  a failed initial hydrate. Resolves with the new state. */
  retryHydrate?(local: LocalStorageAccessor): Promise<HydrateState>

  /** Subscribe to `hydrateState` transitions. Used by `useSaveStatus` to
   *  bump `saveDataVersion` so composables can re-read localStorage when
   *  a delayed retry succeeds. Returns an unsubscribe function. */
  onHydrateNotice?(listener: HydrateNoticeListener): () => void

  /**
   * Called every time application code writes to localStorage (after the
   * local write has already landed). Strategies typically enqueue the
   * change for eventual push to their backend, debounced to avoid
   * hammering the network on rapid game-state writes.
   */
  onLocalSet(key: string, value: string): void

  /** Companion to onLocalSet for removals. */
  onLocalRemove(key: string): void

  /** Flush any pending writes. Optional — best-effort on page unload. */
  flush?(): Promise<void>

  /** Release resources (timers, listeners). Optional. */
  dispose?(): void
}

/**
 * Keys whose persistence is internal to a strategy (manifests, version
 * counters, etc.). SaveManager never forwards these to `onLocalSet` /
 * `onLocalRemove`, preventing recursion when a strategy writes its own
 * bookkeeping through the wrapped `localStorage.setItem`.
 */
export const INTERNAL_KEY_PREFIX = '__save_internal__'

/**
 * Developer-only keys that live purely in localStorage and must NOT be
 * mirrored to the cloud backend. These are dev toggles set by hand from
 * devtools (e.g. `localStorage.fps='true'` to enable the perf meter); we
 * don't want a cloud save to push them across devices or persist them in
 * a player's account.
 */
const DEV_LOCAL_KEYS: readonly string[] = ['fps', 'debug', 'campaign-test', 'cheat']

export const isInternalKey = (key: string): boolean =>
  key.startsWith(INTERNAL_KEY_PREFIX) ||
  key.startsWith('__SafeLocalStorage__') || // CrazyGames SDK scratch space
  key.startsWith('SDK_DATA_') ||             // CrazyGames SDK scratch space
  DEV_LOCAL_KEYS.includes(key)               // dev-only flags (perf meter, etc.)
