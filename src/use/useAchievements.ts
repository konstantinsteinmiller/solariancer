import { ref, computed, watch } from 'vue'
import useSolKeeper, { STAGE_TYPES } from '@/use/useSolKeeper'

// ─── Achievement system ────────────────────────────────────────────────────
//
// Self-evaluating registry of named goals tied to lifetime player state.
// Each definition has a predicate `check(state)` that runs every time the
// keeper state changes (deep watch). Newly satisfied predicates flip into
// `unlocked` and queue into `unseen` so the HUD trophy can pulse until the
// modal is opened. Persistence is two localStorage blobs (unlocked map +
// unseen list) so achievements survive across sessions and prestige.
//
// To add a new achievement: append a record to ACHIEVEMENTS with a unique
// id, a glyph (≤ 5 chars to fit the crest ribbon), an accent palette, and
// a check function reading from SolAchievementState. No other wiring needed.

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SolAchievementState {
  /** Lifetime heat ever earned (across prestiges) */
  lifetimeHeat: number
  totalRipeFeeds: number
  totalCometsCaught: number
  totalBlackHolesSurvived: number
  bestComboChain: number
  highestStage: number
  solarClass: number
  streakDays: number
  upgrades: Record<string, number>
  /** Highest sun-skin tier unlocked (0..7) */
  unlockedSunSkin: number
  unlockedTrailCount: number
  tutorialSeen: boolean
  totalMissionsCompleted: number
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** Short label drawn inside the crest shield. ≤ 5 chars looks best. */
  glyph: string
  /** Accent colors driving the crest gradient / border. */
  color: { from: string; to: string; accent: string }
  check: (s: SolAchievementState) => boolean
}

// ─── Persistence ───────────────────────────────────────────────────────────

const UNLOCKED_KEY = 'sol_achievements_unlocked_v1'
const UNSEEN_KEY = 'sol_achievements_unseen_v1'

const loadUnlocked = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const loadUnseen = (): string[] => {
  try {
    const raw = localStorage.getItem(UNSEEN_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const unlocked = ref<Record<string, number>>(loadUnlocked())
const unseen = ref<string[]>(loadUnseen())

const saveUnlocked = () => localStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlocked.value))
const saveUnseen = () => localStorage.setItem(UNSEEN_KEY, JSON.stringify(unseen.value))

// ─── Definitions ───────────────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Onboarding ──────────────────────────────────────────────────────────
  {
    id: 'tutorial_graduate',
    title: 'Bright Beginnings',
    description: 'Complete the intro tutorial.',
    glyph: '★1',
    color: { from: '#86efac', to: '#16a34a', accent: '#064e20' },
    check: (s) => s.tutorialSeen
  },
  {
    id: 'first_light',
    title: 'First Light',
    description: 'Feed your first ripe body to the Sun.',
    glyph: 'I',
    color: { from: '#fde047', to: '#f59e0b', accent: '#b45309' },
    check: (s) => s.totalRipeFeeds >= 1
  },

  // ── Stage progression ───────────────────────────────────────────────────
  {
    id: 'stage_5',
    title: 'Star-Tested',
    description: `Reach Stage 5 (${STAGE_TYPES[4]}).`,
    glyph: 'V',
    color: { from: '#fef9c3', to: '#d97706', accent: '#451a03' },
    check: (s) => s.highestStage >= 5
  },
  {
    id: 'stage_10',
    title: 'Stellar Veteran',
    description: 'Reach Stage 10. Welcome to the K-Type cycle.',
    glyph: 'X',
    color: { from: '#fbbf24', to: '#92400e', accent: '#451a03' },
    check: (s) => s.highestStage >= 10
  },
  {
    id: 'stage_25',
    title: 'Galactic Conqueror',
    description: 'Reach Stage 25.',
    glyph: 'XXV',
    color: { from: '#f472b6', to: '#be185d', accent: '#4a0a2d' },
    check: (s) => s.highestStage >= 25
  },

  // ── Lifetime heat ───────────────────────────────────────────────────────
  {
    id: 'heat_1m',
    title: 'Stellar Tycoon',
    description: 'Earn 1,000,000 lifetime heat.',
    glyph: '1M',
    color: { from: '#fef08a', to: '#ea580c', accent: '#431407' },
    check: (s) => s.lifetimeHeat >= 1_000_000
  },
  {
    id: 'heat_100m',
    title: 'Cosmic Magnate',
    description: 'Earn 100,000,000 lifetime heat.',
    glyph: '100M',
    color: { from: '#fde68a', to: '#9a3412', accent: '#451a03' },
    check: (s) => s.lifetimeHeat >= 100_000_000
  },

  // ── Comets ──────────────────────────────────────────────────────────────
  {
    id: 'comet_first',
    title: 'Comet Hunter',
    description: 'Catch your first comet.',
    glyph: '☄',
    color: { from: '#67e8f9', to: '#0e7490', accent: '#083344' },
    check: (s) => s.totalCometsCaught >= 1
  },
  {
    id: 'comet_25',
    title: 'Comet Veteran',
    description: 'Catch 25 comets.',
    glyph: '☄25',
    color: { from: '#67e8f9', to: '#0369a1', accent: '#083344' },
    check: (s) => s.totalCometsCaught >= 25
  },
  {
    id: 'comet_100',
    title: 'Comet Master',
    description: 'Catch 100 comets.',
    glyph: '☄100',
    color: { from: '#7dd3fc', to: '#1e40af', accent: '#1e3a8a' },
    check: (s) => s.totalCometsCaught >= 100
  },

  // ── Black holes ─────────────────────────────────────────────────────────
  {
    id: 'bh_first',
    title: 'Black-Hole Survivor',
    description: 'Survive your first black hole event.',
    glyph: 'BH',
    color: { from: '#c084fc', to: '#6b21a8', accent: '#2e0a4a' },
    check: (s) => s.totalBlackHolesSurvived >= 1
  },
  {
    id: 'bh_25',
    title: 'Event-Horizon Master',
    description: 'Survive 25 black hole events.',
    glyph: 'BH25',
    color: { from: '#a855f7', to: '#3b0764', accent: '#1e0a4a' },
    check: (s) => s.totalBlackHolesSurvived >= 25
  },

  // ── Combos ──────────────────────────────────────────────────────────────
  {
    id: 'combo_5',
    title: 'On Fire',
    description: 'Reach a combo chain of 5.',
    glyph: 'C5',
    color: { from: '#fef08a', to: '#f97316', accent: '#7c2d12' },
    check: (s) => s.bestComboChain >= 5
  },
  {
    id: 'combo_10',
    title: 'Inferno',
    description: 'Reach a combo chain of 10.',
    glyph: 'C10',
    color: { from: '#fdba74', to: '#9a3412', accent: '#7c2d12' },
    check: (s) => s.bestComboChain >= 10
  },

  // ── Ripe feeds ──────────────────────────────────────────────────────────
  {
    id: 'ripe_100',
    title: 'Sun Whisperer',
    description: 'Feed 100 ripe bodies to the Sun.',
    glyph: '100R',
    color: { from: '#fbbf24', to: '#7c2d12', accent: '#451a03' },
    check: (s) => s.totalRipeFeeds >= 100
  },

  // ── Streak ──────────────────────────────────────────────────────────────
  {
    id: 'streak_3',
    title: 'On The Daily',
    description: 'Reach a 3-day feed streak.',
    glyph: '3d',
    color: { from: '#fcd34d', to: '#b45309', accent: '#451a03' },
    check: (s) => s.streakDays >= 3
  },
  {
    id: 'streak_30',
    title: 'Constellation Devotee',
    description: 'Reach a 30-day feed streak.',
    glyph: '30d',
    color: { from: '#fbbf24', to: '#7c2d12', accent: '#3b0764' },
    check: (s) => s.streakDays >= 30
  },

  // ── Prestige ────────────────────────────────────────────────────────────
  {
    id: 'first_supernova',
    title: 'Supernova',
    description: 'Prestige once — reach Solar Class 1.',
    glyph: '★',
    color: { from: '#e9d5ff', to: '#7c3aed', accent: '#1e0a4a' },
    check: (s) => s.solarClass >= 1
  },
  {
    id: 'solar_class_5',
    title: 'Pulsar Mind',
    description: 'Reach Solar Class 5.',
    glyph: '★5',
    color: { from: '#fbcfe8', to: '#a21caf', accent: '#3b0764' },
    check: (s) => s.solarClass >= 5
  },

  // ── Upgrades + Cosmetic ─────────────────────────────────────────────────
  {
    id: 'cosmic_forge_max',
    title: 'Forge Master',
    description: 'Max out the Cosmic Forge upgrade.',
    glyph: 'CF5',
    color: { from: '#c8a8ff', to: '#5d3aa8', accent: '#3b0764' },
    check: (s) => (s.upgrades.cosmicForge ?? 0) >= 5
  },
  {
    id: 'big_probe',
    title: 'Big Iron',
    description: 'Buy a Big Probe Station.',
    glyph: 'BP',
    color: { from: '#ffd14a', to: '#7a3a0e', accent: '#451a03' },
    check: (s) => (s.upgrades.bigProbeStation ?? 0) >= 1
  },
  {
    id: 'all_skins',
    title: 'Gallery of Stars',
    description: 'Unlock all 8 sun skins.',
    glyph: 'SKIN',
    color: { from: '#a5f3fc', to: '#1e40af', accent: '#0e7490' },
    check: (s) => s.unlockedSunSkin >= 7
  },

  // ── Mission ─────────────────────────────────────────────────────────────
  {
    id: 'mission_first',
    title: 'Mission Achieved',
    description: 'Complete your first 3-minute Mission.',
    glyph: 'M1',
    color: { from: '#7dd3fc', to: '#0c4a6e', accent: '#082f49' },
    check: (s) => s.totalMissionsCompleted >= 1
  }
]

// ─── Evaluation ────────────────────────────────────────────────────────────

const buildState = (): SolAchievementState => {
  const sk = useSolKeeper()
  const s = sk.state.value
  return {
    lifetimeHeat: s.totalHeatEarned + s.lifetimeHeatAtReset,
    totalRipeFeeds: s.totalRipeFeeds,
    totalCometsCaught: s.totalCometsCaught,
    totalBlackHolesSurvived: s.totalBlackHolesSurvived,
    bestComboChain: s.bestComboChain,
    highestStage: s.highestStage,
    solarClass: s.solarClass,
    streakDays: s.streak.days,
    upgrades: s.upgrades,
    unlockedSunSkin: s.preferences.unlockedSunSkin,
    unlockedTrailCount: s.preferences.unlockedTrails.length,
    tutorialSeen: s.tutorialSeen,
    totalMissionsCompleted: s.totalMissionsCompleted
  }
}

const evaluateAll = (): string[] => {
  const state = buildState()
  const newly: string[] = []
  for (const a of ACHIEVEMENTS) {
    if (unlocked.value[a.id]) continue
    if (a.check(state)) {
      unlocked.value[a.id] = Date.now()
      newly.push(a.id)
    }
  }
  if (newly.length > 0) {
    unlocked.value = { ...unlocked.value }
    saveUnlocked()
    for (const id of newly) {
      if (!unseen.value.includes(id)) unseen.value.push(id)
    }
    unseen.value = unseen.value.slice()
    saveUnseen()
  }
  return newly
}

const markAllSeen = () => {
  if (unseen.value.length === 0) return
  unseen.value = []
  saveUnseen()
}

// One-time deep watch on the keeper's persistent state. The check predicates
// are pure / cheap — running them on every state mutation is fine and keeps
// the system reactive without coupling each event source to evaluation.
let watchSetup = false
const ensureWatcher = (): void => {
  if (watchSetup) return
  watchSetup = true
  const sk = useSolKeeper()
  watch(() => sk.state.value, () => evaluateAll(), { deep: true, immediate: true })
}

// ─── Public API ────────────────────────────────────────────────────────────

const useAchievements = () => {
  ensureWatcher()
  return {
    achievements: ACHIEVEMENTS,
    unlocked: computed(() => unlocked.value),
    isUnlocked: (id: string) => Boolean(unlocked.value[id]),
    unlockedCount: computed(() => Object.keys(unlocked.value).length),
    unseenCount: computed(() => unseen.value.length),
    totalCount: ACHIEVEMENTS.length,
    markAllSeen,
    evaluate: evaluateAll
  }
}

export default useAchievements
