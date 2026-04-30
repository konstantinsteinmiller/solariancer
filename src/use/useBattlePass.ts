import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import useSolariancer from '@/use/useSolariancer'
import { loadSection, saveSection } from '@/utils/save/solStore'
import { saveDataVersion } from '@/use/useSaveStatus'

/**
 * Solariancer Battle Pass — 100 stages, 100 xp per stage.
 *
 * XP sources (all routed through `awardStageAdvance` / `awardCombo`):
 *   • Game stage advance         → +50 xp (half a BP stage; two game-stages
 *                                  per BP stage, matching the design "every
 *                                  2 stages = +1 BP level")
 *   • 3+ body combo crossing     → +5 xp per qualifying ripe-feed
 *
 * Rewards alternate between Heat (the "coins" track — most stages) and
 * Star Matter (the rarer "showcase" track — every 10 stages). Both pay
 * straight into `useSolariancer` on claim, so the player sees the heat /
 * matter bar tick up in the HUD the moment they tap Claim.
 *
 * Persisted to localStorage. The previous chaos-arena schema (skin offers,
 * season expiry tied to honor track) has been stripped — Solariancer has
 * no skin economy and no PvP honor track.
 */

// ─── Tunables ───────────────────────────────────────────────────────────────

export const BP_TOTAL_STAGES = 100
export const BP_XP_PER_STAGE = 100
/** Battle pass season length in days. After this, all progress resets. */
export const BP_SEASON_DAYS = 30

/** XP from advancing one game-stage. Two game-stages = +1 BP level. */
export const BP_XP_PER_GAME_STAGE = 50
/** XP per ripe feed once the combo chain reaches 3 (every additional ripe at ≥3 also pays). */
export const BP_XP_PER_COMBO = 5
/** Combo length that starts paying out. */
export const BP_COMBO_THRESHOLD = 3

/** 1-based stage indices that grant a Star Matter chunk instead of Heat.
 *  Spaced every 10 levels — same cadence the legacy "skin every 10" used,
 *  reframed as the rarer prestige currency. */
export const BP_MATTER_STAGES = new Set<number>([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])

// ─── State ──────────────────────────────────────────────────────────────────

interface BattlePassState {
  /** XP banked into the currently-filling stage (0 .. BP_XP_PER_STAGE). */
  xp: number
  /** Number of stages that have fully completed. */
  unlockedStages: number
  /** 1-based stage indices the player has already collected. */
  claimedStages: number[]
  /** ISO date string when the current season started (first XP gain). */
  seasonStartedAt: string | null
}

const defaultState = (): BattlePassState => ({
  xp: 0,
  unlockedStages: 0,
  claimedStages: [],
  seasonStartedAt: null
})

const daysUntilSeasonReset = (startedAt: string | null): number | null => {
  if (!startedAt) return null
  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const remaining = BP_SEASON_DAYS - elapsed
  return remaining > 0 ? remaining : 0
}

const isSeasonExpired = (startedAt: string | null): boolean => {
  if (!startedAt) return false
  return daysUntilSeasonReset(startedAt) === 0
}

const loadState = (): BattlePassState => {
  return loadSection('battlePass', defaultState(), (raw) => {
    const parsed = raw as any
    if (
      typeof parsed?.xp !== 'number' ||
      typeof parsed?.unlockedStages !== 'number' ||
      !Array.isArray(parsed?.claimedStages)
    ) {
      return defaultState()
    }
    const loaded: BattlePassState = {
      xp: parsed.xp,
      unlockedStages: Math.max(0, Math.min(BP_TOTAL_STAGES, parsed.unlockedStages)),
      claimedStages: parsed.claimedStages.filter(
        (n: unknown) => typeof n === 'number' && n >= 1 && n <= BP_TOTAL_STAGES
      ),
      seasonStartedAt: parsed.seasonStartedAt ?? null
    }
    if (isSeasonExpired(loaded.seasonStartedAt)) return defaultState()
    return loaded
  })
}

const state: Ref<BattlePassState> = ref(loadState())

// Pick up late cloud-hydrated values — same pattern as useSolariancer.
watch(saveDataVersion, () => {
  state.value = loadState()
})

const saveState = () => {
  saveSection('battlePass', state.value)
}

// ─── Reward Table ───────────────────────────────────────────────────────────

/**
 * Heat reward for a given stage — piecewise linear so the early stages
 * feel meaningful at low cumulative-heat scales, and the late stages
 * still matter to a player sitting on millions. Rounded to the nearest
 * 10 for tidy UI numbers.
 *   stages 1..50:   200  → 5_000
 *   stages 50..100: 5_000 → 25_000
 */
export const bpHeatReward = (stage: number): number => {
  const clamped = Math.max(1, Math.min(BP_TOTAL_STAGES, stage))
  const raw = clamped <= 50
    ? 200 + ((clamped - 1) * (5_000 - 200)) / 49
    : 5_000 + ((clamped - 50) * (25_000 - 5_000)) / 50
  return Math.round(raw / 10) * 10
}

/**
 * Star Matter reward for the prestige stages. Linear ramp 2 → 10 across
 * the 10 matter stages so a full season pays ~60 matter — meaningful but
 * not a substitute for the Cosmic Forge / Big Probe Station grind from
 * normal play.
 */
export const bpMatterReward = (stage: number): number => {
  if (!BP_MATTER_STAGES.has(stage)) return 0
  const idx = [...BP_MATTER_STAGES].sort((a, b) => a - b).indexOf(stage)
  return 2 + idx
}

export const bpIsMatterStage = (stage: number): boolean => BP_MATTER_STAGES.has(stage)

// ─── XP accrual ─────────────────────────────────────────────────────────────

const addXp = (amount: number) => {
  if (amount <= 0) return
  if (isSeasonExpired(state.value.seasonStartedAt)) {
    state.value = defaultState()
    saveState()
  }
  if (state.value.unlockedStages >= BP_TOTAL_STAGES) return
  if (!state.value.seasonStartedAt) {
    state.value.seasonStartedAt = new Date().toISOString().slice(0, 10)
  }
  state.value.xp += amount
  while (
    state.value.xp >= BP_XP_PER_STAGE &&
    state.value.unlockedStages < BP_TOTAL_STAGES
    ) {
    state.value.xp -= BP_XP_PER_STAGE
    state.value.unlockedStages++
  }
  if (state.value.unlockedStages >= BP_TOTAL_STAGES) state.value.xp = 0
  saveState()
}

/** XP for advancing one game stage. Called from useSolariancer.addHeat
 *  every time the heat-bar cascade rolls the stage counter up. */
export const awardStageAdvance = () => addXp(BP_XP_PER_GAME_STAGE)

/** XP for a ripe-feed that lands while the combo chain is at or above
 *  BP_COMBO_THRESHOLD. Called from useSolariancer.registerRipeFeed. */
export const awardCombo = () => addXp(BP_XP_PER_COMBO)

// ─── Claim ──────────────────────────────────────────────────────────────────

export interface ClaimResult {
  stage: number
  heat: number
  matter: number
}

const claimStage = (stage: number): ClaimResult | null => {
  if (stage < 1 || stage > BP_TOTAL_STAGES) return null
  if (stage > state.value.unlockedStages) return null
  if (state.value.claimedStages.includes(stage)) return null

  const sk = useSolariancer()
  const heat = bpIsMatterStage(stage) ? 0 : bpHeatReward(stage)
  const matter = bpIsMatterStage(stage) ? bpMatterReward(stage) : 0

  if (heat > 0) sk.addHeat(heat)
  if (matter > 0) sk.addStarMatter(matter)

  state.value.claimedStages = [...state.value.claimedStages, stage]
  saveState()
  return { stage, heat, matter }
}

// ─── Derived ────────────────────────────────────────────────────────────────

const currentXp = computed(() => state.value.xp)
const unlockedStages = computed(() => state.value.unlockedStages)
const claimedStages = computed(() => state.value.claimedStages)
const isMaxed = computed(() => state.value.unlockedStages >= BP_TOTAL_STAGES)

/** Stages unlocked but not yet claimed — drives the "collect me" bounce hint. */
const pendingClaimCount = computed(() => {
  let n = 0
  for (let i = 1; i <= state.value.unlockedStages; i++) {
    if (!state.value.claimedStages.includes(i)) n++
  }
  return n
})

const hasUnclaimedReward = computed(() => pendingClaimCount.value > 0)

const daysUntilReset = computed(() => daysUntilSeasonReset(state.value.seasonStartedAt))

const isStageClaimed = (stage: number): boolean =>
  state.value.claimedStages.includes(stage)

const isStageUnlocked = (stage: number): boolean =>
  stage <= state.value.unlockedStages

// ─── Public API ─────────────────────────────────────────────────────────────

export default function useBattlePass() {
  return {
    // state
    state,
    currentXp,
    unlockedStages,
    claimedStages,
    isMaxed,
    hasUnclaimedReward,
    pendingClaimCount,
    daysUntilReset,
    // queries
    isStageClaimed,
    isStageUnlocked,
    bpHeatReward,
    bpMatterReward,
    bpIsMatterStage,
    // xp events (called by gameplay hooks)
    awardStageAdvance,
    awardCombo,
    // claiming
    claimStage
  }
}
