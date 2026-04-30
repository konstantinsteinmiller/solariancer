import { ref, computed } from 'vue'
import type { CelestialBody } from '@/types/Solariancer'
import useGravityPhysics, {
  worldCenterX, worldCenterY,
  singularityActive, singularityX, singularityY, tutorialMode,
  COOK_TIME_SECONDS
} from '@/use/useGravityPhysics'
import useSolariancer from '@/use/useSolariancer'

// ─── Tutorial pacing ───────────────────────────────────────────────────────
//
// User-paced. Six stages, each with:
//   - an animation that runs for `duration` seconds
//   - a 2-second minimum read window (STAGE_MIN_READ) during which the
//     "Tap/Click to continue" prompt is suppressed so the player has to
//     actually look at the card
//   - a `highlight` kind that the renderer reads to spotlight the right
//     part of the playfield (Sun, Cook Ring, the Pull, etc.)
//
// Reordered (2026-04) so that named structures (Cook Ring, the Pull) are
// introduced BEFORE the player is asked to do anything with them — playtest
// kids didn't know what "the ring" referred to.

export type TutorialHighlightKind =
  | 'none'
  | 'sunAndCookRing' // both the Sun and the cook ring corridor pulse
  | 'cookRing'       // just the cook ring corridor
  | 'pullFalloff'    // labelled force line between Pull and demo body
  | 'sun'            // pulse the Sun
  | 'closeBand'      // narrow inner band (advanced "hot edge")

interface IntroStage {
  id: 'meet' | 'falloff' | 'pullIn' | 'steer' | 'feed' | 'finale'
  duration: number
  highlight: TutorialHighlightKind
}

const INTRO_STAGES: readonly IntroStage[] = [
  { id: 'meet', duration: 2.5, highlight: 'sunAndCookRing' },
  { id: 'falloff', duration: 4.5, highlight: 'pullFalloff' },
  { id: 'pullIn', duration: 2.0, highlight: 'cookRing' },
  { id: 'steer', duration: 2.0, highlight: 'cookRing' },
  { id: 'feed', duration: 1.5, highlight: 'sun' },
  { id: 'finale', duration: 0.0, highlight: 'none' }
] as const

const STAGE_MIN_READ = 2.0
const STAGE_COUNT = INTRO_STAGES.length

// Advanced tutorial — read-only narrative, four cards. No physics scripting,
// just teaching the loop's depth (crowd ×3, combo, hot edge, events).
const ADVANCED_STAGE_COUNT = 4
const ADVANCED_HIGHLIGHTS: readonly TutorialHighlightKind[] = [
  'cookRing',  // CROWD ×3
  'none',     // CHAIN COMBOS
  'closeBand', // HOT EDGE
  'none'       // EVENTS
]

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

// What the renderer should highlight RIGHT NOW. Drives drawTutorialHighlight()
// in useSolariancerRenderer.ts.
const currentHighlight = computed<TutorialHighlightKind>(() => {
  if (!active.value) return 'none'
  if (mode.value === 'advanced') {
    return ADVANCED_HIGHLIGHTS[stage.value] ?? 'none'
  }
  return INTRO_STAGES[stage.value]?.highlight ?? 'none'
})

// Current intro stage id (or 'none' for advanced / inactive). Lets the
// renderer pick the right stage-specific overlay (drag arrow, circle hint,
// ripe + feed callout, etc.) without copy-pasting the stage table.
export type IntroStageId = IntroStage['id'] | 'none'
const currentStageId = computed<IntroStageId>(() => {
  if (!active.value || mode.value !== 'intro') return 'none'
  return INTRO_STAGES[stage.value]?.id ?? 'none'
})

// Gravity-falloff demo — singularity-to-body distance and the "max" used
// to normalise it for the renderer's force-line thickness/colour.
// `falloffActive` mirrors `currentHighlight === 'pullFalloff'` so the
// renderer can early-out without computing distance every frame.
const falloffActive = ref(false)
const falloffDistance = ref(0)
const falloffMaxDistance = ref(80)
const falloffMinDistance = ref(22)

let tutorialBody: CelestialBody | null = null
const tutorialBodyId = ref<number | null>(null)
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

const releaseSingularity = () => {
  const physics = useGravityPhysics()
  if (singularityActive.value) physics.setSingularity(false)
}

const start = () => {
  if (active.value) return
  const physics = useGravityPhysics()
  const sk = useSolariancer()

  mode.value = 'intro'
  // Force a clean slate so the demo body is the only thing on screen.
  tutorialMode.value = true
  physics.clearWorld()

  active.value = true
  stage.value = 0
  stageElapsed.value = 0
  stage2Anchored = false
  falloffActive.value = false
  falloffDistance.value = 0

  const cx = worldCenterX.value
  const cy = worldCenterY.value
  const inner = physics.heatZoneInner.value
  const outer = physics.heatZoneOuter.value
  const ringMid = (inner + outer) / 2
  // Park the cooking demo at ~140° around the sun — readable against the HUD
  const angle = Math.PI * 0.78
  cookTargetX = cx + Math.cos(angle) * ringMid
  cookTargetY = cy + Math.sin(angle) * ringMid
  // Start position for the "pull into the ring" stage — left edge, low.
  demoStartX = -30
  demoStartY = cy + 60

  // Spawn the demo body parked at the cook target so stage 0 ("meet the
  // Sun & Cook Ring") shows a body sitting in the band the highlight is
  // labelling. It gets teleported to the edge on entry to the pullIn stage.
  tutorialBody = physics.spawnAt('asteroid', cookTargetX, cookTargetY, 0, 0)
  if (tutorialBody) {
    tutorialBody.radius = 14
    tutorialBody.mass = 14
    tutorialBody.bouncesLeft = 0
    tutorialBody.cookedSeconds = 0
    tutorialBodyId.value = tutorialBody.id
  }
  sk.lastEarnedSplash.value = null
}

const end = () => {
  if (!active.value) return
  const physics = useGravityPhysics()
  const sk = useSolariancer()
  active.value = false
  stage.value = totalStageCount.value
  stageElapsed.value = 0
  stage2Anchored = false
  falloffActive.value = false
  falloffDistance.value = 0

  if (mode.value === 'intro') {
    // Intro tears down the demo world and re-seeds.
    if (singularityActive.value) physics.setSingularity(false)
    physics.clearWorld()
    tutorialBody = null
    tutorialBodyId.value = null
    tutorialMode.value = false
    sk.markTutorialSeen()
    // Hand the player off into the live game using the same onboarding
    // path a fresh save sees — `spawnBody('asteroid')` with no opts goes
    // through the `fromEdge` branch, which (because the player is on
    // stage 1 with 0 ripe feeds) plants the first STAGE1_AUTOCOOK_COUNT
    // asteroids on the auto-cook orbit. Combined with the simSpeedMultiplier
    // (still 0.6× while heat < 200), they see the loop demonstrate
    // itself one more time before they have to control it. The cap at
    // currentBodyCap() means only ~3 actually land here — extras drop.
    for (let i = 0; i < 5; i++) physics.spawnBody('asteroid')
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
  falloffActive.value = false

  // Stage transitions that need to reset the demo body's state.
  if (mode.value === 'intro' && tutorialBody && !tutorialBody.dead) {
    const id = INTRO_STAGES[stage.value]?.id
    if (id === 'pullIn') {
      // Teleport the body back to the off-screen start so the "drag in"
      // demo has somewhere to drag from.
      tutorialBody.x = demoStartX
      tutorialBody.y = demoStartY
      tutorialBody.vx = 0
      tutorialBody.vy = 0
      tutorialBody.cookedSeconds = 0
      releaseSingularity()
    } else if (id === 'feed') {
      // Make sure the body is ripe by the time we start the feed-the-sun
      // demo — the steering stage normally finishes ripening, but if the
      // player skipped through quickly the body may still be raw.
      tutorialBody.cookedSeconds = Math.max(tutorialBody.cookedSeconds, COOK_TIME_SECONDS)
    } else if (id === 'finale') {
      releaseSingularity()
    }
  }
}

const tick = (dt: number) => {
  if (!active.value) return
  stageElapsed.value += dt
  // Advanced tutorial is card-only — no physics scripting, no body to drive.
  if (mode.value === 'advanced') {
    falloffActive.value = false
    return
  }
  const physics = useGravityPhysics()
  const cx = worldCenterX.value
  const cy = worldCenterY.value

  const stageDef = INTRO_STAGES[stage.value]
  if (!stageDef) return

  // Stage 'meet' — body sits parked in the cook ring; no singularity.
  // Renderer pulses the Sun + Cook Ring corridor labels.
  if (stageDef.id === 'meet') {
    falloffActive.value = false
    if (singularityActive.value) physics.setSingularity(false)
    if (tutorialBody && !tutorialBody.dead) {
      // Hold it perfectly still so the highlight reads cleanly.
      tutorialBody.x = cookTargetX
      tutorialBody.y = cookTargetY
      tutorialBody.vx = 0
      tutorialBody.vy = 0
    }
    return
  }

  // Stage 'falloff' — DEMO GRAVITY STRENGTH. Body is grabbed (so it stays
  // on-screen and predictable); the singularity orbits at varying distance
  // around it. The renderer draws a labelled force line whose visual weight
  // tracks the live distance — that's what teaches "closer = stronger."
  if (stageDef.id === 'falloff') {
    if (!tutorialBody || tutorialBody.dead) return
    ensureGrab()
    // Anchor the orbit to a fixed world point (the cook target), not the
    // body — the body's slight grab-lag creates a wobble we can let the
    // demo show off as natural motion.
    const t = stageElapsed.value
    // Two close↔far cycles in 4.5 s. cos² gives a smooth ease at both ends.
    const radiusPhase = (1 + Math.cos(t * 2.8)) * 0.5    // 0..1, easing both ends
    const radius = falloffMinDistance.value
      + (falloffMaxDistance.value - falloffMinDistance.value) * radiusPhase
    // Slow rotation so the kid sees the arrow sweep around — 360° in ~6 s.
    const angle = t * 1.05
    const sx = cookTargetX + Math.cos(angle) * radius
    const sy = cookTargetY + Math.sin(angle) * radius
    physics.updateSingularity(sx, sy)
    falloffActive.value = true
    // Live distance for the renderer (singularity → body).
    const dx = singularityX.value - tutorialBody.x
    const dy = singularityY.value - tutorialBody.y
    falloffDistance.value = Math.hypot(dx, dy)
    return
  }

  // Stage 'pullIn' — drag from edge into the ring. (Was the old stage 0.)
  if (stageDef.id === 'pullIn') {
    falloffActive.value = false
    if (!tutorialBody || tutorialBody.dead) return
    const animDur = stageDef.duration
    const k = easeOut(stageElapsed.value / animDur)
    const sx = demoStartX + (cookTargetX - demoStartX) * k
    const sy = demoStartY + (cookTargetY - demoStartY) * k
    ensureGrab()
    physics.updateSingularity(sx, sy)
    return
  }

  // Stage 'steer' — TEACH STEERING. Singularity sweeps in a wide circle
  // around the body's location; the body, still grabbed, follows the
  // singularity along that circular path — visually it loops once or twice
  // around the cook target. Cooking is fast-forwarded so the body is RIPE
  // by the end of the stage.
  if (stageDef.id === 'steer') {
    falloffActive.value = false
    if (!tutorialBody || tutorialBody.dead) return
    ensureGrab()
    const SWEEP_RADIUS = 70
    const SWEEP_RATE = 1.4   // rad/s — ~4.5 s per loop, ~1 loop in stage's 4 s
    const sweepAngle = stageElapsed.value * SWEEP_RATE
    const sx = cookTargetX + Math.cos(sweepAngle) * SWEEP_RADIUS
    const sy = cookTargetY + Math.sin(sweepAngle) * SWEEP_RADIUS
    physics.updateSingularity(sx, sy)
    const animDur = stageDef.duration
    const phase = Math.min(1.05, stageElapsed.value / animDur)
    tutorialBody.cookedSeconds = Math.max(
      tutorialBody.cookedSeconds, COOK_TIME_SECONDS * phase
    )
    return
  }

  // Stage 'feed' — drag the now-ripe body into the sun.
  if (stageDef.id === 'feed') {
    falloffActive.value = false
    if (tutorialBody && !tutorialBody.dead) {
      // Anchor the drag start to wherever the body currently is so the
      // ease-in begins from the body's actual position (the wobble in
      // the steer stage may have nudged it off cookTarget).
      if (!stage2Anchored) {
        stage2StartX = tutorialBody.x
        stage2StartY = tutorialBody.y
        stage2Anchored = true
      }
      ensureGrab()
      const animDur = stageDef.duration
      const k = easeIn(stageElapsed.value / animDur)
      const sx = stage2StartX + (cx - stage2StartX) * k
      const sy = stage2StartY + (cy - stage2StartY) * k
      physics.updateSingularity(sx, sy)
    } else if (singularityActive.value) {
      // Body's been consumed — release the singularity so it doesn't sit
      // on the sun while the player reads the card.
      physics.setSingularity(false)
    }
    return
  }

  // Stage 'finale' — release singularity, just wait for the click.
  if (stageDef.id === 'finale') {
    falloffActive.value = false
    if (singularityActive.value) physics.setSingularity(false)
  }
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
    currentHighlight,
    currentStageId,
    falloffActive,
    falloffDistance,
    falloffMaxDistance,
    falloffMinDistance,
    tutorialBodyId,
    start,
    startAdvanced,
    skip,
    next,
    end,
    tick
  }
}
