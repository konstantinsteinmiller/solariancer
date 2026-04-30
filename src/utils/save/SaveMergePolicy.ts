import type { LocalStorageAccessor } from './types'
import { SOL_APP_KEY } from './solStore'

// ─── Save merge policy ───────────────────────────────────────────────────
//
// Pure (Vue-free) logic shared by every cloud-backed `SaveStrategy`. Two
// responsibilities:
//
//   1. Compute a numeric `progressScore` from the player's current state
//      so two snapshots (local vs remote) can be compared without parsing
//      the gameplay state itself.
//   2. Decide which side wins on hydrate (`local-wins`, `remote-wins`,
//      or `local-only` / `remote-only` for the empty-side cases).
//
// The strategy is responsible for loading remote state and calling
// `decideMerge` with both metas. On `remote-wins` it copies the cloud
// snapshot's keys into local AND awards a small bonus to soften the
// "started over" feel of a cross-device sync. The bonus is dedup'd via
// `SaveMeta.bonusReceivedFor` — see `MOBILE_PERSISTENCE.md` Part 4.
//
// Vue is intentionally NOT imported — keeps this module unit-testable
// without a full app graph and avoids circular deps with composables.

export const META_KEY = '__save_meta__'
export const SCHEMA_VERSION = 1

/** Localstorage keys that this game considers part of the player's
 *  cross-device save. Today there's only one — `sol_app_v1` — but the
 *  strategies iterate this list so adding another is a one-line change. */
export const SAVE_KEYS = [SOL_APP_KEY] as const

/** Predicate: does this localStorage key participate in cloud sync? */
export const isPayloadKey = (key: string): boolean =>
  (SAVE_KEYS as readonly string[]).includes(key)

export interface SaveMeta {
  /** ISO timestamp of when the snapshot was written. */
  savedAt: string
  /** Numeric weighting of the player's progress — higher wins. */
  progressScore: number
  /** Bumped on breaking changes to either the meta or payload schema. */
  schemaVersion: number
  /** Highest stage the player has ever reached — drives the bonus on
   *  `remote-wins` so big saves surface a more generous "welcome back". */
  maxStage: number
  /** Cloud `savedAt` for which this client already received the bonus.
   *  Survives force-close via the cloud round-trip AND via the IDB backup
   *  (META key is not internal, gets backed up). Robust to either
   *  partition being wiped — just not both. */
  bonusReceivedFor?: string
}

export type MergeDecision =
  | { kind: 'local-only' }
  | { kind: 'remote-only' }
  | { kind: 'local-wins' }
  | { kind: 'remote-wins'; bonusCoins: number; bonusAlreadyReceived: boolean }

const safeJson = <T>(raw: string | null, fallback: T): T => {
  if (raw == null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Compute progress meta from a localStorage snapshot. Reads the `sol_app_v1`
 * blob and pulls the keeper section's stage / heat / upgrades / achievements
 * — the four signals that capture lifetime progress in solariancer.
 *
 * The multipliers below were tuned so:
 *   • A fresh save scores ~0
 *   • Stage advance dominates short-term swings (500/stage)
 *   • A decked-out late-game player breaks ~10k
 *   • One achievement is worth roughly 1/5 of a stage advance
 */
export const computeMeta = (
  read: LocalStorageAccessor,
  savedAt: string = new Date().toISOString()
): SaveMeta => {
  const blob = safeJson<Record<string, unknown> | null>(read.get(SOL_APP_KEY), null)
  const keeper = (blob && typeof blob.keeper === 'object' && blob.keeper)
    ? (blob.keeper as Record<string, unknown>)
    : {}
  const achievementsUnlocked = (blob && typeof blob.achievementsUnlocked === 'object' && blob.achievementsUnlocked)
    ? (blob.achievementsUnlocked as Record<string, unknown>)
    : {}

  const stage = Math.max(
    1,
    typeof keeper.highestStage === 'number' ? keeper.highestStage : 1,
    typeof keeper.stage === 'number' ? keeper.stage : 1
  )
  const totalHeat = typeof keeper.totalHeatEarned === 'number' ? keeper.totalHeatEarned : 0
  const upgrades = (typeof keeper.upgrades === 'object' && keeper.upgrades)
    ? keeper.upgrades as Record<string, number>
    : {}
  const upgradeLevels = Object.values(upgrades).reduce(
    (acc, v) => acc + (typeof v === 'number' ? v : 0),
    0
  )
  const achievementCount = Object.keys(achievementsUnlocked).length

  const progressScore =
    stage * 500
    + upgradeLevels * 150
    + achievementCount * 100
    + Math.floor(totalHeat / 100)

  return {
    savedAt,
    progressScore,
    schemaVersion: SCHEMA_VERSION,
    maxStage: stage
    // bonusReceivedFor intentionally absent on freshly-computed meta — the
    // strategy fills it in when applying a remote-wins bonus.
  }
}

export const parseMeta = (raw: string | null): SaveMeta | null => {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<SaveMeta>
    if (
      typeof v.savedAt !== 'string' ||
      typeof v.progressScore !== 'number' ||
      typeof v.schemaVersion !== 'number' ||
      typeof v.maxStage !== 'number'
    ) {
      return null
    }
    const meta: SaveMeta = {
      savedAt: v.savedAt,
      progressScore: v.progressScore,
      schemaVersion: v.schemaVersion,
      maxStage: v.maxStage
    }
    if (typeof v.bonusReceivedFor === 'string') {
      meta.bonusReceivedFor = v.bonusReceivedFor
    }
    return meta
  } catch {
    return null
  }
}

export const serializeMeta = (meta: SaveMeta): string => JSON.stringify(meta)

/**
 * Pick the winning side. On `remote-wins` also returns whether the bonus
 * has already been paid for this cloud `savedAt` (so the strategy can
 * skip the coin grant + banner without skipping the actual restore).
 */
export const decideMerge = (
  localMeta: SaveMeta | null,
  remoteMeta: SaveMeta | null
): MergeDecision => {
  if (!remoteMeta) return localMeta ? { kind: 'local-only' } : { kind: 'local-only' }
  if (!localMeta) return { kind: 'remote-only' }
  if (remoteMeta.progressScore > localMeta.progressScore) {
    const alreadyReceived =
      !!localMeta.bonusReceivedFor && localMeta.bonusReceivedFor === remoteMeta.savedAt
    const bonusCoins = localMeta.progressScore > 0 ? remoteMeta.maxStage * 50 : 0
    return { kind: 'remote-wins', bonusCoins, bonusAlreadyReceived: alreadyReceived }
  }
  return { kind: 'local-wins' }
}
