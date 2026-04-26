import { ref, computed } from 'vue'
import useGravityPhysics, {
  worldWidth, worldHeight, worldCenterX, worldCenterY,
  bodies, tutorialMode, worldScale, heatZoneOuter,
  eventFlareMultiplier, eventBlackHoleActive, eventBlackHoleX, eventBlackHoleY
} from '@/use/useGravityPhysics'
import useSolKeeper from '@/use/useSolKeeper'
import { spawnParticles, spawnPopup } from '@/use/useGravityPhysics'

// ─── Tuning ────────────────────────────────────────────────────────────────
//
// Solar Flares — a windowed ×4 heat multiplier that paces the session.
const FLARE_COOLDOWN_MIN = 90      // s — tightest cadence between flares
const FLARE_COOLDOWN_MAX = 180     // s — slowest cadence
const FLARE_DURATION = 6           // s — how long a flare's bonus lasts
const FLARE_WARNING = 3            // s — pre-flare warning so the player can stage bodies
const FLARE_MULTIPLIER = 4

// Comets — fast cross-screen visitors. Catch with the singularity for a payoff.
const COMET_COOLDOWN_MIN = 50
const COMET_COOLDOWN_MAX = 90
const COMET_REWARD_HEAT = 200
const COMET_SPEED = 280            // px/s
const COMET_RADIUS = 11
const COMET_MASS = 12              // light enough to grab even at base singularity

// Black Holes — high-stakes "boss" interrupt every N ripe feeds.
const BLACK_HOLE_TRIGGER_FEEDS = 10
const BLACK_HOLE_DURATION = 6      // s
const BLACK_HOLE_FORCE = 320_000   // raw force scalar — divided by mass per body
const BLACK_HOLE_REWARD_HEAT = 600
const BLACK_HOLE_REWARD_STAR_MATTER = 2

// ─── Flare state ───────────────────────────────────────────────────────────
const flareActive = ref(false)
const flareWarning = ref(false)    // 3s before the flare starts
const flareTimeLeft = ref(0)       // seconds remaining in the current flare/warning
const flareCooldown = ref(rand(FLARE_COOLDOWN_MIN, FLARE_COOLDOWN_MAX) * 0.4)
const flareMultiplier = computed(() => (flareActive.value ? FLARE_MULTIPLIER : 1))

// ─── Comet state ───────────────────────────────────────────────────────────
const cometCooldown = ref(rand(COMET_COOLDOWN_MIN, COMET_COOLDOWN_MAX) * 0.5)

// ─── Black hole state ──────────────────────────────────────────────────────
const blackHoleActive = ref(false)
const blackHoleX = ref(0)
const blackHoleY = ref(0)
const blackHoleTimeLeft = ref(0)
const blackHoleSpawnFlash = ref(0)
let lastFeedCountForBH = 0
let bhRipeAtStart = 0

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

const triggerFlare = () => {
  flareWarning.value = false
  flareActive.value = true
  flareTimeLeft.value = FLARE_DURATION
  spawnPopup(worldCenterX.value, worldCenterY.value - 60, 'SOLAR FLARE!', '#ff6a3d', 32)
  spawnParticles(worldCenterX.value, worldCenterY.value, 30, 18, 320, 5, 1.0)
}

const endFlare = () => {
  flareActive.value = false
  flareTimeLeft.value = 0
  flareCooldown.value = rand(FLARE_COOLDOWN_MIN, FLARE_COOLDOWN_MAX)
}

const spawnComet = () => {
  const physics = useGravityPhysics()
  const W = worldWidth.value
  const H = worldHeight.value
  // Pick a random edge and an exit edge across the screen
  const side = Math.floor(Math.random() * 4)
  let x = 0, y = 0, vx = 0, vy = 0
  // Comet speed scales with worldScale so the streak crosses the viewport
  // in the same wall-clock time on phone / tablet / desktop.
  const ws = worldScale.value
  const speed = COMET_SPEED * ws
  const wobble = 60 * ws
  if (side === 0) {        // left → right (curving)
    x = -40
    y = rand(H * 0.2, H * 0.8)
    vx = speed
    vy = rand(-wobble, wobble)
  } else if (side === 1) { // right → left
    x = W + 40
    y = rand(H * 0.2, H * 0.8)
    vx = -speed
    vy = rand(-wobble, wobble)
  } else if (side === 2) { // top → bottom
    x = rand(W * 0.2, W * 0.8)
    y = -40
    vx = rand(-wobble, wobble)
    vy = speed
  } else {                 // bottom → top
    x = rand(W * 0.2, W * 0.8)
    y = H + 40
    vx = rand(-wobble, wobble)
    vy = -speed
  }
  const body = physics.spawnAt('asteroid', x, y, vx, vy)
  if (body) {
    body.isComet = true
    body.cometCaught = false
    body.radius = COMET_RADIUS
    body.mass = COMET_MASS
    body.hue = 200            // icy cyan
    body.yieldRate = 4.0      // higher passive yield while orbiting
    body.sunFeedBonus = 60    // ripe comet feeds are juicy
    body.bouncesLeft = 0
  }
  spawnPopup(x, y, 'COMET!', '#9eddff', 22)
}

const spawnBlackHole = () => {
  const W = worldWidth.value
  const H = worldHeight.value
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  // Stay outside the heat zone with a small buffer so the BH never visually
  // overlaps the sun or its ring. Cap by the smallest viewport half so a
  // narrow phone in landscape can't make the safe zone larger than the
  // playfield (which would prevent any spawn).
  const margin = 100
  const minDist = Math.min(
    heatZoneOuter.value + 60 * worldScale.value,
    Math.min(W, H) * 0.5 - margin
  )
  // Reject-sample up to ~24 tries; on the last fall-through we still place
  // somewhere safe by pushing outward radially from the sun.
  let x = 0
  let y = 0
  for (let i = 0; i < 24; i++) {
    x = rand(margin, W - margin)
    y = rand(margin, H - margin)
    const dx = x - cx
    const dy = y - cy
    if (dx * dx + dy * dy >= minDist * minDist) break
  }
  // Final safety net — if we never escaped the safe ring, push the point out
  // radially along whatever direction we last sampled (or a random one).
  {
    const dx = x - cx
    const dy = y - cy
    const d2 = dx * dx + dy * dy
    if (d2 < minDist * minDist) {
      const ang = d2 > 1 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2
      x = cx + Math.cos(ang) * minDist
      y = cy + Math.sin(ang) * minDist
      x = Math.max(margin, Math.min(W - margin, x))
      y = Math.max(margin, Math.min(H - margin, y))
    }
  }
  blackHoleX.value = x
  blackHoleY.value = y
  blackHoleActive.value = true
  blackHoleTimeLeft.value = BLACK_HOLE_DURATION
  blackHoleSpawnFlash.value = 1
  bhRipeAtStart = countRipe()
  spawnPopup(blackHoleX.value, blackHoleY.value, 'BLACK HOLE!', '#a070ff', 28)
  spawnParticles(blackHoleX.value, blackHoleY.value, 26, 280, 200, 4, 0.9)
}

const countRipe = (): number => {
  let n = 0
  for (const b of bodies.value) if (!b.dead && b.cookedSeconds >= 10) n++
  return n
}

const endBlackHole = () => {
  const sk = useSolKeeper()
  const survivedRipe = countRipe()
  blackHoleActive.value = false
  blackHoleTimeLeft.value = 0
  if (survivedRipe >= bhRipeAtStart && bhRipeAtStart > 0) {
    const heatAward = BLACK_HOLE_REWARD_HEAT * sk.cosmicForgeMultiplier.value
    sk.addHeat(heatAward)
    sk.addStarMatter(BLACK_HOLE_REWARD_STAR_MATTER)
    sk.lastEarnedSplash.value = { amount: heatAward, at: performance.now() }
    sk.registerBlackHoleSurvived()
    spawnPopup(blackHoleX.value, blackHoleY.value, `SURVIVED! +${Math.round(heatAward)}`, '#ffd14a', 30)
  } else {
    spawnPopup(blackHoleX.value, blackHoleY.value, 'COLLAPSED', '#888aaa', 22)
  }
}

const tick = (dt: number) => {
  if (tutorialMode.value) return
  const sk = useSolKeeper()

  // ── Flare scheduler ──────────────────────────────────────────────────────
  // Stage 1 is the onboarding sandbox — the red-wash flare effect is
  // confusing alongside the other "what's happening?" mechanics, and
  // its ×4 heat boost destabilises the carefully tuned early heat curve.
  // Tear down any in-flight flare and pause the cooldown so a flare
  // can't pop the moment the player clears stage 1 either.
  if (sk.state.value.stage === 1) {
    if (flareActive.value || flareWarning.value) {
      flareActive.value = false
      flareWarning.value = false
      flareTimeLeft.value = 0
      eventFlareMultiplier.value = 1
    }
    // Hold the cooldown at a small positive value so the very next
    // tick after stage advance doesn't immediately roll a flare.
    flareCooldown.value = Math.max(flareCooldown.value, 5)
  } else if (flareActive.value) {
    flareTimeLeft.value -= dt
    if (flareTimeLeft.value <= 0) endFlare()
  } else if (flareWarning.value) {
    flareTimeLeft.value -= dt
    if (flareTimeLeft.value <= 0) triggerFlare()
  } else {
    flareCooldown.value -= dt
    if (flareCooldown.value <= 0) {
      flareWarning.value = true
      flareTimeLeft.value = FLARE_WARNING
      spawnPopup(worldCenterX.value, worldCenterY.value - 80, 'FLARE INCOMING…', '#ffb04a', 22)
    }
  }

  // ── Comet scheduler ──────────────────────────────────────────────────────
  cometCooldown.value -= dt
  if (cometCooldown.value <= 0) {
    spawnComet()
    cometCooldown.value = rand(COMET_COOLDOWN_MIN, COMET_COOLDOWN_MAX)
  }

  // ── Black hole scheduler ─────────────────────────────────────────────────
  if (blackHoleActive.value) {
    blackHoleTimeLeft.value -= dt
    if (blackHoleTimeLeft.value <= 0) endBlackHole()
  } else {
    const ripeFeeds = sk.state.value.totalRipeFeeds
    if (ripeFeeds > 0 && ripeFeeds - lastFeedCountForBH >= BLACK_HOLE_TRIGGER_FEEDS) {
      lastFeedCountForBH = ripeFeeds
      spawnBlackHole()
    }
    if (lastFeedCountForBH === 0 && ripeFeeds > 0) lastFeedCountForBH = 0 // initialize
  }

  if (blackHoleSpawnFlash.value > 0) {
    blackHoleSpawnFlash.value = Math.max(0, blackHoleSpawnFlash.value - dt * 1.4)
  }

  // Mirror state into the physics input channels so the next physicsStep
  // sees the current event configuration without importing useSolEvents.
  eventFlareMultiplier.value = flareActive.value ? FLARE_MULTIPLIER : 1
  eventBlackHoleActive.value = blackHoleActive.value
  eventBlackHoleX.value = blackHoleX.value
  eventBlackHoleY.value = blackHoleY.value
}

const reset = () => {
  flareActive.value = false
  flareWarning.value = false
  flareTimeLeft.value = 0
  flareCooldown.value = rand(FLARE_COOLDOWN_MIN, FLARE_COOLDOWN_MAX) * 0.4
  cometCooldown.value = rand(COMET_COOLDOWN_MIN, COMET_COOLDOWN_MAX) * 0.5
  blackHoleActive.value = false
  blackHoleTimeLeft.value = 0
  blackHoleSpawnFlash.value = 0
  lastFeedCountForBH = 0
  bhRipeAtStart = 0
}

export const FLARE_DURATION_SECONDS = FLARE_DURATION
export const FLARE_MULTIPLIER_VALUE = FLARE_MULTIPLIER
export const BLACK_HOLE_FORCE_SCALAR = BLACK_HOLE_FORCE

export default function useSolEvents() {
  return {
    // Flare
    flareActive,
    flareWarning,
    flareTimeLeft,
    flareMultiplier,
    flareCooldown,
    // Comet
    // Black hole
    blackHoleActive,
    blackHoleX,
    blackHoleY,
    blackHoleTimeLeft,
    blackHoleSpawnFlash,
    // API
    tick,
    reset
  }
}
