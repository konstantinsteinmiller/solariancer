import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { BodyKind, CelestialBody, Particle, ScorePopup } from '@/types/solkeeper'
import useSolKeeper from '@/use/useSolKeeper'
import useSounds from '@/use/useSound'

// ─── Constants ─────────────────────────────────────────────────────────────
const G = 2200              // gravitational constant (game units)
const SUN_BASE_RADIUS = 64  // logical sun radius — fixed; zone width grows with upgrade
const SUN_MASS = 5000
const MAX_BODIES = 24
const MAX_PARTICLES = 220
const MAX_POPUPS = 28
const TRAIL_LENGTH = 16     // ring buffer entries (each is x,y => 2 floats)
const WORLD_PADDING = 80
const ZONE_TICK_SECONDS = 0.5     // heat awarded twice per second while in zone
const HEAT_ZONE_INNER_GAP = 24    // distance from sun surface to inner ring edge
const HEAT_ZONE_BASE_WIDTH = 90   // base ring width before Zone Expansion upgrades
const COOK_TIME = 10              // seconds in zone needed to mark a body "ripe"
const ZONE_WARMUP = 3             // seconds in (regular) heat zone before any heat is generated
const ZONE_HEAT_TICKS_MAX = 3     // a body produces at most this many passive heat ticks; after that, only ripe-consume earns
// Close-to-Sun zone — narrow band right against the sun surface. High risk
// (orbital speeds are huge, easy to crash), high reward (cooks faster and
// starts earning sooner). Sits inside the regular heat zone's inner edge.
const CLOSE_ZONE_INNER_GAP = 4    // distance from sun surface to close zone start
const CLOSE_ZONE_WARMUP = 2       // seconds in close zone before earning starts
const CLOSE_ZONE_COOK_BONUS = 1.3 // multiplier on speed-derived ripening factor
const RIPE_FEED_MULT = 8          // multiplier on sunFeedBonus when a ripe body falls in
const RAW_FEED_MULT = 0           // raw bodies that hit the sun yield no heat — must be ripe
const ZONE_BASE_HEAT_PER_SEC = 6  // heat/s per body in zone (scaled by yieldRate)
const CROWD_BONUS_THRESHOLD = 3   // bodies in zone needed to trigger crowd multiplier
const CROWD_MULT = 3              // multiplier when ≥ threshold bodies share the zone
const BOUNCE_RESTITUTION = 0.65   // velocity preserved on Surface Tension bounce
const SINGULARITY_RANGE = 200  // pixel range of pull effect at zero upgrades
const SINGULARITY_BASE_FORCE = 9000
const SINGULARITY_FALLOFF_EXPONENT = 2     // quadratic falloff — far-in-range bodies feel a fraction of the close pull
// Probe — slow rope-tether station. Catches passing asteroids and drags them
// along its orbit until they ripen, then launches them at the Sun for a ripe
// payout (chains combos). Probes never grab anything bigger than asteroids.
const PROBE_ORBIT_RADIUS_FACTOR = 2.4   // probe's orbit relative to SUN_BASE_RADIUS
const PROBE_ANGULAR_SPEED_MIN = 0.18    // rad/s — slow! never whips around the player
const PROBE_ANGULAR_SPEED_MAX = 0.28    // rad/s
const PROBE_ROPE_RANGE = 70             // px — max reach for catching a passing asteroid
const PROBE_TRAIL_OFFSET = 0.45         // rad — captured asteroid trails this far behind probe
const PROBE_DRAG_K = 6                  // 1/s — how stiffly asteroid is pulled toward target trail position
const PROBE_LAUNCH_SPEED = 320          // px/s — speed asteroid leaves the rope at, aimed at the Sun
const PROBE_CATCH_MAX_MASS = 18         // bigger bodies are immune to ropes
const PROBE_CATCH_MAX_RADIUS = 11       // and so are anything visually larger than a small asteroid
const MAGNET_BASE_RANGE = 60   // px, +25 per Mass Magnet level
const MAGNET_PER_LEVEL_RANGE = 25
const MAGNET_PULL_PER_LEVEL = 1800 // force scale toward host planet
// Ripening — bodies must MOVE through the zone to ripen. A held-in-place
// body barely cooks (factor 0.05); fast-moving bodies cook faster.
const RIPEN_REF_SPEED = 120
const RIPEN_MIN_FACTOR = 0.05
const RIPEN_MAX_FACTOR = 2.5

let bodyIdSeq = 1

// World extent — set by the renderer based on canvas size
export const worldWidth = ref(800)
export const worldHeight = ref(600)
export const worldCenterX = computed(() => worldWidth.value / 2)
export const worldCenterY = computed(() => worldHeight.value / 2)

// World scale — shrinks the sun/zones/bodies/black-hole/singularity range
// proportionally to viewport size so everything stays visually balanced on
// mobile portrait. Reference dimension is 800 px (the working desktop size);
// at that size or larger, scale = 1. Capped between 0.5 and 1.0 so very
// small viewports don't render unreadably tiny.
export const worldScale = computed(() => {
  const minDim = Math.min(worldWidth.value, worldHeight.value)
  return Math.max(0.5, Math.min(1, minDim / 800))
})

// Player input
export const singularityActive = ref(false)
export const singularityX = ref(0)
export const singularityY = ref(0)

// Game lists
export const bodies: Ref<CelestialBody[]> = ref([])
export const particles: Ref<Particle[]> = ref([])
export const popups: Ref<ScorePopup[]> = ref([])

// Pulse / FX timers
export const sunPulse = ref(0)            // visual heartbeat (sec)
export const screenShake = ref(0)         // px magnitude
export const flashIntensity = ref(0)      // 0..1 — global flash on collision

// Stats
export const orbitingCount = ref(0)        // bodies currently inside the Heat Zone
export const ripeCount = ref(0)            // bodies that have finished cooking
export const totalCollisions = ref(0)
export const sessionTime = ref(0)
export const sunShieldFlash = ref(0)       // 0..1 — pulses when Surface Tension bounces
export const crowdBonusActive = ref(false) // true while ≥ CROWD_BONUS_THRESHOLD bodies share the zone
export const tutorialMode = ref(false)     // true while the scripted intro tutorial is running

// ─── Event input channels (written by useSolEvents) ────────────────────────
//
// Refs are written by the events composable each frame. Physics just reads
// them — keeps the dependency direction one-way (events → physics) and
// avoids a circular import.
export const eventFlareMultiplier = ref(1)
export const eventBlackHoleActive = ref(false)
export const eventBlackHoleX = ref(0)
export const eventBlackHoleY = ref(0)

const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)

// ─── Pattern caching ───────────────────────────────────────────────────────
//
// Each celestial body gets a small offscreen canvas that we draw once and
// reuse every frame. This avoids per-frame radial-gradient allocations and
// keeps the renderer cheap even with many bodies on screen.

const buildBodyPattern = (kind: BodyKind, hue: number, radius: number): HTMLCanvasElement => {
  const size = Math.max(8, Math.ceil(radius * 2))
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const r = radius

  // Base sphere via radial gradient (lit from upper-left to mimic sun light)
  const lit = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.05, cx, cy, r)
  const baseSat = kind === 'jewel' ? 75 : kind === 'gas' ? 60 : 35
  const baseLight = kind === 'gas' ? 55 : kind === 'ice' ? 70 : 45
  lit.addColorStop(0, `hsl(${hue} ${baseSat}% ${baseLight + 30}%)`)
  lit.addColorStop(0.5, `hsl(${hue} ${baseSat}% ${baseLight}%)`)
  lit.addColorStop(1, `hsl(${hue} ${baseSat}% ${Math.max(8, baseLight - 28)}%)`)
  ctx.fillStyle = lit
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Surface detail
  if (kind === 'gas') {
    // Horizontal bands
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    for (let i = -3; i <= 3; i++) {
      const yPos = cy + i * (r * 0.28)
      const bandHue = (hue + i * 14 + 360) % 360
      ctx.fillStyle = `hsla(${bandHue}, 65%, ${50 + i * 4}%, 0.32)`
      ctx.fillRect(cx - r, yPos - r * 0.12, r * 2, r * 0.18)
    }
    ctx.restore()
  } else if (kind === 'rocky' || kind === 'asteroid') {
    // Crater-ish freckles
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    const dots = kind === 'rocky' ? 6 : 9
    for (let i = 0; i < dots; i++) {
      const a = Math.random() * Math.PI * 2
      const d = Math.random() * r * 0.8
      const dx = cx + Math.cos(a) * d
      const dy = cy + Math.sin(a) * d
      const dr = r * (0.08 + Math.random() * 0.18)
      ctx.fillStyle = `hsla(${hue}, 25%, ${15 + Math.random() * 25}%, 0.55)`
      ctx.beginPath()
      ctx.arc(dx, dy, dr, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  } else if (kind === 'ice') {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2
      const d = Math.random() * r * 0.7
      ctx.fillStyle = `rgba(220, 240, 255, ${0.25 + Math.random() * 0.25})`
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.18, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  } else if (kind === 'jewel') {
    // Sparkle
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    const sparkleGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    sparkleGrad.addColorStop(0, 'rgba(255,255,255,0.8)')
    sparkleGrad.addColorStop(0.4, `hsla(${hue}, 90%, 75%, 0.4)`)
    sparkleGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sparkleGrad
    ctx.fillRect(0, 0, size, size)
    ctx.restore()
  }

  // Specular highlight
  const spec = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, 0, cx - r * 0.4, cy - r * 0.45, r * 0.5)
  spec.addColorStop(0, 'rgba(255,255,255,0.55)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Rim shadow
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const rim = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r)
  rim.addColorStop(0, 'rgba(255,255,255,1)')
  rim.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = rim
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  return c
}

interface KindParams {
  mass: number
  radiusMin: number
  radiusMax: number
  yieldRate: number
  feedBonus: number
  hueMin: number
  hueMax: number
}

const kindParams = (kind: BodyKind): KindParams => {
  switch (kind) {
    case 'asteroid':
      return { mass: 6, radiusMin: 4, radiusMax: 9, yieldRate: 0.8, feedBonus: 4, hueMin: 25, hueMax: 50 }
    case 'rocky':
      // Rocky is the early "pet" planet — moderately heavy. Beginners can
      // wrangle one with patience; multiples in the ring quickly become
      // unmanageable without Singularity Core upgrades.
      return { mass: 36, radiusMin: 12, radiusMax: 18, yieldRate: 1.6, feedBonus: 14, hueMin: 12, hueMax: 35 }
    case 'gas':
      // Gas giants are end-game targets. Without Singularity Core 4+ they're
      // basically immovable: huge feed bonuses but unreachable until upgraded.
      return { mass: 110, radiusMin: 22, radiusMax: 32, yieldRate: 4.8, feedBonus: 50, hueMin: 180, hueMax: 280 }
    case 'ice':
      return { mass: 48, radiusMin: 14, radiusMax: 22, yieldRate: 2.4, feedBonus: 22, hueMin: 185, hueMax: 215 }
    case 'jewel':
      // Jewels are small but dense — fast, hard to grab, very rewarding when ripe.
      return { mass: 26, radiusMin: 10, radiusMax: 14, yieldRate: 6.0, feedBonus: 80, hueMin: 280, hueMax: 340 }
  }
}

// ─── Spawning ──────────────────────────────────────────────────────────────

const randRange = (a: number, b: number) => a + Math.random() * (b - a)

const spawnBody = (kind: BodyKind, opts?: { fromEdge?: boolean; x?: number; y?: number }) => {
  if (bodies.value.length >= MAX_BODIES) return null
  const params = kindParams(kind)
  // Scale body radius down on small viewports so a gas giant doesn't fill
  // half a phone screen. Mass stays unchanged — it's a balance value, not a
  // visual one. Only the sun-consume threshold and singularity no-go pick
  // up the scaled radius (both expected behaviours).
  //
  // Use sqrt(worldScale) instead of linear scaling so small asteroids stay
  // trackable on phones (linear scaling shrunk them to ~2 px on the new busy
  // background). Then enforce a 5 px absolute floor so the very smallest
  // asteroids never disappear into the bg art.
  const ws = worldScale.value
  const radiusBase = randRange(params.radiusMin, params.radiusMax)
  const radius = Math.max(radiusBase * Math.sqrt(ws), 5)
  const hue = randRange(params.hueMin, params.hueMax)

  let x = opts?.x ?? 0
  let y = opts?.y ?? 0
  let vx = 0
  let vy = 0

  if (opts?.fromEdge ?? !opts) {
    // Spawn on a random edge with a velocity loosely angled toward the
    // gravity well so things drift through naturally.
    const W = worldWidth.value
    const H = worldHeight.value
    const cx = W / 2
    const cy = H / 2
    const side = Math.floor(Math.random() * 4)
    if (side === 0) {
      x = -WORLD_PADDING * 0.3
      y = randRange(0, H)
    } else if (side === 1) {
      x = W + WORLD_PADDING * 0.3
      y = randRange(0, H)
    } else if (side === 2) {
      x = randRange(0, W)
      y = -WORLD_PADDING * 0.3
    } else {
      x = randRange(0, W)
      y = H + WORLD_PADDING * 0.3
    }
    const dx = cx - x
    const dy = cy - y
    const dist = Math.hypot(dx, dy)
    // Drift speed scales linearly with worldScale so bodies cover the same
    // fraction-of-viewport per second across all device sizes.
    const speed = randRange(40, 95) * worldScale.value
    // Tangential component for non-radial trajectories — adds drift
    const tangent = randRange(-0.6, 0.6)
    vx = (dx / dist) * speed + (-dy / dist) * speed * tangent
    vy = (dy / dist) * speed + (dx / dist) * speed * tangent
  }

  const body: CelestialBody = {
    id: bodyIdSeq++,
    kind,
    x, y, vx, vy,
    radius,
    mass: params.mass,
    hue,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: randRange(-1.2, 1.2),
    yieldRate: params.yieldRate,
    sunFeedBonus: params.feedBonus,
    age: 0,
    ax: 0, ay: 0,
    orbitStability: 0,
    stableSeconds: 0,
    inHeatZone: false,
    inCloseZone: false,
    cookedSeconds: 0,
    bouncesLeft: sk.surfaceTensionBounces.value,
    fxFlash: 0,
    zoneHeatTicks: 0,
    trail: new Array(TRAIL_LENGTH * 2).fill(NaN),
    trailHead: 0,
    dead: false,
    grabbed: false
  }
  body.pattern = buildBodyPattern(kind, hue, radius)
  bodies.value.push(body)
  return body
}

const spawnAsteroidBurst = () => {
  for (let i = 0; i < 6; i++) spawnBody('asteroid')
}

// ─── Effects helpers ───────────────────────────────────────────────────────

export const spawnParticles = (
  x: number, y: number,
  count: number,
  baseHue: number,
  spreadVel: number,
  size: number,
  life: number
) => {
  for (let i = 0; i < count; i++) {
    if (particles.value.length >= MAX_PARTICLES) return
    const a = Math.random() * Math.PI * 2
    const v = randRange(spreadVel * 0.4, spreadVel)
    particles.value.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0,
      maxLife: life * randRange(0.7, 1.2),
      size: size * randRange(0.6, 1.3),
      hue: (baseHue + randRange(-15, 15) + 360) % 360,
      shrink: randRange(0.6, 1.2),
      alpha: 1
    })
  }
}

export const spawnPopup = (x: number, y: number, text: string, color: string, size = 22) => {
  if (popups.value.length >= MAX_POPUPS) {
    popups.value.shift()
  }
  popups.value.push({
    x, y, text, color, size,
    life: 0, maxLife: 1.4, vy: -55
  })
}

const triggerExplosion = (x: number, y: number, hueA: number, hueB: number, magnitude: number) => {
  spawnParticles(x, y, 14 + (isFirefox ? 0 : 6), hueA, 220 * magnitude, 4, 0.8)
  spawnParticles(x, y, 8, hueB, 140 * magnitude, 3, 0.6)
  flashIntensity.value = Math.min(1, flashIntensity.value + 0.5 * magnitude)
  screenShake.value = Math.min(18, screenShake.value + 6 * magnitude)
  totalCollisions.value++
}

// ─── Probe (rope-tether station) ───────────────────────────────────────────

export interface Probe {
  angle: number        // rad — current angle around the sun
  orbitRadius: number  // px — fixed orbit distance from sun
  speed: number        // rad/s — angular velocity (low; probes never whip past the player)
  pulseT: number       // visual phase
  capturedId: number | null  // body id of the roped asteroid, or null when free
  tier: 'small' | 'big'      // 'big' probes orbit further out and rope mid-size bodies
}

export const probes: Ref<Probe[]> = ref([])

// Big probes orbit further out so they don't trample the inner ring's small probes
const BIG_PROBE_ORBIT_RADIUS_FACTOR = 3.4   // ~3.4× sun radius
const BIG_PROBE_ANGULAR_SPEED_MIN = 0.12    // even slower than small ones
const BIG_PROBE_ANGULAR_SPEED_MAX = 0.20
const BIG_PROBE_ROPE_RANGE = 110            // wider rope to catch bigger bodies
const BIG_PROBE_CATCH_MAX_MASS = 50         // catches asteroid + rocky + ice + jewel

const syncProbes = (smallCount: number, bigCount: number) => {
  const list = probes.value
  // Count current per-tier
  let curSmall = 0, curBig = 0
  for (const p of list) (p.tier === 'big' ? (curBig++) : (curSmall++))
  // Add small probes
  while (curSmall < smallCount) {
    list.push({
      angle: Math.random() * Math.PI * 2,
      orbitRadius: SUN_BASE_RADIUS * PROBE_ORBIT_RADIUS_FACTOR * worldScale.value,
      speed: randRange(PROBE_ANGULAR_SPEED_MIN, PROBE_ANGULAR_SPEED_MAX),
      pulseT: 0,
      capturedId: null,
      tier: 'small'
    })
    curSmall++
  }
  // Add big probes
  while (curBig < bigCount) {
    list.push({
      angle: Math.random() * Math.PI * 2,
      orbitRadius: SUN_BASE_RADIUS * BIG_PROBE_ORBIT_RADIUS_FACTOR * worldScale.value,
      speed: randRange(BIG_PROBE_ANGULAR_SPEED_MIN, BIG_PROBE_ANGULAR_SPEED_MAX),
      pulseT: 0,
      capturedId: null,
      tier: 'big'
    })
    curBig++
  }
  // Remove extras (drop oldest of the over-allocated tier first)
  while (curSmall > smallCount) {
    const idx = list.findIndex(p => p.tier === 'small' && p.capturedId === null)
    if (idx < 0) break
    list.splice(idx, 1)
    curSmall--
  }
  while (curBig > bigCount) {
    const idx = list.findIndex(p => p.tier === 'big' && p.capturedId === null)
    if (idx < 0) break
    list.splice(idx, 1)
    curBig--
  }
}

// ─── Physics integration ───────────────────────────────────────────────────

const sk = useSolKeeper()

const computeSunRadius = () => SUN_BASE_RADIUS * worldScale.value

// Tracks the last stage-advance timestamp we've reacted to. physicsStep fires
// celebration FX exactly once per stage transition by comparing this to
// sk.stageJustAdvancedAt.
let lastFiredStageAdvanceAt = 0

const computeZoneInner = () => (SUN_BASE_RADIUS + HEAT_ZONE_INNER_GAP) * worldScale.value
const computeZoneOuter = () => {
  // Width uses sqrt(worldScale) instead of linear scaling so the playable
  // ring on phones doesn't shrink in lockstep with the sun. At default ws
  // (0.5 on phones) linear scaling gave a 90 → 45 px base width, which
  // combined with the outer cap left max-upgrade phones with a ~95 px ring
  // vs ~240 px on desktop. Square-root softens that gap dramatically.
  const ws = worldScale.value
  const widthScale = Math.sqrt(ws)
  const baseOuter = computeZoneInner() + HEAT_ZONE_BASE_WIDTH * widthScale * sk.heatZoneWidthBonus.value
  // Outer cap — fraction of the shortest viewport side, minus a 30 px
  // margin so off-screen spawns can still drift in. Lifted from 0.45 →
  // 0.55 so the cap stops binding aggressively on phone landscape, where
  // it was the dominant bottleneck on heat-zone width.
  const maxOuter = Math.min(worldWidth.value, worldHeight.value) * 0.55 - 30
  return Math.min(baseOuter, Math.max(computeZoneInner() + 40 * ws, maxOuter))
}
const computeCloseZoneInner = () => (SUN_BASE_RADIUS + CLOSE_ZONE_INNER_GAP) * worldScale.value
const computeCloseZoneOuter = () => computeZoneInner() // close zone ends where the regular heat zone begins

let heatTickAccum = 0

const physicsStep = (dt: number) => {
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  const sunR = computeSunRadius()
  const zoneInner = computeZoneInner()
  const zoneOuter = computeZoneOuter()
  const closeInner = computeCloseZoneInner()
  const closeOuter = zoneInner // close zone ends where the regular zone begins
  const orbitMax = Math.min(worldWidth.value, worldHeight.value) * 0.45 * sk.attractionRadius.value
  const sxActive = singularityActive.value
  const sx = singularityX.value
  const sy = singularityY.value
  const sForce = SINGULARITY_BASE_FORCE * sk.singularityPower.value
  const sRange = SINGULARITY_RANGE * sk.attractionRadius.value
  const sRange2 = sRange * sRange

  // Mass Magnet upgrade — derived range/strength
  const magnetLvl = sk.massMagnetLevel.value
  const magnetRange = magnetLvl > 0 ? MAGNET_BASE_RANGE + magnetLvl * MAGNET_PER_LEVEL_RANGE : 0
  const magnetRange2 = magnetRange * magnetRange
  const magnetForce = magnetLvl * MAGNET_PULL_PER_LEVEL

  syncProbes(sk.probeCount.value, sk.bigProbeCount.value)

  let inZoneCount = 0

  const list = bodies.value
  // Acceleration accumulation
  for (const b of list) {
    if (b.dead) continue
    b.ax = 0
    b.ay = 0

    // Gravity from sun. Acceleration is scaled by worldScale³ so orbital
    // VELOCITY scales linearly with viewport size — bodies cover the same
    // fraction-of-viewport-per-second on mobile / tablet / desktop. Without
    // this the smaller mobile world's bodies fly visually faster (weakly
    // bound but in a half-size world).
    const dx = cx - b.x
    const dy = cy - b.y
    const dist2 = dx * dx + dy * dy + 1
    const dist = Math.sqrt(dist2)
    const massFactor = Math.max(1, Math.sqrt(b.mass))
    const ws = worldScale.value
    const ws3 = ws * ws * ws
    const gAccel = (G * SUN_MASS * ws3) / (dist2 * massFactor)
    b.ax += (dx / dist) * gAccel
    b.ay += (dy / dist) * gAccel

    // Sun contact — bounce (Surface Tension) or ingest
    if (dist < sunR + b.radius * 0.6) {
      // Ripe bodies are MEANT to be consumed — Surface Tension only protects
      // raw bodies from accidental loss.
      const ripeAtImpact = b.cookedSeconds >= COOK_TIME
      if (b.bouncesLeft > 0 && !ripeAtImpact) {
        // Reflect velocity along outward normal, scrub speed by restitution.
        const nx = -dx / dist
        const ny = -dy / dist
        const vDotN = b.vx * nx + b.vy * ny
        if (vDotN < 0) {
          b.vx -= (1 + BOUNCE_RESTITUTION) * vDotN * nx
          b.vy -= (1 + BOUNCE_RESTITUTION) * vDotN * ny
        }
        // Push the body cleanly outside the sun so it can't re-collide next frame
        const minDist = sunR + b.radius * 0.7
        b.x = cx + (b.x - cx) / dist * minDist
        b.y = cy + (b.y - cy) / dist * minDist
        b.bouncesLeft -= 1
        b.fxFlash = 1
        sunShieldFlash.value = 1
        spawnPopup(b.x, b.y, 'BOUNCE', '#9ee6ff', 16)
        spawnParticles(b.x, b.y, 6, 200, 140, 2.5, 0.5)
        try {
          useSounds().playSound('clash-' + (1 + Math.floor(Math.random() * 5)), 0.04)
        } catch { /* ignore */
        }
        continue
      }

      // Ripe = cooked enough for the big payoff. Raw bodies give 0 heat —
      // the sun is purely destructive until you've earned ripeness.
      const isRipe = b.cookedSeconds >= COOK_TIME
      const feedMult = isRipe ? RIPE_FEED_MULT : RAW_FEED_MULT
      let award = b.sunFeedBonus * sk.fusionMultiplier.value * sk.cosmicForgeMultiplier.value * feedMult
      // Combo + flare scale ripe payouts (intentionally not raw — raw is just punishment).
      if (isRipe) {
        award *= sk.comboMultiplier.value * eventFlareMultiplier.value
      }
      if (award > 0) {
        sk.addHeat(award)
        sk.lastEarnedSplash.value = { amount: award, at: performance.now() }
      }
      const popupColor = isRipe ? '#ffd14a' : '#ff7e5f'
      const popupText = isRipe ? `+${Math.round(award)}` : 'WASTED'
      spawnPopup(b.x, b.y, popupText, popupColor, isRipe ? 28 : 18)
      triggerExplosion(b.x, b.y, 30, b.hue, isRipe ? 1.4 : 0.6)
      if (isRipe) {
        const result = sk.registerRipeFeed()
        if (result.rolledThreshold) {
          spawnPopup(b.x, b.y - 32, `COMBO ×${result.rolledThreshold}!`, '#ffe8a0', 28)
        }
      }
      b.dead = true
      b.deathReason = 'sun'
      try {
        // Big ripe payouts get a pitched-down "thud" — half-octave below for
        // award > 1000, quarter-octave for moderate ripe. Raw stays normal.
        // Cheap way to make late-game payouts feel heavier than early ones.
        const sample = 'clash-' + (1 + Math.floor(Math.random() * 5))
        const pitch = !isRipe ? 1 : (award > 1000 ? 0.7 : (award > 300 ? 0.85 : 1))
        const ratio = isRipe ? 0.06 : 0.05
        useSounds().playSound(sample, ratio, pitch)
      } catch { /* ignore */
      }
      // Star matter only on ripe consumption — keeps prestige tied to mastery
      if (isRipe && Math.random() < 0.30) sk.addStarMatter(1)
      continue
    }

    // Singularity force — pure attractive radial pull from the body to the
    // singularity. Quadratic falloff (`(1 - sd/sRange)²`) so far-but-in-range
    // bodies feel a fraction of the close-up pull.
    //
    // No tangential component — that was an unphysical hack that always
    // boosted bodies in their current sun-relative orbital direction
    // regardless of where the singularity was. The result was that placing
    // the singularity BEHIND a moving body would still speed it up, which
    // is the opposite of what real gravity does. Pure attraction means:
    // singularity ahead = body accelerates; behind = decelerates;
    // perpendicular = curves. Real physics, predictable feel.
    if (sxActive) {
      const sdx = sx - b.x
      const sdy = sy - b.y
      const sd2 = sdx * sdx + sdy * sdy + 25
      if (sd2 < sRange2) {
        const sd = Math.sqrt(sd2)
        const linearFall = 1 - sd / sRange
        const fall = Math.pow(linearFall, SINGULARITY_FALLOFF_EXPONENT)
        let f = (sForce * fall) / Math.max(20, b.mass)
        // Force TAPER inside the body's own no-go zone. Bodies that drift
        // into the singularity no longer destroy it (that was annoying); they
        // also don't amass at the centre, because the pull goes to zero as
        // sd → 0. Linear ramp keeps the transition smooth.
        const noGoR = b.radius * sk.noGoMultiplier.value
        if (sd < noGoR) f *= sd / noGoR
        b.ax += (sdx / sd) * f
        b.ay += (sdy / sd) * f
      }
    }

    // Black Hole event — strong inward pull from a transient point. Scales
    // with 1/r² like normal gravity but with a much larger constant.
    // Bodies that touch the event horizon are CONSUMED, awarding 1 star
    // matter — a sacrifice mechanic for getting rid of nuisance bodies you
    // don't want to ripen.
    if (eventBlackHoleActive.value) {
      const bhdx = eventBlackHoleX.value - b.x
      const bhdy = eventBlackHoleY.value - b.y
      const bhd2raw = bhdx * bhdx + bhdy * bhdy
      const bhd2 = bhd2raw + 60
      const bhd = Math.sqrt(bhd2)
      const bhAccel = (320_000 * worldScale.value * worldScale.value * worldScale.value) / (bhd2 * Math.max(1, b.mass))
      b.ax += (bhdx / bhd) * bhAccel
      b.ay += (bhdy / bhd) * bhAccel

      // Event horizon — physical core radius matches the visual (scaled by worldScale)
      const eventHorizon = 28 * worldScale.value + b.radius * 0.5
      if (bhd2raw < eventHorizon * eventHorizon) {
        sk.addStarMatter(1)
        spawnPopup(b.x, b.y, '+✦ matter', '#c8a8ff', 22)
        spawnParticles(b.x, b.y, 14, 280, 200, 3, 0.6)
        flashIntensity.value = Math.min(1, flashIntensity.value + 0.25)
        b.dead = true
        b.deathReason = 'eject'
        continue
      }
    }

    // Mass Magnet — asteroids are pulled toward the nearest non-asteroid body
    // and absorbed into it on contact (handled in collision pass).
    if (magnetLvl > 0 && b.kind === 'asteroid') {
      let host: CelestialBody | null = null
      let hostD2 = magnetRange2
      for (const candidate of list) {
        if (candidate === b || candidate.dead || candidate.kind === 'asteroid') continue
        const ddx = candidate.x - b.x
        const ddy = candidate.y - b.y
        const dd2 = ddx * ddx + ddy * ddy
        if (dd2 < hostD2) {
          hostD2 = dd2
          host = candidate
        }
      }
      if (host) {
        const hdx = host.x - b.x
        const hdy = host.y - b.y
        const hd = Math.sqrt(hostD2) || 1
        const fall = 1 - hd / magnetRange
        const f = (magnetForce * fall) / Math.max(8, b.mass)
        b.ax += (hdx / hd) * f
        b.ay += (hdy / hd) * f
        b.fxFlash = Math.max(b.fxFlash, 0.4)
      }
    }
  }

  // ── Probes — rope-tether stations ───────────────────────────────────────
  //
  // Each probe orbits slowly around the Sun. When idle, it sweeps for a
  // small uncaptured asteroid within rope range and ties on. While captured,
  // the asteroid is dragged to a trailing position behind the probe — its
  // motion along the orbit cooks it naturally. Once the asteroid is RIPE,
  // the probe retracts the rope and launches the asteroid Sunward; the
  // resulting ripe consume chains into the player's combo.
  if (probes.value.length > 0) {
    // Refresh probe orbit radius from the current worldScale so probes
    // adapt to viewport resizes (mobile rotation, window resize). Without
    // this, probes spawned at one scale stay stuck at that radius and end
    // up either off-screen or stacked on the sun after a viewport change.
    for (const probe of probes.value) {
      const factor = probe.tier === 'big' ? BIG_PROBE_ORBIT_RADIUS_FACTOR : PROBE_ORBIT_RADIUS_FACTOR
      probe.orbitRadius = SUN_BASE_RADIUS * factor * worldScale.value
    }
    for (const probe of probes.value) {
      probe.angle += probe.speed * dt
      probe.pulseT += dt
      const probeX = cx + Math.cos(probe.angle) * probe.orbitRadius
      const probeY = cy + Math.sin(probe.angle) * probe.orbitRadius

      // Validate captured body — body might have died (consumed, collision,
      // ejected). If so, drop the rope.
      let captured: CelestialBody | null = null
      if (probe.capturedId !== null) {
        for (const b of list) {
          if (b.id === probe.capturedId && !b.dead) {
            captured = b
            break
          }
        }
        if (!captured) probe.capturedId = null
      }

      if (captured) {
        // Body is ripe → retract rope and launch the asteroid Sunward.
        if (captured.cookedSeconds >= COOK_TIME) {
          const ldx = cx - captured.x
          const ldy = cy - captured.y
          const ld = Math.sqrt(ldx * ldx + ldy * ldy) || 1
          captured.vx = (ldx / ld) * PROBE_LAUNCH_SPEED
          captured.vy = (ldy / ld) * PROBE_LAUNCH_SPEED
          probe.capturedId = null
          spawnPopup(captured.x, captured.y - captured.radius * 2.2, 'LAUNCHED!', '#9eddff', 18)
          spawnParticles(probeX, probeY, 10, 200, 220, 3, 0.55)
          continue
        }

        // Force the captured asteroid into a TRUE orbit at the probe's
        // radius. The rope conceptually keeps it in the safe orbit; the
        // probe's slow visual angular speed is decoupled from the
        // asteroid's actual orbital motion. This way the asteroid moves at
        // proper orbital speed (~150–180 px/s), cooks fast, and ripens in
        // a few seconds instead of half a minute.
        const bdx = captured.x - cx
        const bdy = captured.y - cy
        let bd = Math.sqrt(bdx * bdx + bdy * bdy) || 1
        // Soft pull toward probe's orbit radius (capped per-frame correction)
        const radiusError = bd - probe.orbitRadius
        const radCorrRate = 4 // 1/s
        const radDelta = Math.max(-50 * dt, Math.min(50 * dt, -radiusError * radCorrRate * dt))
        captured.x += (bdx / bd) * radDelta
        captured.y += (bdy / bd) * radDelta
        // Recompute outward unit normal & tangent after the radial nudge
        const ndx = captured.x - cx
        const ndy = captured.y - cy
        const nd = Math.sqrt(ndx * ndx + ndy * ndy) || 1
        const tx = -ndy / nd  // CCW tangent
        const ty = ndx / nd
        // Match existing orbital direction (CCW vs CW)
        const currentVTangent = captured.vx * tx + captured.vy * ty
        const dir = currentVTangent >= 0 ? 1 : -1
        // Orbital speed at current radius for this body's mass — uses the
        // same worldScale³ factor as sun gravity so the asteroid's velocity
        // stays matched to actual gravity.
        const massFactor = Math.max(1, Math.sqrt(captured.mass))
        const wsc = worldScale.value
        const ws3c = wsc * wsc * wsc
        const gAccel = (G * SUN_MASS * ws3c) / (nd * nd * massFactor)
        const vOrbit = Math.sqrt(gAccel * nd)
        captured.vx = tx * vOrbit * dir
        captured.vy = ty * vOrbit * dir
        continue
      }

      // No capture — sweep for the nearest catchable body in rope range.
      // Big probes have a wider rope and can catch mid-size bodies; small
      // probes are limited to small asteroids (the existing rule).
      const isBig = probe.tier === 'big'
      const ropeRange = isBig ? BIG_PROBE_ROPE_RANGE : PROBE_ROPE_RANGE
      const ropeRange2 = ropeRange * ropeRange
      const massLimit = isBig ? BIG_PROBE_CATCH_MAX_MASS : PROBE_CATCH_MAX_MASS
      let bestId = -1
      let bestD2 = ropeRange2
      for (const b of list) {
        if (b.dead || b.isComet) continue
        // Small probes only catch asteroids; big probes accept anything
        // small enough by mass.
        if (!isBig && b.kind !== 'asteroid') continue
        if (b.mass > massLimit) continue
        if (!isBig && b.radius > PROBE_CATCH_MAX_RADIUS) continue
        if (b.cookedSeconds >= COOK_TIME) continue
        let already = false
        for (const other of probes.value) {
          if (other.capturedId === b.id) {
            already = true
            break
          }
        }
        if (already) continue
        const ddx = b.x - probeX
        const ddy = b.y - probeY
        const dd2 = ddx * ddx + ddy * ddy
        if (dd2 < bestD2) {
          bestD2 = dd2
          bestId = b.id
        }
      }
      if (bestId !== -1) {
        probe.capturedId = bestId
        spawnParticles(probeX, probeY, isBig ? 6 : 4, 200, 110, 2.5, 0.4)
      }
    }
  }

  // ── Comet catch ─────────────────────────────────────────────────────────
  // Run AFTER the force loop so the singularity sees this frame's body
  // positions. Comets are caught when the active singularity's centre comes
  // within catch range — proximity-based, no grab needed. Non-comet bodies
  // that drift into the singularity's no-go zone are NOT destroyed; the
  // attractive force is tapered to zero in that region (see force loop) so
  // they coast through and curve away instead of amassing.
  if (singularityActive.value) {
    for (const b of list) {
      if (b.dead || !b.isComet || b.cometCaught) continue
      const sdx = singularityX.value - b.x
      const sdy = singularityY.value - b.y
      const sd2 = sdx * sdx + sdy * sdy
      const catchR = b.radius + 36
      if (sd2 < catchR * catchR) {
        b.cometCaught = true
        b.isComet = false
        const heatReward = 200 * sk.fusionMultiplier.value * sk.cosmicForgeMultiplier.value
        sk.addHeat(heatReward)
        sk.addStarMatter(1)
        sk.lastEarnedSplash.value = { amount: heatReward, at: performance.now() }
        sk.registerCometCaught()
        spawnPopup(b.x, b.y - b.radius * 2.2, `COMET! +${Math.round(heatReward)}`, '#9eddff', 26)
        spawnParticles(b.x, b.y, 14, 200, 220, 4, 0.7)
        flashIntensity.value = Math.min(1, flashIntensity.value + 0.4)
      }
    }
  }

  // Body-body collisions (pairwise, simple O(n²) — n is capped at MAX_BODIES)
  const len = list.length
  for (let i = 0; i < len; i++) {
    const a = list[i]!
    if (a.dead) continue
    for (let j = i + 1; j < len; j++) {
      const b = list[j]!
      if (b.dead) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const r = a.radius + b.radius
      const d2 = dx * dx + dy * dy
      if (d2 < r * r && d2 > 0.001) {
        const d = Math.sqrt(d2)
        const overlap = r - d
        const nx = dx / d
        const ny = dy / d
        // Velocity along normal
        const rvx = b.vx - a.vx
        const rvy = b.vy - a.vy
        const vn = rvx * nx + rvy * ny
        if (vn < 0) {
          const bothAsteroids = a.kind === 'asteroid' && b.kind === 'asteroid'
          const oneAsteroid = (a.kind === 'asteroid') !== (b.kind === 'asteroid')
          // Mass Magnet: asteroid + non-asteroid → snap-merge (no boom)
          if (oneAsteroid && magnetLvl > 0) {
            const asteroid = a.kind === 'asteroid' ? a : b
            const host = asteroid === a ? b : a
            const cx2 = (a.x + b.x) / 2
            const cy2 = (a.y + b.y) / 2
            host.mass = Math.min(160, host.mass + asteroid.mass * 0.6)
            host.radius = Math.min(40, host.radius + 0.5)
            host.vx += (asteroid.vx * asteroid.mass / host.mass) * 0.4
            host.vy += (asteroid.vy * asteroid.mass / host.mass) * 0.4
            host.fxFlash = 1
            asteroid.dead = true
            asteroid.deathReason = 'collide'
            spawnParticles(cx2, cy2, 6, host.hue, 90, 2, 0.4)
            spawnPopup(cx2, cy2, '+merge', '#9eddff', 14)
            // Slim consolation heat for the absorbed body
            sk.addHeat(asteroid.sunFeedBonus * 0.4)
            break
          }
          if (bothAsteroids) {
            const restitution = 0.7
            const invSum = 1 / a.mass + 1 / b.mass
            const impulse = -(1 + restitution) * vn / invSum
            const ix = impulse * nx
            const iy = impulse * ny
            a.vx -= ix / a.mass
            a.vy -= iy / a.mass
            b.vx += ix / b.mass
            b.vy += iy / b.mass
            // Push apart, mass-weighted (heavier asteroid moves less)
            const aShare = (1 / a.mass) / invSum
            const bShare = (1 / b.mass) / invSum
            a.x -= nx * overlap * aShare
            a.y -= ny * overlap * aShare
            b.x += nx * overlap * bShare
            b.y += ny * overlap * bShare
          } else {
            // Mass-aware collision response, biased heavily toward "big body
            // wins". A small body should never destroy a big one — that's
            // not how cosmic collisions feel.
            //
            // - Heavy disparity (ratio ≥ HEAVY_DISPARITY_RATIO, currently 2.5):
            //   small body bounces off; large body barely moves; no destruction
            //   on either side. Position correction is mass-weighted so the
            //   heavy body really does just sit there.
            // - Near-equal masses + very high closing speed: both destroyed.
            //   The threshold is intentionally high (320 px/s) so it only
            //   triggers on real ram-jobs, never glancing nudges.
            // - Near-equal masses + moderate speed: smaller breaks, larger
            //   absorbs a fraction of mass + momentum.
            const HEAVY_DISPARITY_RATIO = 2.5
            const HIGH_IMPACT_SPEED = 320
            const smaller = a.mass <= b.mass ? a : b
            const larger = smaller === a ? b : a
            const ratio = larger.mass / Math.max(1, smaller.mass)
            const closingSpeed = Math.abs(vn)
            const cx2 = (a.x + b.x) / 2
            const cy2 = (a.y + b.y) / 2

            if (ratio >= HEAVY_DISPARITY_RATIO) {
              // Heavy disparity — elastic bounce with MASS-WEIGHTED position
              // correction. Without the weighting, a 50/50 overlap split
              // would shove a gas giant the same distance as the asteroid
              // hitting it, which feels wrong. Inverse-mass weighting moves
              // the lighter body almost all of the overlap distance.
              const restitution = 0.5
              const invSum = 1 / a.mass + 1 / b.mass
              const impulse = -(1 + restitution) * vn / invSum
              const ix = impulse * nx
              const iy = impulse * ny
              a.vx -= ix / a.mass
              a.vy -= iy / a.mass
              b.vx += ix / b.mass
              b.vy += iy / b.mass
              const aShare = (1 / a.mass) / invSum
              const bShare = (1 / b.mass) / invSum
              a.x -= nx * overlap * aShare
              a.y -= ny * overlap * aShare
              b.x += nx * overlap * bShare
              b.y += ny * overlap * bShare
              spawnParticles(cx2, cy2, 4, smaller.hue, 90, 2, 0.3)
            } else if (closingSpeed >= HIGH_IMPACT_SPEED) {
              // Catastrophic — both bodies destroyed when similar-sized
              // bodies ram each other at speed. Threshold is high so this
              // is a real "I saw that coming" moment, not a surprise.
              triggerExplosion(cx2, cy2, a.hue, b.hue, 1.7)
              a.dead = true
              a.deathReason = 'collide'
              b.dead = true
              b.deathReason = 'collide'
              sk.addHeat((a.sunFeedBonus + b.sunFeedBonus) * 0.2)
              spawnPopup(cx2, cy2, 'SHATTER!', '#ff7e5f', 22)
              try {
                useSounds().playSound('explosion-1', 0.07)
              } catch { /* ignore */
              }
              break
            } else {
              // Moderate impact between near-equals — smaller breaks, larger
              // absorbs a fraction of mass + momentum.
              triggerExplosion(cx2, cy2, smaller.hue, larger.hue, 1.1)
              larger.mass = Math.min(140, larger.mass + smaller.mass * 0.3)
              larger.radius = Math.min(40, larger.radius * 1.04)
              larger.vx += (smaller.vx * smaller.mass / larger.mass) * 0.25
              larger.vy += (smaller.vy * smaller.mass / larger.mass) * 0.25
              smaller.dead = true
              smaller.deathReason = 'collide'
              sk.addHeat(smaller.sunFeedBonus * 0.25)
              spawnPopup(cx2, cy2, '+lost', '#ff7e5f', 18)
              try {
                useSounds().playSound('explosion-1', 0.05)
              } catch { /* ignore */
              }
              break
            }
          }
        }
      }
    }
  }

  // Integration + per-frame state
  for (const b of list) {
    if (b.dead) continue

    if (!b.grabbed) {
      b.vx += b.ax * dt
      b.vy += b.ay * dt
      // Soft velocity cap
      const sp = Math.hypot(b.vx, b.vy)
      const maxSp = 480
      if (sp > maxSp) {
        b.vx *= maxSp / sp
        b.vy *= maxSp / sp
      }
      b.x += b.vx * dt
      b.y += b.vy * dt
    } else {
      // Grabbed bodies follow singularity but with damped lag
      const dx = singularityX.value - b.x
      const dy = singularityY.value - b.y
      b.vx = dx * 9
      b.vy = dy * 9
      b.x += b.vx * dt
      b.y += b.vy * dt
    }
    b.rotation += b.rotationSpeed * dt
    b.age += dt

    // Trail
    b.trail[b.trailHead * 2] = b.x
    b.trail[b.trailHead * 2 + 1] = b.y
    b.trailHead = (b.trailHead + 1) % TRAIL_LENGTH

    // Bounds — anything outside the world (with padding) gets ejected
    const maxX = worldWidth.value + WORLD_PADDING
    const maxY = worldHeight.value + WORLD_PADDING
    if (b.x < -WORLD_PADDING || b.x > maxX || b.y < -WORLD_PADDING || b.y > maxY) {
      b.dead = true
      b.deathReason = 'eject'
      continue
    }

    // Heat-zone detection — both the regular ring and the inner Close-to-Sun
    // band count as "cooking" zones. Close-zone bodies cook faster (×1.3
    // bonus on the speed-derived factor) and start earning sooner (2s
    // warmup vs 3s); the warmup is enforced in the heat-tick loop below.
    const dx2 = b.x - cx
    const dy2 = b.y - cy
    const distFromSun = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    b.inHeatZone = distFromSun >= zoneInner && distFromSun <= zoneOuter
    b.inCloseZone = distFromSun >= closeInner && distFromSun < closeOuter
    const inAnyZone = b.inHeatZone || b.inCloseZone
    if (inAnyZone) {
      // Speed-weighted ripening — a fast body ripens quickly; a held-still
      // body barely progresses. Close zone applies a 30% bonus on top.
      const speed = Math.hypot(b.vx, b.vy)
      let factor = speed / RIPEN_REF_SPEED
      if (factor < RIPEN_MIN_FACTOR) factor = RIPEN_MIN_FACTOR
      else if (factor > RIPEN_MAX_FACTOR) factor = RIPEN_MAX_FACTOR
      if (b.inCloseZone) factor *= CLOSE_ZONE_COOK_BONUS
      const prevCooked = b.cookedSeconds
      b.cookedSeconds += dt * factor
      // Crowd bonus counts ALL cooking bodies — close-zone flybys help.
      if (!b.grabbed) inZoneCount++
      if (prevCooked < COOK_TIME && b.cookedSeconds >= COOK_TIME) {
        b.fxFlash = 1
        spawnPopup(b.x, b.y - b.radius * 1.6, 'RIPE!', '#ffd14a', 18)
      }
    } else {
      b.cookedSeconds = Math.max(0, b.cookedSeconds - dt * 1.5)
    }

    if (b.fxFlash > 0) b.fxFlash = Math.max(0, b.fxFlash - dt * 1.6)
    // Legacy field, kept so existing render glow logic still has a smooth signal:
    b.orbitStability = Math.min(1, b.cookedSeconds / COOK_TIME)
    b.stableSeconds = b.cookedSeconds
  }

  orbitingCount.value = inZoneCount
  crowdBonusActive.value = inZoneCount >= CROWD_BONUS_THRESHOLD
  let ripe = 0
  for (const b of list) if (!b.dead && b.cookedSeconds >= COOK_TIME) ripe++
  ripeCount.value = ripe

  // Heat Zone tick — pays out twice per second to feel snappier than the
  // old once-per-second pulse. 3+ bodies in the ring trigger the crowd
  // multiplier so the player has a clear "stack the ring" goal.
  // Bodies must complete a 3-second warm-up in the zone before any heat is
  // earned — this prevents drive-by sweeps and rewards committed orbits.
  heatTickAccum += dt
  if (heatTickAccum >= ZONE_TICK_SECONDS) {
    heatTickAccum -= ZONE_TICK_SECONDS
    const crowd = inZoneCount >= CROWD_BONUS_THRESHOLD ? CROWD_MULT : 1
    const flare = eventFlareMultiplier.value
    const combo = sk.comboMultiplier.value
    let earned = 0
    for (const b of bodies.value) {
      if (b.dead || b.grabbed) continue
      const inAnyZone = b.inHeatZone || b.inCloseZone
      if (!inAnyZone) continue
      // Close zone uses a shorter warmup (2s) than the regular zone (3s).
      const warmup = b.inCloseZone ? CLOSE_ZONE_WARMUP : ZONE_WARMUP
      if (b.cookedSeconds < warmup) continue
      if (b.zoneHeatTicks >= ZONE_HEAT_TICKS_MAX) continue
      // Hard-cap passive zone heat at 1 per body per tick. Real reward is
      // the ripe sun-feed.
      const raw = b.yieldRate * (ZONE_BASE_HEAT_PER_SEC * ZONE_TICK_SECONDS)
        * sk.fusionMultiplier.value * sk.cosmicForgeMultiplier.value * crowd * flare * combo
      const tickHeat = Math.min(1, raw)
      earned += tickHeat
      b.zoneHeatTicks += 1
      if (Math.random() < 0.20) {
        const colour = b.inCloseZone ? '#ff6a3d'
          : flare > 1 ? '#ff6a3d' : (combo > 1 ? '#ffe8a0' : (crowd > 1 ? '#ffb347' : '#9eddff'))
        spawnPopup(b.x, b.y - b.radius * 1.6, `+${tickHeat.toFixed(1)}`, colour, 13)
      }
    }
    if (earned > 0) sk.addHeat(earned)
  }

  // Particles
  const parts = particles.value
  let w = 0
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!
    p.life += dt
    if (p.life >= p.maxLife) continue
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 0.985
    p.vy *= 0.985
    p.alpha = 1 - p.life / p.maxLife
    parts[w++] = p
  }
  parts.length = w

  // Popups
  const pops = popups.value
  let pw = 0
  for (let i = 0; i < pops.length; i++) {
    const p = pops[i]!
    p.life += dt
    if (p.life >= p.maxLife) continue
    p.y += p.vy * dt
    p.vy *= 0.96
    pops[pw++] = p
  }
  pops.length = pw

  // Body compaction
  let bw = 0
  for (let i = 0; i < list.length; i++) {
    const cand = list[i]!
    if (!cand.dead) list[bw++] = cand
  }
  list.length = bw

  // Pulse / shake / shield decay
  sunPulse.value += dt
  if (screenShake.value > 0) screenShake.value = Math.max(0, screenShake.value - dt * 30)
  if (flashIntensity.value > 0) flashIntensity.value = Math.max(0, flashIntensity.value - dt * 1.6)
  if (sunShieldFlash.value > 0) sunShieldFlash.value = Math.max(0, sunShieldFlash.value - dt * 1.8)

  // Stage advance celebration — fires once per stage transition. The
  // sun-palette swap already happens automatically via sunSkinTier; this
  // adds the player-feedback layer on top.
  if (sk.stageJustAdvancedAt.value > lastFiredStageAdvanceAt) {
    lastFiredStageAdvanceAt = sk.stageJustAdvancedAt.value
    const cxr = worldCenterX.value
    const cyr = worldCenterY.value
    spawnPopup(cxr, cyr - 90, `STAGE ${sk.state.value.stage}!`, '#ffd14a', 36)
    spawnPopup(cxr, cyr - 50, sk.stageTypeName.value, '#ffe8a0', 22)
    spawnParticles(cxr, cyr, 36, 60, 320, 5, 1.2)
    spawnParticles(cxr, cyr, 18, 220, 220, 4, 0.8)
    flashIntensity.value = Math.min(1, flashIntensity.value + 0.7)
    screenShake.value = Math.min(20, screenShake.value + 8)
    try {
      useSounds().playSound('level-up', 0.08)
    } catch { /* ignore */
    }
  }

  sessionTime.value += dt
}

// ─── Spawner driver ────────────────────────────────────────────────────────
//
// Spawn rate is a constant cadence — pacing is now driven by how well the
// player herds bodies into the Heat Zone, not by purchasing more spawns.
// Mass Magnet upgrade consumes asteroids quickly, so high levels boost the
// asteroid weighting slightly to keep the magnet feeling busy.

const SPAWN_INTERVAL = 1.3
let spawnAccum = 0
const driveSpawning = (dt: number) => {
  if (tutorialMode.value) return
  spawnAccum += dt
  if (spawnAccum >= SPAWN_INTERVAL) {
    spawnAccum = 0
    const magnetTilt = Math.min(0.25, sk.massMagnetLevel.value * 0.05)
    const r = Math.random()
    let kind: BodyKind = 'asteroid'
    if (r < 0.45 + magnetTilt) kind = 'asteroid'
    else if (r < 0.78) kind = 'rocky'
    else if (r < 0.92) kind = 'ice'
    else if (r < 0.985) kind = 'gas'
    else kind = 'jewel'
    spawnBody(kind)
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

const initWorld = (w: number, h: number) => {
  worldWidth.value = w
  worldHeight.value = h
  bodies.value.length = 0
  particles.value.length = 0
  popups.value.length = 0
  spawnAccum = 0
  heatTickAccum = 0
  // Seed scene with a ring of asteroids drifting in (skipped during tutorial)
  if (!tutorialMode.value) {
    for (let i = 0; i < 5; i++) spawnBody('asteroid')
    spawnBody('rocky')
  }
}

const clearWorld = () => {
  bodies.value.length = 0
  particles.value.length = 0
  popups.value.length = 0
  spawnAccum = 0
  heatTickAccum = 0
}

const spawnAt = (
  kind: BodyKind,
  x: number,
  y: number,
  vx = 0,
  vy = 0
): CelestialBody | null => {
  const body = spawnBody(kind, { x, y })
  if (body) {
    body.vx = vx
    body.vy = vy
  }
  return body
}

const tick = (dt: number) => {
  const clamped = Math.min(0.05, dt) // clamp big frame jumps
  try {
    physicsStep(clamped)
    driveSpawning(clamped)
  } catch (e) {
    console.error('[sol-keeper physics]', e)
  }
}

const findBodyAt = (x: number, y: number): CelestialBody | null => {
  let best: CelestialBody | null = null
  let bestD = Infinity
  for (const b of bodies.value) {
    if (b.dead) continue
    const dx = b.x - x
    const dy = b.y - y
    const d2 = dx * dx + dy * dy
    const r = b.radius + 18
    if (d2 < r * r && d2 < bestD) {
      best = b
      bestD = d2
    }
  }
  return best
}

const setSingularity = (active: boolean, x = 0, y = 0) => {
  singularityActive.value = active
  if (active) {
    singularityX.value = x
    singularityY.value = y
  }
  if (!active) {
    // Release any grabbed bodies on lift
    for (const b of bodies.value) b.grabbed = false
  }
}

const updateSingularity = (x: number, y: number) => {
  singularityX.value = x
  singularityY.value = y
}

const grabNearestBody = (x: number, y: number): CelestialBody | null => {
  const target = findBodyAt(x, y)
  if (!target) return null
  target.grabbed = true
  return target
}

// Reject taps that would put the singularity inside (or within the safe-zone
// of) a body. Safe-zone is RADIUS-PROPORTIONAL — small bodies need only a
// little space around them, big planets need a lot. Comets are exempt —
// catching a comet means dropping the singularity right on it.
const canCreateSingularityAt = (x: number, y: number): boolean => {
  const mult = sk.noGoMultiplier.value
  for (const b of bodies.value) {
    if (b.dead || b.isComet) continue
    const dx = b.x - x
    const dy = b.y - y
    const d = Math.hypot(dx, dy)
    if (d < b.radius * mult) return false
  }
  return true
}

const sunRadius = computed(() => computeSunRadius())
const heatZoneInner = computed(() => computeZoneInner())
export const heatZoneOuter = computed(() => computeZoneOuter())
const closeZoneInner = computed(() => computeCloseZoneInner())
const closeZoneOuter = computed(() => computeCloseZoneOuter())
const singularityRange = computed(() => SINGULARITY_RANGE * worldScale.value * sk.attractionRadius.value)

export const COOK_TIME_SECONDS = COOK_TIME
export const ZONE_WARMUP_SECONDS = ZONE_WARMUP
export const CROWD_THRESHOLD = CROWD_BONUS_THRESHOLD
export const RIPEN_REFERENCE_SPEED = RIPEN_REF_SPEED

export default function useGravityPhysics() {
  return {
    bodies,
    particles,
    popups,
    orbitingCount,
    ripeCount,
    totalCollisions,
    sessionTime,
    sunPulse,
    screenShake,
    flashIntensity,
    sunShieldFlash,
    crowdBonusActive,
    tutorialMode,
    sunRadius,
    heatZoneInner,
    heatZoneOuter,
    closeZoneInner,
    closeZoneOuter,
    singularityRange,
    initWorld,
    clearWorld,
    spawnAt,
    tick,
    setSingularity,
    updateSingularity,
    grabNearestBody,
    canCreateSingularityAt,
    spawnAsteroidBurst,
    findBodyAt
  }
}
