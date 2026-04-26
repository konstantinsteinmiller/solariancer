import { ref, computed } from 'vue'
import useSolKeeper from '@/use/useSolKeeper'
import { tutorialMode, bodies } from '@/use/useGravityPhysics'

// ─── Mission system ────────────────────────────────────────────────────────
//
// Every ~90 seconds the player gets a 3-minute Mission with a heat goal that
// scales with their progression. Hitting the goal opens a 1-of-3 random
// reward picker. The MissionBadge in the HUD shows time remaining and goal
// progress. Missions never run during the scripted intro tutorial.

const MISSION_DURATION = 180          // seconds — 3 minutes
const MISSION_BREAK = 60              // seconds — cooldown between missions
const MISSION_GOAL_BASE = 350         // heat at stage 1 (early-game friendly)
const MISSION_GOAL_PER_STAGE = 280    // additional heat per stage above 1
// Modest scaling for upgrades so heavy investors still feel challenged.
const MISSION_GOAL_PER_FUSION_LEVEL = 60
const MISSION_GOAL_PER_COSMIC_LEVEL = 250

export interface MissionReward {
  id: 'heat' | 'matter' | 'boost' | 'combo' | 'ripe'
  title: string
  description: string
}

const REWARD_POOL: MissionReward[] = [
  { id: 'heat', title: '+1000 Heat', description: 'Instant heat injection.' },
  { id: 'matter', title: '+5 ✦ Star Matter', description: 'Stack toward Cosmic Forge.' },
  { id: 'boost', title: '×2 Heat for 60s', description: 'Every payout doubled.' },
  { id: 'combo', title: '×3 Combo for 30s', description: 'Skip the chain — straight to ×3.' },
  { id: 'ripe', title: 'Ripen All', description: 'Every body in zone is instantly ripe.' }
]

// ─── State ─────────────────────────────────────────────────────────────────
const missionActive = ref(false)
const missionAchieved = ref(false)
const missionStartedAtMs = ref(0)
const missionGoal = ref(0)
const missionHeatStart = ref(0)
const missionRewards = ref<MissionReward[]>([])
let nextMissionAtMs = performance.now() + MISSION_BREAK * 1000

// missionTimeLeft is a REF (not a computed) because it needs to update
// every frame as `performance.now()` advances — Vue can't track that as a
// reactive dependency. The tick function below writes the new value.
const missionTimeLeft = ref(0)

const missionEarned = computed(() => {
  if (!missionActive.value && !missionAchieved.value) return 0
  const sk = useSolKeeper()
  return Math.max(0, sk.state.value.heat - missionHeatStart.value)
})

const missionProgress = computed(() => {
  if (missionGoal.value <= 0) return 0
  return Math.min(1, missionEarned.value / missionGoal.value)
})

// ─── Goal scaling ──────────────────────────────────────────────────────────
const computeGoal = (): number => {
  const sk = useSolKeeper()
  const stage = sk.state.value.stage
  const fusionLvl = sk.state.value.upgrades.fusionStabilizer ?? 0
  const cosmicLvl = sk.state.value.upgrades.cosmicForge ?? 0
  return Math.round(
    MISSION_GOAL_BASE
    + (stage - 1) * MISSION_GOAL_PER_STAGE
    + fusionLvl * MISSION_GOAL_PER_FUSION_LEVEL
    + cosmicLvl * MISSION_GOAL_PER_COSMIC_LEVEL
  )
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────
const startMission = () => {
  if (missionActive.value || missionAchieved.value) return
  const sk = useSolKeeper()
  missionActive.value = true
  missionAchieved.value = false
  missionStartedAtMs.value = performance.now()
  missionGoal.value = computeGoal()
  missionHeatStart.value = sk.state.value.heat
}

const failMission = () => {
  missionActive.value = false
  missionAchieved.value = false
  nextMissionAtMs = performance.now() + MISSION_BREAK * 1000
}

const succeedMission = () => {
  missionActive.value = false
  missionAchieved.value = true
  // Pick 3 distinct rewards from the pool. Different every time.
  const shuffled = [...REWARD_POOL].sort(() => Math.random() - 0.5)
  missionRewards.value = shuffled.slice(0, 3)
}

const claimReward = (reward: MissionReward) => {
  const sk = useSolKeeper()
  switch (reward.id) {
    case 'heat':
      sk.addHeat(1000)
      break
    case 'matter':
      sk.addStarMatter(5)
      break
    case 'boost':
      sk.activateHeatMult(2, 60)
      break
    case 'combo':
      // Force a strong combo state for 30s — count of 5 yields ×3 multiplier
      sk.comboCount.value = 5
      sk.comboBuffUntil.value = performance.now() + 30 * 1000
      break
    case 'ripe':
      // Mark every body in zone as ripe (cookedSeconds set above the COOK_TIME threshold)
      for (const b of bodies.value) {
        if (b.dead) continue
        if (b.inHeatZone || b.inCloseZone) {
          b.cookedSeconds = Math.max(b.cookedSeconds, 10.5)
          b.fxFlash = 1
        }
      }
      break
  }
  sk.registerMissionCompleted()
  missionAchieved.value = false
  missionRewards.value = []
  nextMissionAtMs = performance.now() + MISSION_BREAK * 1000
}

const tick = (_dt: number) => {
  if (tutorialMode.value) return  // tutorial is sacred — no missions
  const now = performance.now()
  const sk = useSolKeeper()

  if (missionActive.value) {
    const elapsed = (now - missionStartedAtMs.value) / 1000
    missionTimeLeft.value = Math.max(0, MISSION_DURATION - elapsed)
    // Achievement check
    if (sk.state.value.heat - missionHeatStart.value >= missionGoal.value) {
      succeedMission()
      return
    }
    // Timeout
    if (elapsed >= MISSION_DURATION) {
      failMission()
    }
    return
  }

  missionTimeLeft.value = 0

  // Waiting for next mission
  if (!missionAchieved.value && now >= nextMissionAtMs) {
    startMission()
  }
}

const reset = () => {
  missionActive.value = false
  missionAchieved.value = false
  missionRewards.value = []
  nextMissionAtMs = performance.now() + MISSION_BREAK * 1000
}

export default function useSolMission() {
  return {
    missionActive,
    missionAchieved,
    missionGoal,
    missionEarned,
    missionTimeLeft,
    missionProgress,
    missionRewards,
    tick,
    claimReward,
    reset
  }
}
