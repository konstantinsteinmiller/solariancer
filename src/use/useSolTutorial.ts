import { ref, computed } from 'vue'
import type { CelestialBody } from '@/types/solkeeper'
import useGravityPhysics, {
  worldCenterX, worldCenterY,
  singularityActive, tutorialMode,
  COOK_TIME_SECONDS
} from '@/use/useGravityPhysics'
import useSolKeeper from '@/use/useSolKeeper'

// ─── Tutorial pacing ───────────────────────────────────────────────────────
//
// User-paced. Each stage has:
//   - an animation that runs for STAGE_ANIMATION_DURATIONS[stage] seconds
//   - a 2-second minimum read window (STAGE_MIN_READ) during which the
//     "Tap/Click to continue" prompt is suppressed so the player has to
//     actually look at the card
// After the read window, the prompt appears and a tap/click anywhere on the
// overlay advances to the next stage. SKIP is always available.

const STAGE_ANIMATION_DURATIONS = [2.0, 2.0, 1.5, 0.0] as const // seconds
const STAGE_MIN_READ = 2.0                                      // seconds before continue is allowed
const STAGE_COUNT = STAGE_ANIMATION_DURATIONS.length

// Advanced tutorial — read-only narrative, four cards. No physics scripting,
// just teaching the loop's depth (crowd ×3, combo, comet/black-hole rewards).
const ADVANCED_STAGE_COUNT = 4

type TutorialMode = 'intro' | 'advanced'
const mode = ref<TutorialMode>('intro')

const active = ref(false)
const stage = ref(0)
const stageElapsed = ref(0)
const canContinue = computed(() => active.value && stageElapsed.value >= STAGE_MIN_READ)
const totalStageCount = computed(() => mode.value === 'advanced' ? ADVANCED_STAGE_COUNT : STAGE_COUNT)
// Progress bar fills to the read-threshold of the current stage, then sits
// there until the player advances. Reads as a "you can move on now" cue.
const progress = computed(() => {
  if (!active.value) return 0
  const within = Math.min(1, stageElapsed.value / STAGE_MIN_READ)
  return Math.min(1, (stage.value + within) / totalStageCount.value)
})

let tutorialBody: CelestialBody | null = null
let cookTargetX = 0
let cookTargetY = 0
let demoStartX = 0
let demoStartY = 0
let stage2StartX = 0
let stage2StartY = 0
let stage2Anchored = false

const easeOut = (k: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3)
const easeIn = (k: number) => {
  const c = Math.max(0, Math.min(1, k))
  return c * c
}

const ensureGrab = () => {
  const physics = useGravityPhysics()
  if (!tutorialBody || tutorialBody.dead) return
  if (!singularityActive.value) {
    physics.setSingularity(true, tutorialBody.x, tutorialBody.y)
    physics.grabNearestBody(tutorialBody.x, tutorialBody.y)
  }
}

const start = () => {
  if (active.value) return
  const physics = useGravityPhysics()
  const sk = useSolKeeper()

  mode.value = 'intro'
  // Force a clean slate so the demo body is the only thing on screen.
  tutorialMode.value = true
  physics.clearWorld()

  active.value = true
  stage.value = 0
  stageElapsed.value = 0
  stage2Anchored = false

  const cx = worldCenterX.value
  const cy = worldCenterY.value
  const inner = physics.heatZoneInner.value
  const outer = physics.heatZoneOuter.value
  const ringMid = (inner + outer) / 2
  // Park the cooking demo at ~140° around the sun — readable against the HUD
  const angle = Math.PI * 0.78
  cookTargetX = cx + Math.cos(angle) * ringMid
  cookTargetY = cy + Math.sin(angle) * ringMid
  demoStartX = -30
  demoStartY = cy + 60

  tutorialBody = physics.spawnAt('asteroid', demoStartX, demoStartY, 40, 0)
  if (tutorialBody) {
    tutorialBody.radius = 14
    tutorialBody.mass = 14
    tutorialBody.bouncesLeft = 0
    tutorialBody.cookedSeconds = 0
  }
  sk.lastEarnedSplash.value = null
}

const end = () => {
  if (!active.value) return
  const physics = useGravityPhysics()
  const sk = useSolKeeper()
  active.value = false
  stage.value = totalStageCount.value
  stageElapsed.value = 0
  stage2Anchored = false

  if (mode.value === 'intro') {
    // Intro tears down the demo world and re-seeds.
    if (singularityActive.value) physics.setSingularity(false)
    physics.clearWorld()
    tutorialBody = null
    tutorialMode.value = false
    sk.markTutorialSeen()
    for (let i = 0; i < 5; i++) physics.spawnAt('asteroid', Math.random() * 200, Math.random() * 200)
    sk.sessionHeat.value = 0
  } else {
    // Advanced is a card-only tutorial layered over normal play. Just dismiss.
    sk.markTutorialAdvancedSeen()
  }
}

// Card-only advanced tutorial that runs ON TOP of normal play. Triggered
// once after the player's first 5 ripe sun-feeds. No scripted physics,
// no world clear — just guidance.
const startAdvanced = () => {
  if (active.value) return
  mode.value = 'advanced'
  active.value = true
  stage.value = 0
  stageElapsed.value = 0
}

const skip = () => {
  if (!active.value) return
  end()
}

// User clicks/taps the overlay → advance one stage (or end the tutorial if
// we're on the last). Gated by the read-threshold so quick-tappers can't
// blow past the explanation.
const next = () => {
  if (!active.value) return
  if (stageElapsed.value < STAGE_MIN_READ) return
  if (stage.value >= totalStageCount.value - 1) {
    end()
    return
  }
  stage.value += 1
  stageElapsed.value = 0
  stage2Anchored = false
}

const tick = (dt: number) => {
  if (!active.value) return
  stageElapsed.value += dt
  // Advanced tutorial is card-only — no physics scripting, no body to drive.
  if (mode.value === 'advanced') return
  const physics = useGravityPhysics()
  const cx = worldCenterX.value
  const cy = worldCenterY.value

  // Stage 0 — drag from edge into the ring
  if (stage.value === 0) {
    if (!tutorialBody || tutorialBody.dead) return
    const animDur = STAGE_ANIMATION_DURATIONS[0]
    const k = easeOut(stageElapsed.value / animDur)
    const sx = demoStartX + (cookTargetX - demoStartX) * k
    const sy = demoStartY + (cookTargetY - demoStartY) * k
    ensureGrab()
    physics.updateSingularity(sx, sy)
    return
  }

  // Stage 1 — TEACH STEERING. The singularity sweeps in a wide circle
  // around the body's location. The body, still grabbed, follows the
  // singularity along that circular path — visually it loops once or twice
  // around the cook target. This shows the player what they need to do
  // themselves: keep moving the singularity around the body to maintain
  // and shape its orbit.
  if (stage.value === 1) {
    if (!tutorialBody || tutorialBody.dead) return
    ensureGrab()
    const SWEEP_RADIUS = 70
    const SWEEP_RATE = 1.4   // rad/s — ~4.5s per loop, makes ~1 full loop in stage 1's 4s
    const sweepAngle = stageElapsed.value * SWEEP_RATE
    const sx = cookTargetX + Math.cos(sweepAngle) * SWEEP_RADIUS
    const sy = cookTargetY + Math.sin(sweepAngle) * SWEEP_RADIUS
    physics.updateSingularity(sx, sy)
    // Cooking still fast-forwards independently — the demo's cooking is
    // scripted, not speed-derived.
    const animDur = STAGE_ANIMATION_DURATIONS[1]
    const phase = Math.min(1.05, stageElapsed.value / animDur)
    tutorialBody.cookedSeconds = Math.max(tutorialBody.cookedSeconds, COOK_TIME_SECONDS * phase)
    return
  }

  // Stage 2 — drag the now-ripe body into the sun
  if (stage.value === 2) {
    if (tutorialBody && !tutorialBody.dead) {
      // Anchor the drag start to wherever the body currently is so the
      // ease-in begins from the body's actual position (the wobble in stage
      // 1 may have nudged it off cookTarget).
      if (!stage2Anchored) {
        stage2StartX = tutorialBody.x
        stage2StartY = tutorialBody.y
        stage2Anchored = true
      }
      ensureGrab()
      const animDur = STAGE_ANIMATION_DURATIONS[2]
      const k = easeIn(stageElapsed.value / animDur)
      const sx = stage2StartX + (cx - stage2StartX) * k
      const sy = stage2StartY + (cy - stage2StartY) * k
      physics.updateSingularity(sx, sy)
    } else if (singularityActive.value) {
      // Body's been consumed — release the singularity so it doesn't sit on
      // the sun while the player reads the card.
      physics.setSingularity(false)
    }
    return
  }

  // Stage 3 — finale; release singularity, just wait for the click.
  if (singularityActive.value) physics.setSingularity(false)
}

export default function useSolTutorial() {
  return {
    active,
    stage,
    stageElapsed,
    canContinue,
    progress,
    mode,
    totalStageCount,
    STAGE_COUNT,
    STAGE_MIN_READ,
    start,
    startAdvanced,
    skip,
    next,
    end,
    tick
  }
}
