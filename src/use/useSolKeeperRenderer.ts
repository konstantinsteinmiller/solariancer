import { ref } from 'vue'
import useGravityPhysics, {
  worldWidth, worldHeight, worldCenterX, worldCenterY,
  singularityActive, singularityX, singularityY, bodies, particles, popups, probes,
  sunPulse, screenShake, flashIntensity
} from '@/use/useGravityPhysics'
import useSolKeeper from '@/use/useSolKeeper'
import { resourceCache } from '@/use/useAssets'

const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)

// Pre-built static layers — refreshed only when canvas is resized.
let starsLayer: HTMLCanvasElement | null = null
let nebulaLayer: HTMLCanvasElement | null = null
let sunHaloLayer: HTMLCanvasElement | null = null
let sunCoreLayer: HTMLCanvasElement | null = null
let lastWidth = 0
let lastHeight = 0
let dpr = 1

export const debugStats = ref({ fps: 0 })

const buildStars = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#05060f'
  ctx.fillRect(0, 0, w, h)
  // Far stars
  const STAR_COUNT = Math.floor((w * h) / 2400)
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = Math.random() * 1.2 + 0.2
    ctx.fillStyle = `rgba(255,${230 + Math.random() * 25 | 0},${200 + Math.random() * 55 | 0},${0.5 + Math.random() * 0.5})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // A few brighter ones with cross flares
  for (let i = 0; i < Math.max(8, STAR_COUNT * 0.012); i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = 1.3 + Math.random() * 1.5
    const alpha = 0.6 + Math.random() * 0.4
    ctx.fillStyle = `rgba(180,220,255,${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    // Cross flare
    ctx.strokeStyle = `rgba(180,220,255,${alpha * 0.5})`
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.moveTo(x - r * 4, y)
    ctx.lineTo(x + r * 4, y)
    ctx.moveTo(x, y - r * 4)
    ctx.lineTo(x, y + r * 4)
    ctx.stroke()
  }
  return c
}

const buildNebula = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.globalCompositeOperation = 'lighter'
  // 5 large soft blobs in deep blues / purples / faint magenta
  const colors = [
    'rgba(36,52,140,0.55)',
    'rgba(78,42,170,0.45)',
    'rgba(15,90,170,0.40)',
    'rgba(170,40,140,0.30)',
    'rgba(40,140,170,0.30)'
  ]
  for (const color of colors) {
    const cx = Math.random() * w
    const cy = Math.random() * h
    const r = (Math.random() * 0.5 + 0.4) * Math.max(w, h)
    const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  return c
}

const buildSunHalo = () => {
  const size = 720
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  // Outer glow
  const cg = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  cg.addColorStop(0, 'rgba(255,200,120,1.0)')
  cg.addColorStop(0.07, 'rgba(255,150, 60,0.85)')
  cg.addColorStop(0.18, 'rgba(255, 90, 30,0.55)')
  cg.addColorStop(0.40, 'rgba(120, 80,200,0.35)')
  cg.addColorStop(0.65, 'rgba( 60, 70,180,0.18)')
  cg.addColorStop(1.0, 'rgba(  0,  0,  0,0)')
  ctx.fillStyle = cg
  ctx.fillRect(0, 0, size, size)
  return c
}

const buildSunCore = () => {
  const size = 220
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 8

  // Outer flare ring
  const ring = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r)
  ring.addColorStop(0, 'rgba(255,180, 60,0.9)')
  ring.addColorStop(1, 'rgba(255,255,200,0)')
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Body
  const body = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r * 0.92)
  body.addColorStop(0, 'rgba(255,255,210,1)')
  body.addColorStop(0.25, 'rgba(255,210,110,1)')
  body.addColorStop(0.6, 'rgba(255,140, 40,1)')
  body.addColorStop(1.0, 'rgba(220, 60, 20,1)')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2)
  ctx.fill()

  // Surface swirl strokes
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2)
  ctx.clip()
  ctx.lineWidth = 2.2
  ctx.strokeStyle = 'rgba(255,235,160,0.55)'
  for (let i = 0; i < 5; i++) {
    const baseR = r * (0.25 + i * 0.13)
    ctx.beginPath()
    for (let a = 0; a < Math.PI * 2; a += 0.06) {
      const wob = Math.sin(a * (3 + i) + i) * 6
      const rr = baseR + wob
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr
      if (a === 0) ctx.moveTo(x, y) else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  ctx.restore()

  // Top-left specular highlight
  const spec = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx - r * 0.35, cy - r * 0.4, r * 0.55)
  spec.addColorStop(0, 'rgba(255,255,220,0.6)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2)
  ctx.fill()

  return c
}

// ─── Main render entry ─────────────────────────────────────────────────────

export const renderScene = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, time: number) => {
  const W = worldWidth.value
  const H = worldHeight.value

  if (W !== lastWidth || H !== lastHeight || !starsLayer) {
    starsLayer = buildStars(W, H)
    nebulaLayer = buildNebula(W, H)
    if (!sunHaloLayer) sunHaloLayer = buildSunHalo()
    if (!sunCoreLayer) sunCoreLayer = buildSunCore()
    lastWidth = W
    lastHeight = H
  }

  // Background
  ctx.save()
  if (screenShake.value > 0.1) {
    const sx = (Math.random() - 0.5) * screenShake.value
    const sy = (Math.random() - 0.5) * screenShake.value
    ctx.translate(sx, sy)
  }
  ctx.drawImage(starsLayer!, 0, 0, W, H)
  ctx.drawImage(nebulaLayer!, 0, 0, W, H)

  // Sun pulse halo
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  const sunR = useGravityPhysics().sunRadius.value
  const halo = sunHaloLayer!
  const haloPulse = 1 + 0.05 * Math.sin(sunPulse.value * 1.4)
  const haloSize = sunR * 6.5 * haloPulse
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(halo, cx - haloSize / 2, cy - haloSize / 2, haloSize, haloSize)
  ctx.globalCompositeOperation = 'source-over'

  // Faint outer ring (orbit guide)
  ctx.strokeStyle = 'rgba(120,180,255,0.10)'
  ctx.lineWidth = 1.5
  for (let r = sunR * 2; r < Math.min(W, H) * 0.55; r += sunR * 1.2) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Bodies — trails first
  drawTrails(ctx)

  // Probes (drawn behind bodies)
  drawProbes(ctx, time)

  // Bodies
  for (const b of bodies.value) {
    if (b.dead) continue
    if (!b.pattern) continue
    const size = b.radius * 2
    // Stability glow
    if (b.orbitStability > 0.5) {
      const glowAlpha = (b.orbitStability - 0.5) * 0.6
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const gg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.2)
      gg.addColorStop(0, `rgba(255,210,120,${glowAlpha})`)
      gg.addColorStop(1, 'rgba(255,210,120,0)')
      ctx.fillStyle = gg
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.radius * 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.rotation)
    ctx.drawImage(b.pattern, -b.radius, -b.radius, size, size)
    ctx.restore()
  }

  // Sun on top of bodies (so collisions look like they sink in)
  drawSun(ctx, sunR, time)

  // Singularity + tether
  if (singularityActive.value) {
    drawSingularity(ctx, singularityX.value, singularityY.value, time)
  }

  // Particles
  drawParticles(ctx)

  // Score popups
  drawPopups(ctx)

  // Global flash
  if (flashIntensity.value > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = `rgba(255,200,120,${flashIntensity.value * 0.35})`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  ctx.restore()
}

const drawTrails = (ctx: CanvasRenderingContext2D) => {
  ctx.save()
  ctx.lineCap = 'round'
  for (const b of bodies.value) {
    if (b.dead) continue
    const len = b.trail.length / 2
    let prevX = NaN
    let prevY = NaN
    let count = 0
    // Walk from oldest (head) to newest (head-1)
    for (let i = 0; i < len; i++) {
      const idx = ((b.trailHead + i) % len) * 2
      const x = b.trail[idx] ?? NaN
      const y = b.trail[idx + 1] ?? NaN
      if (!Number.isFinite(x)) {
        prevX = NaN
        continue
      }
      if (Number.isFinite(prevX)) {
        const t = count / len
        const alpha = t * 0.4
        if (alpha > 0.01) {
          ctx.strokeStyle = `hsla(${b.hue}, 70%, 70%, ${alpha})`
          ctx.lineWidth = b.radius * 0.4 * t + 0.5
          ctx.beginPath()
          ctx.moveTo(prevX, prevY)
          ctx.lineTo(x, y)
          ctx.stroke()
        }
      }
      prevX = x
      prevY = y
      count++
    }
  }
  ctx.restore()
}

const drawProbes = (ctx: CanvasRenderingContext2D, time: number) => {
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  for (const p of probes.value) {
    const px = cx + Math.cos(p.angle) * p.orbitRadius
    const py = cy + Math.sin(p.angle) * p.orbitRadius
    const pulse = 0.7 + 0.3 * Math.sin(p.pulseT * 4)
    // Body
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(p.angle)
    // Glow
    if (!isFirefox) {
      ctx.shadowColor = '#9eddff'
      ctx.shadowBlur = 12
    }
    ctx.fillStyle = '#dff4ff'
    ctx.beginPath()
    ctx.moveTo(8, 0)
    ctx.lineTo(-6, 5)
    ctx.lineTo(-3, 0)
    ctx.lineTo(-6, -5)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = `rgba(255,210,120,${pulse})`
    ctx.beginPath()
    ctx.arc(0, 0, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

const drawSun = (ctx: CanvasRenderingContext2D, sunR: number, time: number) => {
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  const core = sunCoreLayer!
  const pulse = 1 + 0.04 * Math.sin(sunPulse.value * 2.4)
  const size = sunR * 2.2 * pulse
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // Inner radial wash
  const inner = ctx.createRadialGradient(cx, cy, sunR * 0.2, cx, cy, sunR * 1.7)
  inner.addColorStop(0, 'rgba(255,220,140,0.7)')
  inner.addColorStop(1, 'rgba(255,80,40,0)')
  ctx.fillStyle = inner
  ctx.beginPath()
  ctx.arc(cx, cy, sunR * 1.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(time * 0.06)
  ctx.drawImage(core, -size / 2, -size / 2, size, size)
  ctx.restore()
}

const drawSingularity = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  // Outer aura
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const aura = ctx.createRadialGradient(x, y, 0, x, y, 110)
  aura.addColorStop(0, 'rgba(170,110,255,0.8)')
  aura.addColorStop(0.4, 'rgba(120, 80,255,0.45)')
  aura.addColorStop(1, 'rgba( 50, 30,150,0)')
  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(x, y, 110, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Tether to nearest body
  let nearest: typeof bodies.value[number] | null = null
  let bestD = 99999
  for (const b of bodies.value) {
    if (b.dead) continue
    const dx = b.x - x
    const dy = b.y - y
    const d = Math.hypot(dx, dy)
    if (d < bestD) {
      bestD = d
      nearest = b
    }
  }
  if (nearest && bestD < 360) {
    const tetherAlpha = Math.max(0.2, 1 - bestD / 360)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    // Wide soft underline
    ctx.strokeStyle = `rgba(170,110,255,${tetherAlpha * 0.4})`
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(nearest.x, nearest.y)
    ctx.stroke()
    // Crisp core line
    ctx.strokeStyle = `rgba(220,200,255,${tetherAlpha})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(nearest.x, nearest.y)
    ctx.stroke()
    // Wiggle accent
    ctx.strokeStyle = `rgba(255,255,255,${tetherAlpha * 0.6})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    const segs = 6
    for (let i = 1; i <= segs; i++) {
      const t = i / segs
      const px = x + (nearest.x - x) * t
      const py = y + (nearest.y - y) * t
      const nx = -(nearest.y - y) / Math.max(1, bestD)
      const ny = (nearest.x - x) / Math.max(1, bestD)
      const off = Math.sin(time * 18 + i) * 4 * (1 - t)
      ctx.lineTo(px + nx * off, py + ny * off)
    }
    ctx.stroke()
    ctx.restore()
  }

  // Core
  ctx.save()
  ctx.fillStyle = '#f0e6ff'
  if (!isFirefox) {
    ctx.shadowColor = '#a070ff'
    ctx.shadowBlur = 16
  }
  ctx.beginPath()
  ctx.arc(x, y, 7 + Math.sin(time * 8) * 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawParticles = (ctx: CanvasRenderingContext2D) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of particles.value) {
    const t = p.life / p.maxLife
    const r = Math.max(0.2, p.size * (1 - t * p.shrink))
    ctx.fillStyle = `hsla(${p.hue}, 90%, ${60 + (1 - t) * 30}%, ${p.alpha})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const drawPopups = (ctx: CanvasRenderingContext2D) => {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const p of popups.value) {
    const t = p.life / p.maxLife
    const alpha = 1 - t
    ctx.font = `900 ${p.size}px Arial, sans-serif`
    ctx.lineWidth = 4
    ctx.strokeStyle = `rgba(0,0,0,${alpha})`
    ctx.strokeText(p.text, p.x, p.y)
    ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba')
    // If color is hex, convert manually
    if (p.color.startsWith('#')) {
      ctx.fillStyle = p.color
      ctx.globalAlpha = alpha
    }
    ctx.fillText(p.text, p.x, p.y)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// ─── Canvas mount + RAF loop ───────────────────────────────────────────────

let raf = 0
let lastTime = 0
let frameCount = 0
let fpsAccum = 0

export const startRenderLoop = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d', { alpha: false })!
  const physics = useGravityPhysics()
  const sk = useSolKeeper()

  const resize = () => {
    const vv = window.visualViewport
    const cssW = vv ? vv.width : window.innerWidth
    const cssH = vv ? vv.height : window.innerHeight
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(cssH * dpr)
    canvas.style.width = cssW + 'px'
    canvas.style.height = cssH + 'px'
    physics.initWorld(cssW, cssH) // also seeds bodies on first call
    starsLayer = null // force layer rebuild
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // First resize + listeners
  resize()
  let resizeAccum = 0
  const onResize = () => {
    // Debounce a tick by setting accumulator; the loop applies it
    resizeAccum = performance.now() + 80
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (resizeAccum && now > resizeAccum) {
      resize()
      resizeAccum = 0
    }
    if (!lastTime) lastTime = now
    const dt = (now - lastTime) / 1000
    lastTime = now
    fpsAccum += dt
    frameCount++
    if (fpsAccum >= 0.5) {
      debugStats.value.fps = Math.round(frameCount / fpsAccum)
      frameCount = 0
      fpsAccum = 0
    }

    physics.tick(dt)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderScene(canvas, ctx, now / 1000)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
  }
}
