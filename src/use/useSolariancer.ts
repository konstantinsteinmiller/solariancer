import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { SolariancerState, UpgradeDef, UpgradeId } from '@/types/Solariancer'
import { saveDataVersion } from '@/use/useSaveStatus'
// Battle Pass XP hooks. Static import — both modules form a cycle
// (useBattlePass -> useSolariancer for the claim payout), but neither calls
// the other's bindings during module-init, so the hoisted bindings are
// defined by the time gameplay actually fires them.
import {
  awardStageAdvance as bpAwardStageAdvance,
  awardCombo as bpAwardCombo,
  BP_COMBO_THRESHOLD
} from '@/use/useBattlePass'
import { loadSection, saveSection } from '@/utils/save/solStore'

// ─── Combo tuning ──────────────────────────────────────────────────────────
const COMBO_WINDOW = 5            // s — max gap between ripe feeds to keep the chain
const COMBO_BUFF_DURATION = 10    // s — multiplier remains active for this long
const COMBO_THRESHOLD_2X = 3      // chained feeds → ×2
const COMBO_THRESHOLD_3X = 5      // chained feeds → ×3

// ─── Stage tuning ──────────────────────────────────────────────────────────
//
// Heat goal scales with stage so each stage takes longer. Stage 1 = 1000,
// stage 2 = 1500, stage 7 = 4000.
export const stageHeatGoal = (stage: number) => 500 + 500 * stage

// Names of the visible stage themes — cycles through these. Index = (stage - 1) % length.
// English fallbacks; localised display names live in the i18n locale files
// under `game.stageType.<id>`. STAGE_TYPE_IDS is the parallel id list that
// drives those lookups.
export const STAGE_TYPES = [
  'G-Type',         // yellow-white sun
  'K-Type',         // orange dwarf
  'M-Type',         // red dwarf
  'Red Giant',      // bloated red
  'Blue Dwarf',     // hot blue (mapped to neutron palette)
  'White Dwarf',    // bright white-blue
  'Brown Dwarf',    // failed star
  'Neutron'         // ultra-dense
] as const
export const STAGE_TYPE_IDS = [
  'gType', 'kType', 'mType', 'redGiant',
  'blueDwarf', 'whiteDwarf', 'brownDwarf', 'neutron'
] as const

// Resolve the active locale's translation for a star-class. Used by the
// stage-advance popup which fires from outside Vue setup() — components
// call t() directly, the popup reads window.__i18n. Falls back to the
// English STAGE_TYPES entry when i18n isn't ready / key is missing.
export const stageTypeNameLocalised = (tier: number): string => {
  const safeTier = Math.max(0, Math.min(STAGE_TYPES.length - 1, tier))
  const id = STAGE_TYPE_IDS[safeTier]
  const fallback = STAGE_TYPES[safeTier] ?? STAGE_TYPES[0]
  const tt = (window as any).__i18n?.global?.t
  if (typeof tt !== 'function') return fallback
  try {
    const key = `game.stageType.${id}`
    const v = tt(key)
    if (typeof v !== 'string' || v.length === 0 || v === key) return fallback
    return v
  } catch {
    return fallback
  }
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'singularityCore', baseCost: 60, costGrowth: 1.55, maxLevel: 12, effectPerLevel: 0.20 },
  // Fusion is open-ended — no max level. The multiplier scales infinitely
  // but each successive 15-level bracket adds a quarter (then an eighth) of
  // the previous bracket's per-level value. effectPerLevel here is the BASE
  // tier value (0.05 = +5%/lvl for levels 1-15); use fusionCumulativeBonus()
  // to compute the actual multiplier.
  { id: 'fusionStabilizer', baseCost: 90, costGrowth: 1.50, maxLevel: Infinity, effectPerLevel: 0.05 },
  { id: 'attractionRadius', baseCost: 140, costGrowth: 1.55, maxLevel: 10, effectPerLevel: 0.20 },
  // Stabilizer Probe — slow tether-stations that catch passing asteroids and
  // launch them into the Sun once ripe. +1 station per level.
  { id: 'automationProbe', baseCost: 250, costGrowth: 1.85, maxLevel: 5, effectPerLevel: 1.00 },
  // Zone Expansion — widens the Heat Zone annulus around the Sun
  { id: 'heatShield', baseCost: 180, costGrowth: 1.55, maxLevel: 10, effectPerLevel: 0.20 },
  // Mass Magnet — asteroids snap into nearby planets instead of cluttering
  { id: 'orbitalCapacity', baseCost: 320, costGrowth: 1.85, maxLevel: 6, effectPerLevel: 1.00 },
  // Surface Tension — extra bounces before the Sun consumes a body
  { id: 'surfaceTension', baseCost: 220, costGrowth: 1.95, maxLevel: 4, effectPerLevel: 1.00 },
  // Cosmic Forge — paid in STAR MATTER. +25% to all heat earnings per level.
  // Sacrifice unripe bodies to the black hole for matter, spend it here for
  // a permanent global heat multiplier.
  { id: 'cosmicForge', baseCost: 3, costGrowth: 1.85, maxLevel: 5, effectPerLevel: 0.25, currency: 'starMatter' },
  // Big Probe Station — high-tier rope drone. Costs Star Matter AND a
  // sizable chunk of Heat per level. Max 2 stations. Catches mid-size
  // bodies (asteroid / rocky / ice / jewel — anything with mass ≤ 50).
  {
    id: 'bigProbeStation',
    baseCost: 200, costGrowth: 2.0, maxLevel: 2, effectPerLevel: 1.0,
    currency: 'starMatter',
    heatCostBase: 50_000, heatCostGrowth: 2.0
  }
]

const defaultState = (): SolariancerState => ({
  heat: 0,
  starMatter: 0,
  totalHeatEarned: 0,
  bestSession: 0,
  upgrades: {
    singularityCore: 0,
    fusionStabilizer: 0,
    automationProbe: 0,
    heatShield: 0,
    orbitalCapacity: 0,
    attractionRadius: 0,
    surfaceTension: 0,
    cosmicForge: 0,
    bigProbeStation: 0
  },
  achievements: [],
  tutorialSeen: false,
  tutorialAdvancedSeen: false,
  streak: { days: 0, lastDateISO: null },
  totalRipeFeeds: 0,
  totalCometsCaught: 0,
  totalBlackHolesSurvived: 0,
  bestComboChain: 0,
  highestStage: 1,
  totalMissionsCompleted: 0,
  solarClass: 0,
  lifetimeHeatAtReset: 0,
  firstComboCelebrated: false,
  stage: 1,
  stageProgress: 0,
  preferences: {
    showSessionBadge: false,
    selectedSunSkin: -1,           // -1 = auto-cycle with stage
    unlockedSunSkin: 0,            // G-Type unlocked from the start
    trailPalette: 'auto',
    unlockedTrails: ['auto']
  }
})

const loadState = (): SolariancerState => {
  return loadSection('keeper', defaultState(), (raw) => {
    const parsed = (raw && typeof raw === 'object' ? raw : {}) as Partial<SolariancerState>
    const fallback = defaultState()
    return {
      ...fallback,
      ...parsed,
      upgrades: { ...fallback.upgrades, ...(parsed.upgrades ?? {}) },
      streak: { ...fallback.streak, ...(parsed.streak ?? {}) },
      preferences: { ...fallback.preferences, ...(parsed.preferences ?? {}) }
    }
  })
}

// Singleton state
const state: Ref<SolariancerState> = ref(loadState())

// If a cloud strategy hydrates after this module already loaded (offline
// at boot, back online later) the localStorage gets fresh values but
// `state` still holds the pre-hydrate copy. Re-read on the version bump
// so the player's in-memory state catches up to what's now on disk.
watch(saveDataVersion, () => {
  state.value = loadState()
})
const sessionHeat: Ref<number> = ref(0)
const isUpgradeModalOpen: Ref<boolean> = ref(false)
const isOptionsOpen: Ref<boolean> = ref(false)
const lastEarnedSplash: Ref<{ amount: number; at: number } | null> = ref(null)
// Ripe-feed count for the CURRENT stage. Resets on stage advance. Drives
// the stage-1 spawn pool unlock — once the player has actually fed three
// ripe asteroids, the spawner adds the next size up (rocky) so the heat
// curve picks up. Session-only on purpose: a refresh resets it, which
// re-engages the auto-cook intro for asteroid-only spawns.
const ripeFeedsThisStage: Ref<number> = ref(0)

// ─── Mission temp buffs (session-only) ─────────────────────────────────────
// Heat multiplier from a Mission reward. Active when performance.now() < tempHeatMultUntil.
const tempHeatMult = ref(1)
const tempHeatMultUntil = ref(0)
const missionHeatMultiplier = computed(() =>
  performance.now() < tempHeatMultUntil.value ? tempHeatMult.value : 1
)
const missionHeatMultActive = computed(() => missionHeatMultiplier.value > 1)
const missionHeatMultTimeLeft = computed(() =>
  Math.max(0, (tempHeatMultUntil.value - performance.now()) / 1000)
)
const activateHeatMult = (mult: number, durationSec: number) => {
  tempHeatMult.value = mult
  tempHeatMultUntil.value = performance.now() + durationSec * 1000
}

// ─── Combo state (session-only) ────────────────────────────────────────────
const comboCount = ref(0)
const comboLastFeedAt = ref(0)        // performance.now() of last ripe feed
const comboBuffUntil = ref(0)         // performance.now() when current multiplier expires
const comboPeak = ref(0)              // best chain reached this session
const comboMultiplier = computed(() => {
  if (performance.now() > comboBuffUntil.value) return 1
  if (comboCount.value >= COMBO_THRESHOLD_3X) return 3
  if (comboCount.value >= COMBO_THRESHOLD_2X) return 2
  return 1
})
const comboActive = computed(() => comboMultiplier.value > 1)
const comboTimeLeft = computed(() => Math.max(0, (comboBuffUntil.value - performance.now()) / 1000))

// ─── Sun skin tier ─────────────────────────────────────────────────────────
//
// Stage cycles through the palettes by default — index = (stage − 1) % 8.
// The player can pin a specific palette via Options (`selectedSunSkin`),
// in which case the override wins. Reaching a new stage's palette also
// unlocks it for selection.
const autoSunSkinTier = computed(() => (state.value.stage - 1) % STAGE_TYPES.length)
const sunSkinTier = computed(() => {
  const override = state.value.preferences.selectedSunSkin
  if (override >= 0 && override < STAGE_TYPES.length) return override
  return autoSunSkinTier.value
})
const stageTypeName = computed(() => STAGE_TYPES[sunSkinTier.value] ?? STAGE_TYPES[0])
const stageProgressFraction = computed(() =>
  Math.max(0, Math.min(1, state.value.stageProgress / stageHeatGoal(state.value.stage)))
)
const currentStageGoal = computed(() => stageHeatGoal(state.value.stage))
const stageJustAdvancedAt = ref(0)  // timestamp — components watch this for celebration FX

const saveState = () => {
  saveSection('keeper', state.value)
}

const upgradeEffect = (id: UpgradeId): number => {
  const def = UPGRADES.find(u => u.id === id)
  return def ? def.effectPerLevel : 0
}

// Singularity creation buffer — RADIUS-PROPORTIONAL. Each body's no-go zone
// extends to `radius × multiplier`, so a tiny asteroid has a tiny safe-zone
// and a gas giant has a huge one. Each Singularity Core level tightens the
// multiplier — endgame players get finer control over big planets.
//
// Values are intentionally tight (≈ half the legacy 2.5/1.3/0.1 set). The
// previous buffer made it feel impossible to place a singularity near any
// planet, especially on phones — players couldn't pull a body into the Sun
// because every spot near it was rejected. The new defaults keep a small
// safety buffer beyond the surface but let the player work close in.
const NO_GO_BASE = 1.25
const NO_GO_MIN = 0.65
const NO_GO_PER_LEVEL = 0.05
const noGoMultiplier = computed(() => {
  // Stage-1 onboarding: let the player drop the singularity right at the
  // edge of any body so they can actually feel the "pick up and drag into
  // the Sun" loop without the buffer fighting them. We use 1.0 (== body
  // radius) so the tap is rejected only when it lands *inside* a body —
  // that's still nice safety against accidentally placing a singularity
  // dead-centre on a giant.
  if (state.value.stage === 1) return 1.0
  return Math.max(NO_GO_MIN, NO_GO_BASE - state.value.upgrades.singularityCore * NO_GO_PER_LEVEL)
})

// ─── Onboarding helpers ────────────────────────────────────────────────────
//
// All scoped to stage 1, all keyed off `totalHeatEarned` so they melt away
// invisibly as the player gains traction. Read by the renderer (preview /
// arrow), the physics tick (slow-time, no-fail), and the SolariancerGame UI
// (idle hint, deferred upgrade pulse).

/** Stage-1 simulation-speed multiplier. 0.6 below 200 heat, lerps back to
 *  1.0 by 500. Outside stage 1 (or above 500 heat in stage 1) the value is
 *  exactly 1.0 so it has zero effect on real play. */
const SIM_SLOW_FLOOR = 0.6
const SIM_SLOW_BELOW = 200
const SIM_SLOW_RAMP_UNTIL = 500
const simSpeedMultiplier = computed(() => {
  if (state.value.stage !== 1) return 1
  const h = state.value.totalHeatEarned
  if (h >= SIM_SLOW_RAMP_UNTIL) return 1
  if (h <= SIM_SLOW_BELOW) return SIM_SLOW_FLOOR
  const t = (h - SIM_SLOW_BELOW) / (SIM_SLOW_RAMP_UNTIL - SIM_SLOW_BELOW)
  return SIM_SLOW_FLOOR + (1 - SIM_SLOW_FLOOR) * t
})

/** True while the no-fail respawn rule is in force. Stage 1 IS the
 *  onboarding sandbox — once the player advances to stage 2 the game
 *  starts judging them. Until then, no body that flies off-screen or
 *  belly-flops into the sun raw counts against the player. */
const stage1NoFailActive = computed(() => state.value.stage === 1)

/** True while the singularity preview ring + first-body arrow + auto-cook
 *  asteroid spawns should be active. Covers ALL of stage 1 — the previous
 *  `stageProgress < 200` cutoff was arbitrary and had a fault zone
 *  (200 ≤ heat < ~300) where new spawns reverted to the default sun-aimed
 *  trajectory and crashed. Stage advance to 2 is the only "graduated"
 *  signal we trust. */
const stage1HintsActive = computed(() => state.value.stage === 1)

/** True while the upgrade-button bounce should be suppressed (player has
 *  not yet completed the loop once, so the menu is meaningless to them). */
const upgradeHintAllowed = computed(() => state.value.totalRipeFeeds >= 1)

// First-combo celebration — drives a one-shot brief slow-mo + oversized
// COMBO popup the very first time the chain crosses BP_COMBO_THRESHOLD.
// `slowMoUntil` is a performance.now() timestamp; the renderer reads it
// to decide whether to apply the brief slow-mo on top of simSpeed.
const slowMoUntil = ref(0)
const lastRipeFeedAt = ref(0)

// ─── Fusion Stabilizer staircase ────────────────────────────────────────────
// Tier 0 (lvl 1-15):  0.05/lvl  (= base "effectPerLevel")
// Tier 1 (lvl 16-30): 0.0125/lvl (1/4 of base — slows first)
// Tier 2 (lvl 31+):   0.00625/lvl (1/8 of base — final cap)
const FUSION_TIER_VALUES = [0.05, 0.0125, 0.00625] as const
const FUSION_TIER_SIZE = 15
export const fusionCumulativeBonus = (level: number): number => {
  let bonus = 0
  let remaining = Math.max(0, level)
  let tier = 0
  while (remaining > 0) {
    const take = Math.min(remaining, FUSION_TIER_SIZE)
    const tierValue = FUSION_TIER_VALUES[Math.min(tier, FUSION_TIER_VALUES.length - 1)]!
    bonus += take * tierValue
    remaining -= take
    tier += 1
  }
  return bonus
}
// Per-level addition AT a given level (the value of buying level N from N-1).
// Used by the upgrade modal so the player can see exactly what their next
// purchase will add.
export const fusionEffectAtLevel = (level: number): number => {
  const tier = Math.min(Math.floor(Math.max(0, level) / FUSION_TIER_SIZE), FUSION_TIER_VALUES.length - 1)
  return FUSION_TIER_VALUES[tier]!
}

// Derived effects
const singularityPower = computed(() => 1 + state.value.upgrades.singularityCore * upgradeEffect('singularityCore'))
const fusionMultiplier = computed(() => 1 + fusionCumulativeBonus(state.value.upgrades.fusionStabilizer))
const attractionRadius = computed(() => 1 + state.value.upgrades.attractionRadius * upgradeEffect('attractionRadius'))
const probeCount = computed(() => (state.value.upgrades.automationProbe * upgradeEffect('automationProbe')) | 0)
// Big Probe Station — high-tier rope drone count, max 2.
const bigProbeCount = computed(() => state.value.upgrades.bigProbeStation | 0)
// Zone Expansion — multiplier on Heat Zone width (1 = base ring; +20% per level).
//
// Stage-1 onboarding: pin the bonus to the max level (≈3× width) so the
// ring is huge while the player is learning, then revert to whatever
// `heatShield` upgrades they actually own from stage 2 onward. This makes
// it nearly impossible to *miss* the heat zone with an asteroid in the
// first stage — they cook even on sloppy throws — without permanently
// trivialising the upgrade later.
const HEAT_SHIELD_DEF = UPGRADES.find(u => u.id === 'heatShield')!
const HEAT_ZONE_MAX_BONUS = 1 + HEAT_SHIELD_DEF.maxLevel * HEAT_SHIELD_DEF.effectPerLevel
const heatZoneWidthBonus = computed(() => {
  if (state.value.stage === 1) return HEAT_ZONE_MAX_BONUS
  return 1 + state.value.upgrades.heatShield * upgradeEffect('heatShield')
})
// Mass Magnet — integer level used as range/strength multiplier for asteroid snap-merge
const massMagnetLevel = computed(() => (state.value.upgrades.orbitalCapacity * upgradeEffect('orbitalCapacity')) | 0)
// Surface Tension — number of free bounces a body gets off the Sun before being consumed
const surfaceTensionBounces = computed(() => (state.value.upgrades.surfaceTension * upgradeEffect('surfaceTension')) | 0)
// Cosmic Forge — global heat multiplier earned with star matter. Multiplies INTO existing fusion.
const cosmicForgeMultiplier = computed(() => 1 + state.value.upgrades.cosmicForge * upgradeEffect('cosmicForge'))

// ─── Supernova / Solar Class prestige ──────────────────────────────────────
// Each Supernova adds +5% to every heat earning, FOREVER. The threshold to
// prestige doubles each time (1M, 2M, 4M, 8M lifetime heat earned since the
// previous reset). Player keeps Solar Class, Star Matter, lifetime stats.
const SUPERNOVA_BASE_THRESHOLD = 1_000_000
const supernovaThreshold = computed(() => SUPERNOVA_BASE_THRESHOLD * Math.pow(2, state.value.solarClass))
const canSupernova = computed(() => state.value.totalHeatEarned >= supernovaThreshold.value)
const solarClassMultiplier = computed(() => 1 + state.value.solarClass * 0.05)

const supernova = (): boolean => {
  if (!canSupernova.value) return false
  const sc = state.value.solarClass + 1
  state.value = {
    ...state.value,
    heat: 0,
    stage: 1,
    stageProgress: 0,
    upgrades: {
      singularityCore: 0,
      fusionStabilizer: 0,
      automationProbe: 0,
      heatShield: 0,
      orbitalCapacity: 0,
      attractionRadius: 0,
      surfaceTension: 0,
      cosmicForge: 0
    },
    solarClass: sc,
    lifetimeHeatAtReset: state.value.lifetimeHeatAtReset + state.value.totalHeatEarned,
    totalHeatEarned: 0
  }
  saveState()
  return true
}

const upgradeCost = (id: UpgradeId): number => {
  const def = UPGRADES.find(u => u.id === id)!
  const lvl = state.value.upgrades[id]
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, lvl))
}

// Secondary heat cost — only set on hybrid upgrades like Big Probe Station.
// Returns 0 for normal single-currency upgrades.
const upgradeSecondaryHeat = (id: UpgradeId): number => {
  const def = UPGRADES.find(u => u.id === id)!
  if (!def.heatCostBase) return 0
  const lvl = state.value.upgrades[id]
  return Math.ceil(def.heatCostBase * Math.pow(def.heatCostGrowth ?? 1, lvl))
}

const isUpgradeMaxed = (id: UpgradeId): boolean => {
  const def = UPGRADES.find(u => u.id === id)!
  if (!isFinite(def.maxLevel)) return false  // open-ended upgrade (Fusion)
  return state.value.upgrades[id] >= def.maxLevel
}

const upgradeCurrency = (id: UpgradeId): 'heat' | 'starMatter' => {
  const def = UPGRADES.find(u => u.id === id)!
  return def.currency ?? 'heat'
}

const canAffordUpgrade = (id: UpgradeId): boolean => {
  if (isUpgradeMaxed(id)) return false
  const cost = upgradeCost(id)
  const heat2 = upgradeSecondaryHeat(id)
  const balance = upgradeCurrency(id) === 'starMatter' ? state.value.starMatter : state.value.heat
  if (balance < cost) return false
  // Secondary heat gate — applies even when primary currency is starMatter.
  if (heat2 > 0 && state.value.heat < heat2) return false
  return true
}

const buyUpgrade = (id: UpgradeId): boolean => {
  if (!canAffordUpgrade(id)) return false
  const cost = upgradeCost(id)
  const heat2 = upgradeSecondaryHeat(id)
  const next = {
    ...state.value,
    upgrades: { ...state.value.upgrades, [id]: state.value.upgrades[id] + 1 }
  }
  if (upgradeCurrency(id) === 'starMatter') {
    next.starMatter = state.value.starMatter - cost
    if (heat2 > 0) next.heat = state.value.heat - heat2
  } else {
    next.heat = state.value.heat - cost
  }
  state.value = next
  saveState()
  return true
}

const addHeat = (amount: number) => {
  if (amount <= 0) return
  // Mission "heat boost" reward applies a multiplier here so every earning
  // path benefits without each callsite needing to know.
  amount *= missionHeatMultiplier.value
  // Solar Class — permanent prestige multiplier (+5% per rank)
  amount *= solarClassMultiplier.value
  state.value.heat += amount
  state.value.totalHeatEarned += amount
  state.value.stageProgress += amount
  sessionHeat.value += amount
  if (sessionHeat.value > state.value.bestSession) {
    state.value.bestSession = sessionHeat.value
  }
  // Stage advance — goal scales with stage so a single big payout can clear
  // multiple stages at once (rare, but handle the cascade safely).
  let goal = stageHeatGoal(state.value.stage)
  while (state.value.stageProgress >= goal) {
    state.value.stageProgress -= goal
    state.value.stage += 1
    // Reset the per-stage ripe-feed count so the stage-1-style "three
    // ripe feeds → unlock next-bigger body" pattern can apply per stage
    // if we ever want it on later stages too.
    ripeFeedsThisStage.value = 0
    if (state.value.stage > state.value.highestStage) {
      state.value.highestStage = state.value.stage
    }
    stageJustAdvancedAt.value = performance.now()
    // Unlock the palette that this stage cycles into (if higher than the current cap)
    const newTier = (state.value.stage - 1) % STAGE_TYPES.length
    if (newTier > state.value.preferences.unlockedSunSkin) {
      state.value.preferences.unlockedSunSkin = newTier
    }
    // Battle Pass: each game-stage advance pays into the BP track. The
    // cascade can fire multiple times in one heat payout, and the BP
    // earns one award per advance — that's by design ("every 2 stages
    // = +1 BP level" → 50 xp per game stage).
    bpAwardStageAdvance()
    saveState()
    goal = stageHeatGoal(state.value.stage)
  }
  // throttle saves: every ~64 units
  if (Math.random() < 0.04) saveState()
}

const addStarMatter = (amount: number) => {
  if (amount <= 0) return
  state.value.starMatter += amount
  saveState()
}

const resetSession = () => {
  sessionHeat.value = 0
}

const fullReset = () => {
  state.value = defaultState()
  sessionHeat.value = 0
  saveState()
}

const flushSave = () => saveState()

const setPreference = <K extends keyof SolariancerState['preferences']>(
  key: K,
  value: SolariancerState['preferences'][K]
) => {
  state.value = {
    ...state.value,
    preferences: { ...state.value.preferences, [key]: value }
  }
  saveState()
}

// ─── Streak ────────────────────────────────────────────────────────────────
//
// A daily streak that increments at most once per local-calendar day, only
// when the player actually feeds a ripe body (commits the loop). Yesterday's
// session keeps the streak; older breaks it.

const todayISO = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const dayDiff = (aISO: string, bISO: string): number => {
  const a = new Date(aISO + 'T00:00:00')
  const b = new Date(bISO + 'T00:00:00')
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

const evaluateStreakOnLoad = () => {
  const last = state.value.streak.lastDateISO
  if (!last) return
  const gap = dayDiff(todayISO(), last)
  // gap === 0  → same day; keep
  // gap === 1  → yesterday; keep until next ripe feed bumps the day
  // gap >= 2   → broken
  if (gap >= 2) {
    state.value.streak = { days: 0, lastDateISO: null }
    saveState()
  }
}

evaluateStreakOnLoad()

const tickStreakOnRipeFeed = () => {
  const today = todayISO()
  const last = state.value.streak.lastDateISO
  if (last === today) return // already ticked today
  const wasYesterdayOrFresh = !last || dayDiff(today, last) === 1
  state.value.streak = {
    days: wasYesterdayOrFresh ? state.value.streak.days + 1 : 1,
    lastDateISO: today
  }
  saveState()
}

// ─── Ripe-feed registration ────────────────────────────────────────────────
//
// Physics calls this whenever a ripe body is consumed by the sun. It updates
// combo, streak, and stats in one place so the loop logic doesn't drift.

const registerRipeFeed = (): { combo: number; multiplier: number; rolledThreshold: number | null } => {
  const now = performance.now()
  const withinWindow = (now - comboLastFeedAt.value) / 1000 < COMBO_WINDOW
  const prevMult = comboMultiplier.value
  const prevCombo = comboCount.value
  if (withinWindow) comboCount.value += 1
  else comboCount.value = 1
  comboLastFeedAt.value = now
  // Battle Pass: pay one combo award the moment the chain crosses the
  // 3-body threshold. Higher tiers (5, 7, ...) don't pay extra here —
  // their value is the heat multiplier itself.
  if (prevCombo < BP_COMBO_THRESHOLD && comboCount.value >= BP_COMBO_THRESHOLD) {
    bpAwardCombo()
  }
  if (comboCount.value > comboPeak.value) comboPeak.value = comboCount.value
  if (comboCount.value > state.value.bestComboChain) {
    state.value.bestComboChain = comboCount.value
  }
  // Refresh the buff window so the player has time to spend it
  comboBuffUntil.value = now + COMBO_BUFF_DURATION * 1000

  state.value.totalRipeFeeds += 1
  ripeFeedsThisStage.value += 1
  lastRipeFeedAt.value = now
  // First-combo onboarding hit — when the chain crosses the 3-body
  // threshold for the very first time in this player's lifetime, queue a
  // ~600ms slow-mo on top of any active stage-1 slow-time. The renderer
  // sees `slowMoUntil > now` and dilates dt accordingly; the popup is
  // emitted by physicsStep where the ripe-feed itself happens (so it
  // appears at the body's position, not at a fixed coord).
  if (
    !state.value.firstComboCelebrated
    && prevCombo < BP_COMBO_THRESHOLD
    && comboCount.value >= BP_COMBO_THRESHOLD
  ) {
    state.value.firstComboCelebrated = true
    slowMoUntil.value = now + 600
  }
  // Trail palette unlocks tied to ripe-feed milestones — pure cosmetic flex
  if (state.value.totalRipeFeeds >= 50) ensureTrailUnlocked('rainbow')
  if (state.value.totalRipeFeeds >= 200) ensureTrailUnlocked('aurora')
  tickStreakOnRipeFeed()

  // Did we just cross a multiplier threshold? Used by the renderer/HUD to flash.
  const newMult = comboMultiplier.value
  const rolledThreshold = newMult > prevMult ? newMult : null

  return { combo: comboCount.value, multiplier: newMult, rolledThreshold }
}

const ensureTrailUnlocked = (id: string) => {
  if (!state.value.preferences.unlockedTrails.includes(id)) {
    state.value.preferences.unlockedTrails = [...state.value.preferences.unlockedTrails, id]
    saveState()
  }
}

const registerCometCaught = () => {
  state.value.totalCometsCaught += 1
  if (state.value.totalCometsCaught >= 25) ensureTrailUnlocked('ember')
  saveState()
}

const registerBlackHoleSurvived = () => {
  state.value.totalBlackHolesSurvived += 1
  if (state.value.totalBlackHolesSurvived >= 5) ensureTrailUnlocked('plasma')
  saveState()
}

const registerMissionCompleted = () => {
  state.value.totalMissionsCompleted += 1
  saveState()
}

const markTutorialSeen = () => {
  if (state.value.tutorialSeen) return
  state.value.tutorialSeen = true
  saveState()
}

const resetTutorialSeen = () => {
  state.value.tutorialSeen = false
  state.value.tutorialAdvancedSeen = false
  saveState()
}

const markTutorialAdvancedSeen = () => {
  if (state.value.tutorialAdvancedSeen) return
  state.value.tutorialAdvancedSeen = true
  saveState()
}

export default function useSolariancer() {
  return {
    state,
    sessionHeat,
    isUpgradeModalOpen,
    isOptionsOpen,
    lastEarnedSplash,
    UPGRADES,
    singularityPower,
    fusionMultiplier,
    attractionRadius,
    probeCount,
    bigProbeCount,
    heatZoneWidthBonus,
    massMagnetLevel,
    surfaceTensionBounces,
    cosmicForgeMultiplier,
    upgradeCurrency,
    noGoMultiplier,
    upgradeCost,
    upgradeSecondaryHeat,
    isUpgradeMaxed,
    canAffordUpgrade,
    buyUpgrade,
    addHeat,
    addStarMatter,
    resetSession,
    fullReset,
    flushSave,
    setPreference,
    markTutorialSeen,
    markTutorialAdvancedSeen,
    resetTutorialSeen,
    // Combo
    comboCount,
    comboMultiplier,
    comboActive,
    comboTimeLeft,
    comboPeak,
    comboBuffUntil,
    // Mission buffs
    missionHeatMultiplier,
    missionHeatMultActive,
    missionHeatMultTimeLeft,
    activateHeatMult,
    // Supernova / Solar Class
    canSupernova,
    supernovaThreshold,
    solarClassMultiplier,
    supernova,
    // Cosmetic / stats
    sunSkinTier,
    stageTypeName,
    stageProgressFraction,
    stageJustAdvancedAt,
    currentStageGoal,
    // Loop event hooks
    registerRipeFeed,
    registerCometCaught,
    registerBlackHoleSurvived,
    registerMissionCompleted,
    // Onboarding (stage-1 helpers)
    simSpeedMultiplier,
    stage1NoFailActive,
    stage1HintsActive,
    upgradeHintAllowed,
    slowMoUntil,
    lastRipeFeedAt,
    ripeFeedsThisStage
  }
}
