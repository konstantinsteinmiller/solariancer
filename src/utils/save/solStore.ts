// ─── Consolidated app save store ──────────────────────────────────────────
//
// Solariancer's per-feature `sol_*` localStorage keys (state, battle pass,
// achievements unlocked / unseen) are merged into a SINGLE blob under the
// key `sol_app_v1`. Reasons:
//
//   1. `localStorage` pollution — fewer top-level keys means cleaner devtool
//      inspection and a single key to mirror to cloud strategies.
//   2. The cloud round-trip costs O(N) keys per flush. With one key, every
//      strategy ships one payload per save instead of N.
//   3. The whole app's progress is already a single source of truth from
//      a merge / conflict-resolution perspective — no per-section conflict
//      semantics make sense here, so collapsing the model fits.
//
// The first read in a page load runs a one-time migration that pulls any
// legacy `sol_*` keys into the consolidated blob and drops them. Includes
// the historical `sol_keeper_state_v1` key (an artifact from a previous
// CrazyGames-SDK-mirror layout) — when both `sol_state_v1` and the legacy
// keeper key exist we keep whichever has more progress (heat + stage*1000).

export const SOL_APP_KEY = 'sol_app_v1'

interface SolAppBlob {
  version: number
  keeper?: unknown
  battlePass?: unknown
  achievementsUnlocked?: unknown
  achievementsUnseen?: unknown
}

export type SolAppSection = Exclude<keyof SolAppBlob, 'version'>

interface LegacyMigration {
  key: string
  section: SolAppSection
}

const LEGACY_MIGRATIONS: readonly LegacyMigration[] = [
  { key: 'sol_state_v1', section: 'keeper' },
  { key: 'sol_keeper_state_v1', section: 'keeper' },
  { key: 'sol_battle_pass_v1', section: 'battlePass' },
  { key: 'sol_achievements_unlocked_v1', section: 'achievementsUnlocked' },
  { key: 'sol_achievements_unseen_v1', section: 'achievementsUnseen' }
]

const emptyBlob = (): SolAppBlob => ({ version: 1 })

let migrationDone = false

// Rough "which keeper blob has more progress" comparator. Used when both
// `sol_state_v1` and `sol_keeper_state_v1` exist (CG SDK shadow vs
// app-side primary). The two are usually within a tick of each other; on
// rare desync the higher score is the more recent / authoritative one.
const scoreKeeper = (k: unknown): number => {
  if (!k || typeof k !== 'object') return 0
  const obj = k as Record<string, unknown>
  const heat = typeof obj.totalHeatEarned === 'number' ? obj.totalHeatEarned : 0
  const stage = typeof obj.highestStage === 'number' ? obj.highestStage : 0
  const ripe = typeof obj.totalRipeFeeds === 'number' ? obj.totalRipeFeeds : 0
  return heat + stage * 1000 + ripe * 10
}

const runMigrationOnce = (): SolAppBlob => {
  if (migrationDone) return emptyBlob()
  migrationDone = true
  const blob: SolAppBlob = emptyBlob()
  let bestKeeperScore = -1
  for (const { key, section } of LEGACY_MIGRATIONS) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      if (section === 'keeper') {
        const score = scoreKeeper(parsed)
        if (score <= bestKeeperScore) continue
        bestKeeperScore = score
        blob.keeper = parsed
      } else {
        blob[section] = parsed
      }
    } catch {
      // malformed — skip; defaults will be used
    }
  }
  // Only persist + clean up legacy keys when we actually found something.
  // A fresh install (no legacy data) leaves localStorage untouched until
  // the first real write — keeps "clear local storage and reload" behavior
  // identical to before.
  const hadAny =
    bestKeeperScore >= 0 ||
    blob.battlePass !== undefined ||
    blob.achievementsUnlocked !== undefined ||
    blob.achievementsUnseen !== undefined
  if (hadAny) {
    try {
      localStorage.setItem(SOL_APP_KEY, JSON.stringify(blob))
    } catch {
      /* ignore */
    }
    for (const { key } of LEGACY_MIGRATIONS) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }
  }
  return blob
}

const readBlob = (): SolAppBlob => {
  try {
    const raw = localStorage.getItem(SOL_APP_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object') return parsed as SolAppBlob
    }
  } catch {
    /* fall through to migration */
  }
  return runMigrationOnce()
}

/**
 * Read a section from the consolidated blob, with a `fallback` if the
 * section is missing or malformed. Optional `parse` lets the caller normalise
 * legacy shapes into its current type while still benefitting from the
 * fallback on parse failure.
 */
export const loadSection = <T>(
  section: SolAppSection,
  fallback: T,
  parse?: (raw: unknown) => T
): T => {
  const blob = readBlob()
  const v = blob[section]
  if (v === undefined || v === null) return fallback
  if (!parse) return v as T
  try {
    return parse(v)
  } catch {
    return fallback
  }
}

/**
 * Write a section back into the consolidated blob. Other sections are
 * preserved. Reads are always done from `localStorage` (not an in-memory
 * cache) so a late strategy hydrate that overwrites `sol_app_v1` is
 * picked up on the next save without an explicit invalidation call.
 */
export const saveSection = <T>(section: SolAppSection, value: T): void => {
  const blob = readBlob() as unknown as Record<string, unknown>
  blob[section] = value
  try {
    localStorage.setItem(SOL_APP_KEY, JSON.stringify(blob))
  } catch {
    /* ignore */
  }
}
