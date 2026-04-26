import { ref } from 'vue'
import useGravityPhysics, {
  worldWidth, worldHeight, worldCenterX, worldCenterY,
  singularityActive, singularityX, singularityY, bodies, particles, popups,
  sunPulse, screenShake, flashIntensity, sunShieldFlash, crowdBonusActive,
  probes, worldScale,
  COOK_TIME_SECONDS, ZONE_WARMUP_SECONDS
} from '@/use/useGravityPhysics'
import useSolKeeper from '@/use/useSolKeeper'
import useSolTutorial from '@/use/useSolTutorial'
import useSolEvents from '@/use/useSolEvents'
import useSolAudio from '@/use/useSolAudio'
import useSolMission from '@/use/useSolMission'
import useSolPuzzles from '@/use/useSolPuzzles'
import { resourceCache, currentBgSrc } from '@/use/useAssets'

const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)

// Backdrop image — read from useAssets via currentBgSrc. Both the splash
// and the canvas start with the low-res bg_800x450; once the deferred
// preload finishes, currentBgSrc points at bg_1280x720 and the next frame
// silently picks up the higher resolution.
let bgImage: HTMLImageElement | null = null
let bgImageSrc = ''
const ensureBackdropImage = () => {
  if (currentBgSrc.value === bgImageSrc) return
  bgImageSrc = currentBgSrc.value
  // Reuse the existing image cache if the file has already been preloaded.
  const cached = resourceCache.images.get(bgImageSrc)
  if (cached) {
    bgImage = cached
    return
  }
  const img = new Image()
  img.onload = () => {
    resourceCache.images.set(bgImageSrc, img)
  }
  img.src = bgImageSrc
  bgImage = img
}
const drawBackdrop = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
  ensureBackdropImage()
  if (!bgImage || !bgImage.complete || !bgImage.naturalWidth) {
    // Fallback solid wash so the canvas isn't a flat bright white before the
    // image lands. Matches the splash colour for visual continuity.
    ctx.fillStyle = '#05060f'
    ctx.fillRect(0, 0, W, H)
    return
  }
  // CSS background-size:cover — fill the viewport, preserve aspect, anchor centre.
  const iw = bgImage.naturalWidth
  const ih = bgImage.naturalHeight
  const arImg = iw / ih
  const arCanvas = W / H
  let dw, dh, dx, dy
  if (arCanvas > arImg) {
    dw = W
    dh = W / arImg
    dx = 0
    dy = (H - dh) / 2
  } else {
    dh = H
    dw = H * arImg
    dx = (W - dw) / 2
    dy = 0
  }
  ctx.drawImage(bgImage, dx, dy, dw, dh)
}

// Pre-built static layers — refreshed only when canvas is resized.
let starsLayer: HTMLCanvasElement | null = null
let nebulaLayer: HTMLCanvasElement | null = null
let sunHaloLayer: HTMLCanvasElement | null = null
let sunCoreLayer: HTMLCanvasElement | null = null
let sunCoreLayerTier = -1
let lastWidth = 0
let lastHeight = 0
let dpr = 1

export const debugStats = ref({ fps: 0 })

const buildStars = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  // No opaque fill — the bg image lives behind these stars now. Stars
  // overlay on top; the canvas's own black wash (via alpha:false) provides
  // the fallback before the bg image loads.
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

// Sun palettes — one per stage type. Stage system advances every 1000 heat
// and cycles through these in order. Index = (stage - 1) % length.
const SUN_PALETTES: {
  ring: [string, string];
  body: [string, string, string, string];
  swirl: string;
  spec: string
}[] = [
  // 0: G-Type — saturated yellow main-sequence sun
  {
    ring: ['rgba(255,220, 80,0.95)', 'rgba(255,255,200,0)'],
    body: ['rgba(255,255,220,1)', 'rgba(255,225,120,1)', 'rgba(255,160, 50,1)', 'rgba(220, 80, 30,1)'],
    swirl: 'rgba(255,235,160,0.55)',
    spec: 'rgba(255,255,220,0.6)'
  },
  // 1: K-Type — orange dwarf
  {
    ring: ['rgba(255,150, 50,0.95)', 'rgba(255,210,160,0)'],
    body: ['rgba(255,225,180,1)', 'rgba(255,170, 70,1)', 'rgba(220, 90, 30,1)', 'rgba(150, 40, 14,1)'],
    swirl: 'rgba(255,200,120,0.55)',
    spec: 'rgba(255,230,180,0.55)'
  },
  // 2: M-Type — red dwarf
  {
    ring: ['rgba(255, 70, 60,0.95)', 'rgba(255,170,140,0)'],
    body: ['rgba(255,200,160,1)', 'rgba(255,120, 60,1)', 'rgba(190, 40, 30,1)', 'rgba( 90, 20, 12,1)'],
    swirl: 'rgba(255,170,140,0.5)',
    spec: 'rgba(255,200,180,0.5)'
  },
  // 3: Red Giant — bloated, deep red
  {
    ring: ['rgba(220, 50, 30,1.0)', 'rgba(255,150,110,0)'],
    body: ['rgba(255,170,150,1)', 'rgba(255, 90, 50,1)', 'rgba(160, 30, 14,1)', 'rgba( 70,  8,  6,1)'],
    swirl: 'rgba(255,140,110,0.55)',
    spec: 'rgba(255,180,150,0.55)'
  },
  // 4: Blue Dwarf — hot blue/cyan
  {
    ring: ['rgba(120,210,255,1.0)', 'rgba(180,235,255,0)'],
    body: ['rgba(220,240,255,1)', 'rgba(120,200,255,1)', 'rgba( 50,140,230,1)', 'rgba( 20, 50,140,1)'],
    swirl: 'rgba(180,230,255,0.6)',
    spec: 'rgba(255,255,255,0.7)'
  },
  // 5: White Dwarf — pure white-platinum
  {
    ring: ['rgba(255,255,255,1.0)', 'rgba(220,235,255,0)'],
    body: ['rgba(255,255,255,1)', 'rgba(240,250,255,1)', 'rgba(180,200,240,1)', 'rgba( 80,100,160,1)'],
    swirl: 'rgba(255,255,255,0.8)',
    spec: 'rgba(255,255,255,0.85)'
  },
  // 6: Brown Dwarf — failed-star ember
  {
    ring: ['rgba(180, 90, 40,0.85)', 'rgba(160, 70, 40,0)'],
    body: ['rgba(210,160,120,1)', 'rgba(180,100, 50,1)', 'rgba(120, 60, 30,1)', 'rgba( 60, 30, 14,1)'],
    swirl: 'rgba(200,130, 80,0.5)',
    spec: 'rgba(220,180,140,0.5)'
  },
  // 7: Neutron — magenta-violet pulsar
  {
    ring: ['rgba(255, 60,200,1.0)', 'rgba(220,140,255,0)'],
    body: ['rgba(255,200,255,1)', 'rgba(220,100,255,1)', 'rgba(140, 40,200,1)', 'rgba( 50, 10, 90,1)'],
    swirl: 'rgba(255,160,255,0.6)',
    spec: 'rgba(255,220,255,0.7)'
  }
]

// Helper: re-alpha an rgba string (used to vary opacity on palette colors).
const withAlpha = (rgba: string, alpha: number): string => {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return rgba
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`
}

const buildSunCore = (tier = 0) => {
  const palette = SUN_PALETTES[Math.max(0, Math.min(SUN_PALETTES.length - 1, tier))]!
  // Bigger canvas = more headroom for detail. Drawn-once, scaled at draw time
  // so the cost only lands on stage transitions.
  const size = 320
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 18

  // ── Outer chromosphere — soft hot ring just outside the body ────────────
  const ring = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.18)
  ring.addColorStop(0, withAlpha(palette.ring[0], 0.65))
  ring.addColorStop(0.5, withAlpha(palette.ring[0], 0.30))
  ring.addColorStop(1, palette.ring[1])
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2)
  ctx.fill()

  // ── Body — multi-stop plasma gradient with hot core, dimmer rim ────────
  const body = ctx.createRadialGradient(cx, cy, r * 0.04, cx, cy, r)
  body.addColorStop(0, palette.body[0])
  body.addColorStop(0.18, palette.body[1])
  body.addColorStop(0.50, palette.body[2])
  body.addColorStop(0.80, palette.body[3])
  body.addColorStop(1.0, palette.body[3])
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // ── Limb darkening — physical edges of stars are darker than the centre ─
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalCompositeOperation = 'multiply'
  const limb = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r)
  limb.addColorStop(0, 'rgba(255, 255, 255, 1)')
  limb.addColorStop(0.7, 'rgba(255, 245, 230, 1)')
  limb.addColorStop(1.0, 'rgba(70, 35, 20, 1)')
  ctx.fillStyle = limb
  ctx.fillRect(0, 0, size, size)
  ctx.restore()

  // ── Granulation — small bright/dark convection cells across the surface ─
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.97, 0, Math.PI * 2)
  ctx.clip()
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2
    // Bias toward the limbs — cells stack denser near the edge for texture
    const dist = Math.pow(Math.random(), 0.65) * r * 0.92
    const px = cx + Math.cos(a) * dist
    const py = cy + Math.sin(a) * dist
    const cellR = 1.4 + Math.random() * 3.2
    const bright = Math.random() < 0.55
    const baseAlpha = bright ? 0.18 + Math.random() * 0.22 : 0.10 + Math.random() * 0.18
    // Cells fade as they approach the limb so darkening reads
    const limbFade = 1 - Math.pow(dist / r, 3) * 0.5
    ctx.fillStyle = bright
      ? withAlpha(palette.spec, baseAlpha * limbFade)
      : `rgba(20, 8, 4, ${baseAlpha * limbFade})`
    ctx.beginPath()
    ctx.arc(px, py, cellR, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // ── Swirl bands — concentric wobbly rings simulate plasma flow ─────────
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2)
  ctx.clip()
  ctx.lineWidth = 2.2
  ctx.strokeStyle = withAlpha(palette.swirl, 0.7)
  for (let i = 0; i < 7; i++) {
    const baseR = r * (0.18 + i * 0.11)
    ctx.beginPath()
    for (let a = 0; a < Math.PI * 2; a += 0.04) {
      const wob = Math.sin(a * (3 + i * 0.7) + i * 1.5) * (3.5 + i * 1.2)
      const rr = baseR + wob
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr
      if (a === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  ctx.restore()

  // ── Bright sunspot-style hotspots — a few asymmetric bright patches ────
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2
    const dist = Math.random() * r * 0.7
    const px = cx + Math.cos(a) * dist
    const py = cy + Math.sin(a) * dist
    const spotR = r * (0.10 + Math.random() * 0.10)
    const g = ctx.createRadialGradient(px, py, 0, px, py, spotR)
    g.addColorStop(0, withAlpha(palette.spec, 0.35))
    g.addColorStop(1, withAlpha(palette.spec, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(px, py, spotR, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Specular highlight — soft hot bloom toward the upper-left
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const spec = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.38, 0, cx - r * 0.32, cy - r * 0.38, r * 0.55)
  spec.addColorStop(0, palette.spec)
  spec.addColorStop(0.5, withAlpha(palette.spec, 0.25))
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

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
    lastWidth = W
    lastHeight = H
  }
  // Rebuild sun core when the streak-derived skin tier changes.
  const sk = useSolKeeper()
  const desiredTier = sk.sunSkinTier.value
  if (!sunCoreLayer || sunCoreLayerTier !== desiredTier) {
    sunCoreLayer = buildSunCore(desiredTier)
    sunCoreLayerTier = desiredTier
  }

  // Background
  ctx.save()
  if (screenShake.value > 0.1) {
    const sx = (Math.random() - 0.5) * screenShake.value
    const sy = (Math.random() - 0.5) * screenShake.value
    ctx.translate(sx, sy)
  }
  // Backdrop image (cover semantics: fill the viewport, crop excess so the
  // 16:9 image still works on portrait phones — anchored to the centre).
  drawBackdrop(ctx, W, H)
  // Stars + nebula are the FALLBACK look — only painted when the backdrop
  // image isn't loaded yet. Once it is, the artwork already provides stars
  // and nebula richness; doubling them muddies the scene.
  const bgReady = !!(bgImage && bgImage.complete && bgImage.naturalWidth)
  if (!bgReady) {
    ctx.drawImage(starsLayer!, 0, 0, W, H)
    ctx.drawImage(nebulaLayer!, 0, 0, W, H)
  }

  // Sun pulse halo
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  const physics = useGravityPhysics()
  const sunR = physics.sunRadius.value
  const zoneInner = physics.heatZoneInner.value
  const zoneOuter = physics.heatZoneOuter.value
  const closeInner = physics.closeZoneInner.value
  const closeOuter = physics.closeZoneOuter.value
  const halo = sunHaloLayer!
  const haloPulse = 1 + 0.05 * Math.sin(sunPulse.value * 1.4)
  const haloSize = sunR * 6.5 * haloPulse
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(halo, cx - haloSize / 2, cy - haloSize / 2, haloSize, haloSize)
  ctx.globalCompositeOperation = 'source-over'

  // Close-to-Sun zone — narrow hot band right at the sun's edge.
  // Drawn first (under) the regular Heat Zone so the boundary reads cleanly.
  drawCloseZone(ctx, cx, cy, closeInner, closeOuter, time)
  // Heat Zone ring — the playable annulus around the Sun
  drawHeatZone(ctx, cx, cy, zoneInner, zoneOuter, time)

  // Bodies — trails first
  drawTrails(ctx)

  // Probes — drawn behind bodies so a captured asteroid renders on top of
  // its rope and station icon.
  if (probes.value.length > 0) drawProbes(ctx, time)

  // Bodies
  for (const b of bodies.value) {
    if (b.dead) continue
    if (!b.pattern) continue
    const size = b.radius * 2
    const cookT = Math.min(1, b.cookedSeconds / COOK_TIME_SECONDS)
    const ripe = b.cookedSeconds >= COOK_TIME_SECONDS

    // Comet beacon — bright icy halo + outward streamers, easy to spot at speed
    if (b.isComet) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const pulse = 0.6 + 0.4 * Math.sin(time * 9 + b.id)
      const halo = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 4)
      halo.addColorStop(0, `rgba(160, 230, 255, ${0.7 * pulse})`)
      halo.addColorStop(0.5, `rgba(120, 200, 255, ${0.35 * pulse})`)
      halo.addColorStop(1, 'rgba(80, 160, 255, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.radius * 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    // Heat-zone glow — intensity rises as the body cooks; ripe bodies pulse.
    if (cookT > 0.05 || b.fxFlash > 0) {
      const pulse = ripe ? (0.65 + 0.35 * Math.sin(time * 4 + b.id)) : 1
      const glowAlpha = Math.min(0.85, cookT * 0.7 * pulse + b.fxFlash * 0.5)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const gg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.6)
      const hue = ripe ? 40 : 200 - cookT * 160
      gg.addColorStop(0, `hsla(${hue}, 95%, 65%, ${glowAlpha})`)
      gg.addColorStop(1, `hsla(${hue}, 95%, 60%, 0)`)
      ctx.fillStyle = gg
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.radius * 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    // Contrast scrim — a soft dark halo right behind the body so its
    // silhouette stays readable against the new busy background art. Drawn
    // AFTER the additive heat-zone glow so it replaces the glow in the
    // tight ring around the body, leaving the broader glow visible further
    // out. The body sprite overdraws the centre, so the scrim only shows
    // as a thin dark outline along the silhouette.
    {
      const haloR = b.radius * 1.45
      const halo = ctx.createRadialGradient(b.x, b.y, b.radius * 0.9, b.x, b.y, haloR)
      halo.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(b.x, b.y, haloR, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.rotation)
    ctx.drawImage(b.pattern, -b.radius, -b.radius, size, size)
    ctx.restore()
    // Cooking progress bar — appears once warm-up has passed (3s+), fills
    // from yellow (just-warmed) to dark red (ripe). Drawn in screen space
    // (no body rotation) so it's always horizontal and readable.
    if (b.cookedSeconds >= ZONE_WARMUP_SECONDS) {
      const span = COOK_TIME_SECONDS - ZONE_WARMUP_SECONDS
      const progress = Math.min(1, (b.cookedSeconds - ZONE_WARMUP_SECONDS) / span)
      const barW = b.radius * 1.5
      const barH = 3
      const barX = b.x - barW / 2
      const barY = b.y - barH / 2
      // Background trough
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2)
      // Foreground — hue interpolates yellow → orange → dark red
      const hue = 55 - progress * 55             // 55 (yellow) → 0 (red)
      const lightness = 55 - progress * 22       // 55% (bright) → 33% (dark red)
      ctx.fillStyle = `hsl(${hue}, 95%, ${lightness}%)`
      ctx.fillRect(barX, barY, barW * progress, barH)
    }
    // Ripe halo ring
    if (ripe) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = `rgba(255, 220, 120, ${0.5 + 0.4 * Math.sin(time * 6 + b.id)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.radius + 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  // Sun on top of bodies (so collisions look like they sink in)
  drawSun(ctx, sunR, time)

  // Black hole — drawn over bodies so it visually devours them
  const events = useSolEvents()
  if (events.blackHoleActive.value) {
    drawBlackHole(ctx, events.blackHoleX.value, events.blackHoleY.value, events.blackHoleTimeLeft.value, time)
  }

  // Singularity + multi-tether
  if (singularityActive.value) {
    const range = useGravityPhysics().singularityRange.value
    drawSingularity(ctx, singularityX.value, singularityY.value, range, time)
    // Stage-1 preview — show the singularity's reach and a thin pull
    // hint to the nearest in-range body so the player sees cause-and-
    // effect of where they tapped. Hidden once they've made a ripe-feed.
    if (sk.stage1HintsActive.value) {
      drawSingularityPreview(ctx, singularityX.value, singularityY.value, range, time)
    }
  }

  // Stage-1 ghost arrow — pulses from the nearest body NOT in the heat
  // zone, pointing at the heat-zone mid radius. Teaches "drag bodies
  // INTO the ring" without a tutorial bubble. Fades the moment the
  // player has cooked their first ripe.
  if (sk.stage1HintsActive.value) {
    drawHeatZoneArrowHint(ctx, cx, cy, zoneInner, zoneOuter, time)
  }

  // Solar flare red wash — applied near the end so it doesn't recolor sprites
  if (events.flareActive.value) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const pulse = 0.3 + 0.2 * Math.sin(time * 8)
    const grad = ctx.createRadialGradient(cx, cy, sunR * 1.5, cx, cy, Math.max(W, H))
    grad.addColorStop(0, `rgba(255, 80, 40, ${0.55 * pulse + 0.25})`)
    grad.addColorStop(1, 'rgba(255, 80, 40, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  } else if (events.flareWarning.value) {
    // Warning shimmer — subtle amber pulse
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const pulse = 0.5 + 0.5 * Math.sin(time * 12)
    ctx.fillStyle = `rgba(255, 180, 80, ${0.10 * pulse})`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
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
  // Player-selected trail palette — overrides body-hue when not 'auto'.
  const palette = useSolKeeper().state.value.preferences.trailPalette
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
          // Trail palette mapping. 'auto' = body hue (original).
          let hue: number
          let sat = 70
          let light = 70
          switch (palette) {
            case 'rainbow':
              hue = (t * 360 + b.id * 53) % 360
              sat = 90
              light = 65
              break
            case 'ember':
              hue = 18 - t * 18
              sat = 95
              light = 50 + t * 15
              break
            case 'plasma':
              hue = 280 + t * 30
              sat = 95
              light = 65
              break
            case 'aurora':
              hue = 160 + t * 80
              sat = 80
              light = 65
              break
            default:
              hue = b.hue
          }
          ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`
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

// Solar flare scheduler — module-level state so the flare timing persists
// across draws. Every 5–9 seconds a dramatic streamer shoots from a random
// angle and fades over 1.0s.
let flareNextAt = 4
let flareAngle = 0
let flareStartedAt = -10
const FLARE_DURATION = 1.0

const drawSun = (ctx: CanvasRenderingContext2D, sunR: number, time: number) => {
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  const core = sunCoreLayer!
  const tier = Math.max(0, Math.min(SUN_PALETTES.length - 1, sunCoreLayerTier))
  const palette = SUN_PALETTES[tier]!

  // ── Corona rays ─────────────────────────────────────────────────────────
  // 16 radial rays of varying length, each breathing with its own phase. They
  // sit BEHIND everything so the sun core paints over their roots.
  const RAY_COUNT = 16
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const rayBaseAngle = time * 0.08
  for (let i = 0; i < RAY_COUNT; i++) {
    const a = rayBaseAngle + (i / RAY_COUNT) * Math.PI * 2
    const phase = time * 1.4 + i * 0.7
    // Each ray has its own breath cycle — some long, some short, never in sync
    const lengthFactor = 0.45 + 0.30 * Math.sin(phase) + 0.15 * Math.sin(phase * 1.7 + 1.3)
    const rayLen = sunR * lengthFactor
    const rayWidth = sunR * (0.07 + 0.03 * Math.sin(phase * 1.2))
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(a)
    const grad = ctx.createLinearGradient(sunR * 0.92, 0, sunR * 0.92 + rayLen, 0)
    grad.addColorStop(0, withAlpha(palette.ring[0], 0.55))
    grad.addColorStop(0.4, withAlpha(palette.ring[0], 0.20))
    grad.addColorStop(1, palette.ring[1])
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(sunR * 0.92, -rayWidth / 2)
    ctx.lineTo(sunR * 0.92 + rayLen, 0)
    ctx.lineTo(sunR * 0.92, rayWidth / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  // ── Inner radial wash — atmosphere bleed ───────────────────────────────
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const inner = ctx.createRadialGradient(cx, cy, sunR * 0.15, cx, cy, sunR * 1.75)
  inner.addColorStop(0, withAlpha(palette.spec, 0.60))
  inner.addColorStop(0.45, withAlpha(palette.ring[0], 0.45))
  inner.addColorStop(1, 'rgba(255, 80, 40, 0)')
  ctx.fillStyle = inner
  ctx.beginPath()
  ctx.arc(cx, cy, sunR * 1.75, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ── Sun core (cached sprite) — twin-pulse for organic breathing ────────
  const heartbeat = 1 + 0.045 * Math.sin(sunPulse.value * 1.2)
  const breath = 1 + 0.022 * Math.sin(sunPulse.value * 3.4 + 0.5)
  const pulse = heartbeat * breath
  const size = sunR * 2.2 * pulse
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(time * 0.05)
  ctx.drawImage(core, -size / 2, -size / 2, size, size)
  ctx.restore()

  // ── Prominences — plasma arcs reaching off the surface ─────────────────
  const PROMINENCE_COUNT = 3
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < PROMINENCE_COUNT; i++) {
    const seed = i * 1.7 + tier * 0.3
    const baseAngle = (i / PROMINENCE_COUNT) * Math.PI * 2 + time * 0.18 + seed
    const angularSpan = 0.30 + 0.10 * Math.sin(time * 0.6 + seed)
    const peakHeight = sunR * (0.32 + 0.16 * Math.sin(time * 0.8 + seed))
    const x1 = cx + Math.cos(baseAngle - angularSpan) * sunR * 0.96
    const y1 = cy + Math.sin(baseAngle - angularSpan) * sunR * 0.96
    const x2 = cx + Math.cos(baseAngle + angularSpan) * sunR * 0.96
    const y2 = cy + Math.sin(baseAngle + angularSpan) * sunR * 0.96
    const peakX = cx + Math.cos(baseAngle) * (sunR + peakHeight)
    const peakY = cy + Math.sin(baseAngle) * (sunR + peakHeight)
    // Outer (soft halo) stroke
    ctx.strokeStyle = withAlpha(palette.ring[0], 0.50)
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(peakX, peakY, x2, y2)
    ctx.stroke()
    // Inner (bright core) stroke
    ctx.strokeStyle = withAlpha(palette.spec, 0.85)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(peakX, peakY, x2, y2)
    ctx.stroke()
  }
  ctx.restore()

  // ── Solar flares — occasional dramatic streamer ────────────────────────
  if (time > flareNextAt) {
    flareAngle = Math.random() * Math.PI * 2
    flareStartedAt = time
    flareNextAt = time + 5 + Math.random() * 4
  }
  const flareT = (time - flareStartedAt) / FLARE_DURATION
  if (flareT > 0 && flareT < 1) {
    // Sin envelope: rises, peaks, falls
    const envelope = Math.sin(flareT * Math.PI)
    const flareLen = sunR * 1.7 * envelope
    const flareWidth = sunR * 0.12 * envelope
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.translate(cx, cy)
    ctx.rotate(flareAngle)
    const fgrad = ctx.createLinearGradient(sunR * 0.85, 0, sunR * 0.85 + flareLen, 0)
    fgrad.addColorStop(0, withAlpha(palette.spec, 0.95 * envelope))
    fgrad.addColorStop(0.4, withAlpha(palette.ring[0], 0.65 * envelope))
    fgrad.addColorStop(1, 'rgba(255, 80, 30, 0)')
    ctx.fillStyle = fgrad
    ctx.beginPath()
    ctx.moveTo(sunR * 0.85, -flareWidth)
    ctx.lineTo(sunR * 0.85 + flareLen, 0)
    ctx.lineTo(sunR * 0.85, flareWidth)
    ctx.closePath()
    ctx.fill()
    // Bright inner streak
    ctx.strokeStyle = withAlpha(palette.spec, 0.9 * envelope)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sunR * 0.9, 0)
    ctx.lineTo(sunR * 0.9 + flareLen * 0.95, 0)
    ctx.stroke()
    ctx.restore()
  }

  // Surface Tension shield flicker
  if (sunShieldFlash.value > 0) {
    const a = sunShieldFlash.value
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = `rgba(120, 220, 255, ${0.85 * a})`
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(cx, cy, sunR + 6 + (1 - a) * 14, 0, Math.PI * 2)
    ctx.stroke()
    // Inner soft glow
    const sg = ctx.createRadialGradient(cx, cy, sunR * 0.6, cx, cy, sunR + 18)
    sg.addColorStop(0, `rgba(120, 220, 255, 0)`)
    sg.addColorStop(0.7, `rgba(120, 220, 255, ${0.35 * a})`)
    sg.addColorStop(1, `rgba(120, 220, 255, 0)`)
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(cx, cy, sunR + 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

const drawBlackHole = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  timeLeft: number,
  time: number
) => {
  // Radius grows in the first 0.5s, holds, then shrinks in the last 0.5s.
  // Scaled by worldScale so the black hole stays proportional on phones.
  const baseR = 28 * useGravityPhysics().sunRadius.value / 64  // sunRadius already has worldScale baked in
  const intensity = Math.min(1, timeLeft / 0.5) * Math.min(1, (6 - timeLeft) / 0.5 + 0.5)
  const r = baseR * Math.max(0.6, intensity)

  // Accretion disk — bright orbiting ring
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(time * 2.4)
  ctx.globalCompositeOperation = 'lighter'
  const disk = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.6)
  disk.addColorStop(0, 'rgba(170, 110, 255, 0)')
  disk.addColorStop(0.45, `rgba(255, 90, 180, ${0.55 * intensity})`)
  disk.addColorStop(0.7, `rgba(160, 80, 255, ${0.45 * intensity})`)
  disk.addColorStop(1, 'rgba(20, 10, 60, 0)')
  ctx.fillStyle = disk
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 2.6, r * 1.0, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Event horizon — solid black core
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 1)'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  // Faint rim glow
  ctx.strokeStyle = `rgba(180, 130, 255, ${0.6 * intensity})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, r + 1.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Lensing streaks — short tangent strokes around the horizon
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(220, 180, 255, ${0.5 * intensity})`
  ctx.lineWidth = 1
  for (let i = 0; i < 14; i++) {
    const a = time * 1.6 + (i / 14) * Math.PI * 2
    const r1 = r + 4
    const r2 = r + 14 + Math.sin(time * 4 + i) * 4
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1)
    ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2)
    ctx.stroke()
  }
  ctx.restore()
}

const drawProbes = (ctx: CanvasRenderingContext2D, time: number) => {
  const cx = worldCenterX.value
  const cy = worldCenterY.value
  for (const p of probes.value) {
    const px = cx + Math.cos(p.angle) * p.orbitRadius
    const py = cy + Math.sin(p.angle) * p.orbitRadius

    // Rope to the captured asteroid
    if (p.capturedId !== null) {
      let target: typeof bodies.value[number] | null = null
      for (const b of bodies.value) {
        if (b.id === p.capturedId && !b.dead) {
          target = b
          break
        }
      }
      if (target) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = `rgba(180, 230, 255, ${0.55 + 0.20 * Math.sin(time * 6)})`
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(px, py)
        // Slight bezier so the rope looks like it's under tension
        const mx = (px + target.x) * 0.5
        const my = (py + target.y) * 0.5
        const ndx = -(target.y - py)
        const ndy = (target.x - px)
        const nlen = Math.hypot(ndx, ndy) || 1
        const wob = Math.sin(time * 3 + p.pulseT) * 4
        ctx.quadraticCurveTo(mx + (ndx / nlen) * wob, my + (ndy / nlen) * wob, target.x, target.y)
        ctx.stroke()
        ctx.restore()
      }
    }

    // Station body — rotating triangle. Big probes are larger and
    // gold-tinted so the player can tell them apart at a glance.
    const isBig = p.tier === 'big'
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(p.angle + Math.PI / 2)
    if (!isFirefox) {
      ctx.shadowColor = isBig ? '#ffd14a' : '#9eddff'
      ctx.shadowBlur = isBig ? 14 : 10
    }
    ctx.fillStyle = isBig ? '#ffe7a0' : '#dff4ff'
    // Sprite scales with worldScale so probes match body size on mobile.
    // Min factor 0.7 so they remain visible against the background.
    const sz = (isBig ? 1.5 : 1) * Math.max(0.7, worldScale.value)
    ctx.beginPath()
    ctx.moveTo(0, -7 * sz)
    ctx.lineTo(5 * sz, 4 * sz)
    ctx.lineTo(-5 * sz, 4 * sz)
    ctx.closePath()
    ctx.fill()
    if (isBig) {
      // Outline accent so big probes read as "more powerful"
      ctx.strokeStyle = 'rgba(255,170,40,0.9)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.shadowBlur = 0
    const pulse = 0.55 + 0.45 * Math.sin(p.pulseT * 3.4)
    const litColor = isBig
      ? (p.capturedId !== null ? `rgba(255, 200, 80, ${pulse})` : `rgba(255, 220, 120, ${pulse})`)
      : (p.capturedId !== null ? `rgba(255, 220, 120, ${pulse})` : `rgba(160, 230, 255, ${pulse})`)
    ctx.fillStyle = litColor
    ctx.beginPath()
    ctx.arc(0, 0, isBig ? 2.6 : 1.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

const drawCloseZone = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  time: number
) => {
  // A thin, hot band right against the sun. Pulse a touch faster than the
  // regular zone so it reads as "more dangerous / hotter".
  const pulse = 0.5 + 0.5 * Math.sin(time * 5)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // Soft annular fill — bright orange-red bleeding into transparent.
  const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
  grad.addColorStop(0, `rgba(255, 110, 40, ${0.35 + 0.15 * pulse})`)
  grad.addColorStop(0.5, `rgba(255, 70, 30, ${0.30 + 0.12 * pulse})`)
  grad.addColorStop(1, 'rgba(255, 40, 20, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, outer, 0, Math.PI * 2)
  ctx.arc(cx, cy, inner, 0, Math.PI * 2, true)
  ctx.fill()
  ctx.restore()

  // Inner-edge stroke — thin red dashed line right at the sun
  ctx.save()
  ctx.lineWidth = 1.2
  ctx.strokeStyle = `rgba(255, 90, 50, ${0.45 + 0.20 * pulse})`
  ctx.setLineDash([4, 5])
  ctx.lineDashOffset = -time * 22
  ctx.beginPath()
  ctx.arc(cx, cy, inner, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

const drawHeatZone = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  time: number
) => {
  const crowd = crowdBonusActive.value
  const pulse = 0.5 + 0.5 * Math.sin(time * (crowd ? 4 : 2))
  // Soft ring fill (annulus)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
  if (crowd) {
    grad.addColorStop(0, `rgba(255, 200, 120, ${0.18 + 0.12 * pulse})`)
    grad.addColorStop(0.5, `rgba(255, 150, 80, ${0.16 + 0.10 * pulse})`)
    grad.addColorStop(1, 'rgba(255, 80, 40, 0)')
  } else {
    grad.addColorStop(0, `rgba(255, 180, 80, ${0.10 + 0.05 * pulse})`)
    grad.addColorStop(0.5, `rgba(255, 140, 60, ${0.08 + 0.04 * pulse})`)
    grad.addColorStop(1, 'rgba(255, 80, 30, 0)')
  }
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, outer, 0, Math.PI * 2)
  ctx.arc(cx, cy, inner, 0, Math.PI * 2, true)
  ctx.fill()
  ctx.restore()

  // Inner / outer rim strokes — give the zone a clear edge so the player
  // can see where to park bodies.
  ctx.save()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = crowd
    ? `rgba(255, 220, 140, ${0.5 + 0.3 * pulse})`
    : 'rgba(255, 180, 100, 0.35)'
  ctx.setLineDash([6, 6])
  ctx.lineDashOffset = -time * 14
  ctx.beginPath()
  ctx.arc(cx, cy, inner, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, outer, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

const drawSingularity = (ctx: CanvasRenderingContext2D, x: number, y: number, range: number, time: number) => {
  // Range ring — communicates the upgraded reach of Resonance Field
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(170, 110, 255, ${0.20 + 0.08 * Math.sin(time * 4)})`
  ctx.lineWidth = 1
  ctx.setLineDash([4, 8])
  ctx.lineDashOffset = -time * 18
  ctx.beginPath()
  ctx.arc(x, y, range, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  // Soft fill so the area reads at a glance
  const fill = ctx.createRadialGradient(x, y, range * 0.2, x, y, range)
  fill.addColorStop(0, 'rgba(140, 90, 220, 0.05)')
  fill.addColorStop(1, 'rgba(140, 90, 220, 0)')
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(x, y, range, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

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

  // Multi-tether — every body inside the range gets a thread. Visual
  // intensity tracks the pull (quadratic falloff) so the tether *looks* as
  // weak as it feels for distant bodies.
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const b of bodies.value) {
    if (b.dead) continue
    const dx = b.x - x
    const dy = b.y - y
    const d = Math.hypot(dx, dy)
    if (d > range) continue
    const linearT = 1 - d / range
    const t = linearT * linearT
    const alpha = Math.max(0.06, t * 0.85)
    // Wide soft underline
    ctx.strokeStyle = `rgba(170,110,255,${alpha * 0.35})`
    ctx.lineWidth = 4 + t * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    // Crisp core line, brightest on closest body
    ctx.strokeStyle = `rgba(220,200,255,${alpha})`
    ctx.lineWidth = 1 + t * 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    // Crackle accent (only worth drawing for the closer half)
    if (t > 0.4) {
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y)
      const segs = 6
      for (let i = 1; i <= segs; i++) {
        const u = i / segs
        const px = x + dx * u
        const py = y + dy * u
        const nx = -dy / Math.max(1, d)
        const ny = dx / Math.max(1, d)
        const off = Math.sin(time * 18 + i + b.id) * 3.5 * (1 - u)
        ctx.lineTo(px + nx * off, py + ny * off)
      }
      ctx.stroke()
    }
  }
  ctx.restore()

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

// ─── Onboarding overlays ──────────────────────────────────────────────────
//
// Both fade out the moment the player has cooked their first ripe — they
// only render while `sk.stage1HintsActive.value` is true.

const drawSingularityPreview = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, range: number, time: number
) => {
  // Brighter dashed reach ring than the default — the existing
  // `drawSingularity` ring is intentionally subtle for veterans, but new
  // players need to see the radius clearly. Same colour family so it
  // reads as part of the same UI layer.
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(170, 110, 255, ${0.45 + 0.18 * Math.sin(time * 3.2)})`
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])
  ctx.lineDashOffset = -time * 28
  ctx.beginPath()
  ctx.arc(x, y, range, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

const drawHeatZoneArrowHint = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  zoneInner: number, zoneOuter: number,
  time: number
) => {
  // Pick the most useful body to point at: the nearest non-dead body
  // that is OUTSIDE the heat zone (so the arrow has something to teach).
  // If everything's already in the zone, no arrow — the player is doing
  // the right thing and we don't want to nag.
  let target: typeof bodies.value[number] | null = null
  let bestDist = Infinity
  for (const b of bodies.value) {
    if (b.dead) continue
    if (b.isComet) continue
    const d = Math.hypot(b.x - cx, b.y - cy)
    if (d >= zoneInner && d <= zoneOuter) continue
    // Prefer bodies further from the sun (hint about pulling things IN).
    const score = Math.abs(d - (zoneInner + zoneOuter) / 2)
    if (score < bestDist) {
      bestDist = score
      target = b
    }
  }
  if (!target) return

  const ringMid = (zoneInner + zoneOuter) / 2
  const dx = cx - target.x
  const dy = cy - target.y
  const d = Math.hypot(dx, dy)
  if (d < 1) return
  const nx = dx / d
  const ny = dy / d

  // The arrow runs from a point just outside the body's silhouette toward
  // the heat-zone mid radius. Pulses along its length so the eye tracks.
  const startX = target.x + nx * (target.radius + 6)
  const startY = target.y + ny * (target.radius + 6)
  const endX = cx - nx * ringMid
  const endY = cy - ny * ringMid

  const pulse = 0.55 + 0.45 * Math.sin(time * 4)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(255, 200, 90, ${0.55 * pulse})`
  ctx.lineWidth = 3
  ctx.setLineDash([12, 8])
  ctx.lineDashOffset = -time * 60
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()
  ctx.setLineDash([])
  // Arrowhead at the heat-zone end so the direction reads instantly.
  const headSize = 10
  const px = -ny // perpendicular to the radial
  const py = nx
  ctx.fillStyle = `rgba(255, 220, 120, ${0.85 * pulse})`
  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(endX + nx * headSize + px * headSize * 0.6, endY + ny * headSize + py * headSize * 0.6)
  ctx.lineTo(endX + nx * headSize - px * headSize * 0.6, endY + ny * headSize - py * headSize * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const drawParticles = (ctx: CanvasRenderingContext2D) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // Scale particle radius with worldScale so explosions don't dwarf the
  // mobile canvas. Floor at 0.4 px so single-particle bursts still register.
  const partWs = worldScale.value
  for (const p of particles.value) {
    const t = p.life / p.maxLife
    const r = Math.max(0.4, p.size * partWs * (1 - t * p.shrink))
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
  // Scale popup font with worldScale — but never below an 11 px floor so
  // text stays readable on the smallest screens.
  const ws = worldScale.value
  for (const p of popups.value) {
    const t = p.life / p.maxLife
    const alpha = 1 - t
    const fontSize = Math.max(11, p.size * ws)
    ctx.font = `900 ${fontSize}px Arial, sans-serif`
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

// ─── Canvas mount + fixed-step simulation loop ─────────────────────────────
//
// The simulation is decoupled from the display refresh rate: every tick of
// gameplay logic (tutorial, events, physics, mission, puzzles) runs at a
// fixed 60 Hz step regardless of the device's frame rate. This gives the
// same gravitational forces, cook timers, and combo windows on a 60Hz phone,
// a 120Hz tablet, or a low-FPS laptop. Rendering still happens once per
// rAF callback at whatever rate the browser provides — only the simulation
// is locked to the fixed cadence.
//
// Pattern (Glenn Fiedler — "Fix Your Timestep"):
//   accumulator += clamp(frameDt)
//   while (accumulator >= FIXED_DT) { step(FIXED_DT); accumulator -= FIXED_DT }
//   render()
//
// `MAX_FRAME_DT` caps how much real time a single frame can advance the
// accumulator — without it, a tab returning from sleep would queue dozens
// of catch-up steps and freeze the page (the "spiral of death"). On a
// typical lag spike we lose ≤200ms of gameplay rather than burning a
// second of CPU re-simulating it.
//
// `MAX_STEPS_PER_FRAME` is a second guard for the same scenario, in case
// the steps themselves run slower than wall clock.

const FIXED_DT = 1 / 60
const MAX_FRAME_DT = 0.2
const MAX_STEPS_PER_FRAME = 5

let raf = 0
let lastTime = 0
let simAccum = 0
let frameCount = 0
let fpsAccum = 0

export const startRenderLoop = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d', { alpha: false })!
  const physics = useGravityPhysics()
  const sk = useSolKeeper()
  const tutorial = useSolTutorial()
  const events = useSolEvents()
  const audio = useSolAudio()
  const mission = useSolMission()
  const puzzles = useSolPuzzles()

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

  const stepSimulation = () => {
    // Tutorial driver runs before physics so its scripted singularity input
    // is applied within the same step.
    if (tutorial.active.value) tutorial.tick(FIXED_DT)
    // Events tick before physics so flare / black-hole multipliers are
    // visible to this step's heat ticks and forces.
    events.tick(FIXED_DT)
    physics.tick(FIXED_DT)
    // Mission watches heat after physics has applied this step's payouts.
    mission.tick(FIXED_DT)
    // Puzzles watch state directly (crowd active, comets caught, etc.).
    puzzles.tick(FIXED_DT)
    // Advanced tutorial trigger — fires once after the player's first 5
    // ripe feeds. Gated so it never overlaps the intro tutorial.
    if (
      !sk.state.value.tutorialAdvancedSeen
      && sk.state.value.tutorialSeen
      && sk.state.value.totalRipeFeeds >= 5
      && !tutorial.active.value
    ) {
      tutorial.startAdvanced()
    }
  }

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (resizeAccum && now > resizeAccum) {
      resize()
      resizeAccum = 0
    }
    if (!lastTime) lastTime = now
    let frameDt = (now - lastTime) / 1000
    lastTime = now
    if (frameDt > MAX_FRAME_DT) frameDt = MAX_FRAME_DT

    fpsAccum += frameDt
    frameCount++
    if (fpsAccum >= 0.5) {
      debugStats.value.fps = Math.round(frameCount / fpsAccum)
      frameCount = 0
      fpsAccum = 0
    }

    simAccum += frameDt
    let steps = 0
    while (simAccum >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      stepSimulation()
      simAccum -= FIXED_DT
      steps++
    }
    // Bleed any leftover the cap discarded so the accumulator can't grow
    // unbounded after a hitch — snaps back to phase next frame.
    if (steps >= MAX_STEPS_PER_FRAME && simAccum > FIXED_DT) {
      simAccum = 0
    }

    // Audio is read-only render-side work — safe at frame rate; using the
    // real frame dt keeps envelope smoothing tied to wall-clock time.
    audio.tick(frameDt)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderScene(canvas, ctx, now / 1000)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    lastTime = 0
    simAccum = 0
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
  }
}
