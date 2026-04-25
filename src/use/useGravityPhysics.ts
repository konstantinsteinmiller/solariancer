import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { BodyKind, CelestialBody, Particle, ScorePopup } from '@/types/solkeeper'
import useSolKeeper from '@/use/useSolKeeper'
import useSounds from '@/use/useSound'

// ─── Constants ─────────────────────────────────────────────────────────────
const G = 1700              // gravitational constant (game units)
const SUN_BASE_RADIUS = 64  // logical sun radius
const SUN_MASS = 5000
const MAX_BODIES = 24
const MAX_PARTICLES = 220
const MAX_POPUPS = 28
const TRAIL_LENGTH = 16     // ring buffer entries (each is x,y => 2 floats)
const WORLD_PADDING = 80
const ORBIT_TIME_FOR_TICK = 1.0 // seconds of stable orbit per heat tick
const SINGULARITY_RANGE = 360  // pixel range of pull effect
const SINGULARITY_BASE_FORCE = 9000

let bodyIdSeq = 1

// World extent — set by the renderer based on canvas size
export const worldWidth = ref(800)
export const worldHeight = ref(600)
export const worldCenterX = computed(() => worldWidth.value / 2)
export const worldCenterY = computed(() => worldHeight.value / 2)

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
export const orbitingCount = ref(0)
export const totalCollisions = ref(0)
export const sessionTime = ref(0)

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
      return { mass: 22, radiusMin: 12, radiusMax: 18, yieldRate: 1.6, feedBonus: 14, hueMin: 12, hueMax: 35 }
    case 'gas':
      return { mass: 60, radiusMin: 22, radiusMax: 32, yieldRate: 4.8, feedBonus: 50, hueMin: 180, hueMax: 280 }
    case 'ice':
      return { mass: 32, radiusMin: 14, radiusMax: 22, yieldRate: 2.4, feedBonus: 22, hueMin: 185, hueMax: 215 }
    case 'jewel':
      return { mass: 16, radiusMin: 10, radiusMax: 14, yieldRate: 6.0, feedBonus: 80, hueMin: 280, hueMax: 340 }
  }
}

// ─── Spawning ──────────────────────────────────────────────────────────────

const randRange = (a: number, b: number) => a + Math.random() * (b - a)

const spawnBody = (kind: BodyKind, opts?: { fromEdge?: boolean; x?: number; y?: number }) => {
  if (bodies.value.length >= MAX_BODIES) return null
  const params = kindParams(kind)
  const radius = randRange(params.radiusMin, params.radiusMax)
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
    const speed = randRange(40, 95)
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

// ─── Probe (automation) ────────────────────────────────────────────────────

interface Probe {
  angle: number;
  orbitRadius: number;
  speed: number;
  pulseT: number
}

export const probes: Ref<Probe[]> = ref([])

const syncProbes = (count: number) => {
  while (probes.value.length < count) {
    probes.value.push({
      angle: Math.random() * Math.PI * 2,
      orbitRadius: SUN_BASE_RADIUS * 2.4,
      speed: randRange(0.7, 1.1),
      pulseT: 0
    })
  }
  while (probes.value.length > count) probes.value.pop()
}

// ─── Physics integration ───────────────────────────────────────────────────

const sk = useSolKeeper()

const computeSunRadius = () => SUN_BASE_RADIUS * sk.sunRadiusBonus.value

let heatTickAccum = 0

const physicsStep = (dt: number) => {
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  const sunR = computeSunRadius()
  const sunR2 = sunR * sunR
  const orbitMax = Math.min(worldWidth.value, worldHeight.value) * 0.45 * sk.attractionRadius.value
  const sxActive = singularityActive.value
  const sx = singularityX.value
  const sy = singularityY.value
  const sForce = SINGULARITY_BASE_FORCE * sk.singularityPower.value
  const sRange = SINGULARITY_RANGE * sk.attractionRadius.value
  const sRange2 = sRange * sRange

  syncProbes(sk.probeCount.value)

  let orbiting = 0

  const list = bodies.value
  // Acceleration accumulation
  for (const b of list) {
    if (b.dead) continue
    b.ax = 0
    b.ay = 0

    // Gravity from sun
    const dx = cx - b.x
    const dy = cy - b.y
    const dist2 = dx * dx + dy * dy + 1
    const dist = Math.sqrt(dist2)
    const gAccel = (G * SUN_MASS) / (dist2 * Math.max(1, b.mass))
    b.ax += (dx / dist) * gAccel
    b.ay += (dy / dist) * gAccel

    // Sun ingestion
    if (dist < sunR + b.radius * 0.6) {
      // Awarded heat = base feed × fusion mult, scaled by stability bonus
      const stableMult = 1 + Math.min(1, b.stableSeconds / 5) * 0.5
      const award = b.sunFeedBonus * sk.fusionMultiplier.value * stableMult
      sk.addHeat(award)
      sk.lastEarnedSplash.value = { amount: award, at: performance.now() }
      spawnPopup(b.x, b.y, `+${Math.round(award)}`, '#ffd14a', 26)
      triggerExplosion(b.x, b.y, 30, b.hue, 1.0)
      b.dead = true
      b.deathReason = 'sun'
      try {
        useSounds().playSound('clash-' + (1 + Math.floor(Math.random() * 5)), 0.05)
      } catch { /* ignore */
      }
      // Star matter at milestones
      if (Math.random() < 0.18) sk.addStarMatter(1)
      continue
    }

    // Singularity force
    if (sxActive) {
      const sdx = sx - b.x
      const sdy = sy - b.y
      const sd2 = sdx * sdx + sdy * sdy + 25
      if (sd2 < sRange2) {
        const sd = Math.sqrt(sd2)
        // Inverse-distance attraction, capped near zero so we don't tear
        // through the body.
        const fall = 1 - sd / sRange
        const f = (sForce * fall) / Math.max(20, b.mass)
        b.ax += (sdx / sd) * f
        b.ay += (sdy / sd) * f
      }
    }

    // Probe correction — every probe pushes the most-eccentric nearby body
    // tangentially to round its orbit. Cheap pass: each probe does a tiny
    // tangential nudge to all bodies it can "see".
    for (const probe of probes.value) {
      const px = cx + Math.cos(probe.angle) * probe.orbitRadius
      const py = cy + Math.sin(probe.angle) * probe.orbitRadius
      const pdx = px - b.x
      const pdy = py - b.y
      const pd2 = pdx * pdx + pdy * pdy + 1
      if (pd2 < 26000) {
        const pd = Math.sqrt(pd2)
        // Tangent direction relative to sun
        const tx = -dy / dist
        const ty = dx / dist
        // Aim velocity toward circular speed at this radius
        const targetSpeed = Math.sqrt((G * SUN_MASS) / dist)
        const speed = Math.hypot(b.vx, b.vy) + 0.001
        const speedDelta = (targetSpeed - speed) * 0.35
        const correction = (1 - pd / 160) * 0.6
        b.ax += tx * speedDelta * correction
        b.ay += ty * speedDelta * correction
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
          // Inelastic-ish bounce when grabbed; otherwise full destruction for
          // the smaller of the two — looks "juicy" while preserving
          // momentum-rich orbits the player set up. Both small (asteroids)
          // bounce harmlessly.
          const isSmall = a.kind === 'asteroid' && b.kind === 'asteroid'
          if (isSmall) {
            const restitution = 0.7
            const impulse = -(1 + restitution) * vn / (1 / a.mass + 1 / b.mass)
            const ix = impulse * nx
            const iy = impulse * ny
            a.vx -= ix / a.mass
            a.vy -= iy / a.mass
            b.vx += ix / b.mass
            b.vy += iy / b.mass
            // Push apart
            a.x -= nx * overlap * 0.5
            a.y -= ny * overlap * 0.5
            b.x += nx * overlap * 0.5
            b.y += ny * overlap * 0.5
          } else {
            // Catastrophic — smaller body explodes; larger absorbs a small
            // fraction of momentum and a tiny radius add. Score popup the
            // catastrophe so the player can see it.
            const smaller = a.mass <= b.mass ? a : b
            const larger = smaller === a ? b : a
            const cx2 = (a.x + b.x) / 2
            const cy2 = (a.y + b.y) / 2
            triggerExplosion(cx2, cy2, smaller.hue, larger.hue, 1.4)
            // Larger may absorb 30% of mass
            larger.mass = Math.min(140, larger.mass + smaller.mass * 0.3)
            larger.radius = Math.min(40, larger.radius * 1.04)
            // Velocity transfer
            larger.vx += (smaller.vx * smaller.mass / larger.mass) * 0.25
            larger.vy += (smaller.vy * smaller.mass / larger.mass) * 0.25
            smaller.dead = true
            smaller.deathReason = 'collide'
            // Tiny consolation heat for catastrophes
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

    // Orbit stability detection — distance + tangential speed approx
    const dx2 = b.x - cx
    const dy2 = b.y - cy
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    if (dist2 > sunR + 8 && dist2 < orbitMax) {
      const tx = -dy2 / dist2
      const ty = dx2 / dist2
      const tangentialSpeed = b.vx * tx + b.vy * ty
      const radialSpeed = Math.abs((b.vx * dx2 + b.vy * dy2) / dist2)
      // Stable when tangential dominant and reasonable speed
      const targetSp = Math.sqrt((G * SUN_MASS) / Math.max(1, dist2))
      const closeness = 1 - Math.min(1, Math.abs(tangentialSpeed - targetSp) / Math.max(40, targetSp * 0.5))
      const tangencyRatio = Math.abs(tangentialSpeed) / (Math.abs(tangentialSpeed) + radialSpeed + 1)
      const score = Math.max(0, closeness * tangencyRatio)
      b.orbitStability = b.orbitStability * 0.92 + score * 0.08
    } else {
      b.orbitStability *= 0.9
    }

    if (b.orbitStability > 0.55 && !b.grabbed) {
      orbiting++
      b.stableSeconds += dt
    } else {
      b.stableSeconds = Math.max(0, b.stableSeconds - dt * 0.5)
    }
  }

  // Heat tick from passive orbits
  heatTickAccum += dt
  if (heatTickAccum >= ORBIT_TIME_FOR_TICK) {
    heatTickAccum -= ORBIT_TIME_FOR_TICK
    let earned = 0
    for (const b of bodies.value) {
      if (b.dead || b.grabbed) continue
      if (b.orbitStability > 0.55) {
        const tickHeat = b.yieldRate * sk.fusionMultiplier.value
        earned += tickHeat
        // small popup occasionally so it doesn't spam
        if (Math.random() < 0.35) {
          spawnPopup(b.x, b.y - b.radius * 1.6, `+${tickHeat.toFixed(1)}`, '#9eddff', 14)
        }
      }
    }
    if (earned > 0) sk.addHeat(earned)
  }

  // Probes update
  for (const p of probes.value) {
    p.angle += p.speed * dt
    p.pulseT += dt
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

  orbitingCount.value = orbiting

  // Pulse / shake decay
  sunPulse.value += dt
  if (screenShake.value > 0) screenShake.value = Math.max(0, screenShake.value - dt * 30)
  if (flashIntensity.value > 0) flashIntensity.value = Math.max(0, flashIntensity.value - dt * 1.6)

  sessionTime.value += dt
}

// ─── Spawner driver ────────────────────────────────────────────────────────

let spawnAccum = 0
const driveSpawning = (dt: number) => {
  spawnAccum += dt
  // Spawning rate scales with orbit capacity bonus
  const targetRate = 1.4 - Math.min(1.0, sk.orbitCapacityBonus.value * 0.05)
  if (spawnAccum >= targetRate) {
    spawnAccum = 0
    // pick kind by weighted distribution
    const r = Math.random()
    let kind: BodyKind = 'asteroid'
    if (r < 0.45) kind = 'asteroid'
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
  // Seed scene with a ring of asteroids drifting in
  for (let i = 0; i < 5; i++) spawnBody('asteroid')
  spawnBody('rocky')
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

const sunRadius = computed(() => computeSunRadius())

export default function useGravityPhysics() {
  return {
    bodies,
    particles,
    popups,
    probes,
    orbitingCount,
    totalCollisions,
    sessionTime,
    sunPulse,
    screenShake,
    flashIntensity,
    sunRadius,
    initWorld,
    tick,
    setSingularity,
    updateSingularity,
    grabNearestBody,
    spawnAsteroidBurst,
    findBodyAt
  }
}
