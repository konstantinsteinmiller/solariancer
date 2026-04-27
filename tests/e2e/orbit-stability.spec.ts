import { test, expect, type Page } from '@playwright/test'

// ─── Orbit stability test ─────────────────────────────────────────────────
//
// On stage 1 with no ripe feeds the spawner plants the first three
// asteroids on a shared elliptical orbit through the heat zone (auto-cook
// onboarding). This test verifies that those asteroids actually orbit —
// they should NOT crash into the sun before they ripen.
//
// We sample physics state every 250 ms for ~25 s of wall time. For each
// auto-cook body we record:
//   • spawn position + initial distance from sun
//   • minimum distance ever reached (perigee touch)
//   • whether it died, and how
//   • cookedSeconds at death (so we can tell crash-before-ripe from
//     ripen-then-eaten)
//
// Pass criteria: of the first 3 asteroids spawned by initWorld, NONE
// should die with deathReason === 'sun' while cookedSeconds < 5.

interface BodySample {
  id: number
  kind: string
  x: number
  y: number
  radius: number
  mass: number
  cookedSeconds: number
  dead: boolean
  deathReason?: string | null
}

interface OrbitReport {
  bodies: BodySample[]
  sunRadius: number
  zoneInner: number
  zoneOuter: number
  worldW: number
  worldH: number
  stage: number
  totalHeatEarned: number
  totalRipeFeeds: number
}

const sample = (page: Page) =>
  page.evaluate<OrbitReport>(() => {
    const w = window as any
    const physics = w.__solPhysics
    const sk = w.__solSk
    if (!physics || !sk) return null as any
    return {
      bodies: physics.bodies.value.map((b: any) => ({
        id: b.id,
        kind: b.kind,
        x: b.x,
        y: b.y,
        radius: b.radius,
        mass: b.mass,
        cookedSeconds: b.cookedSeconds,
        dead: b.dead,
        deathReason: b.deathReason ?? null
      })),
      sunRadius: physics.sunRadius.value,
      zoneInner: physics.heatZoneInner.value,
      zoneOuter: physics.heatZoneOuter.value,
      worldW: window.innerWidth,
      worldH: window.innerHeight,
      stage: sk.state.value.stage,
      totalHeatEarned: sk.state.value.totalHeatEarned,
      totalRipeFeeds: sk.state.value.totalRipeFeeds
    }
  })

interface SaveOverrides {
  /** Prior ripe-feed count — for testing returning players. */
  totalRipeFeeds?: number
  /** Lifetime heat earned. */
  totalHeatEarned?: number
  /** Streak days. */
  streakDays?: number
  /** Star matter on hand. */
  starMatter?: number
}

const buildSave = (over: SaveOverrides = {}) => ({
  heat: 0,
  starMatter: over.starMatter ?? 0,
  totalHeatEarned: over.totalHeatEarned ?? 0,
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
  tutorialSeen: true,
  tutorialAdvancedSeen: true,
  streak: {
    days: over.streakDays ?? 0,
    lastDateISO: over.streakDays ? new Date().toISOString().slice(0, 10) : null
  },
  totalRipeFeeds: over.totalRipeFeeds ?? 0,
  totalCometsCaught: 0,
  totalBlackHolesSurvived: 0,
  bestComboChain: 0,
  highestStage: 1,
  totalMissionsCompleted: 0,
  solarClass: 0,
  lifetimeHeatAtReset: 0,
  firstComboCelebrated: false,
  // Always start the stage-1 episode at 0 progress so the auto-cook
  // window is open, even if totalHeatEarned is non-zero.
  stage: 1,
  stageProgress: 0,
  preferences: {
    showSessionBadge: false,
    selectedSunSkin: -1,
    unlockedSunSkin: 0,
    trailPalette: 'auto',
    unlockedTrails: ['auto']
  }
})

const setupGame = async (page: Page, overrides: SaveOverrides = {}) => {
  // First nav lets the SaveManager init + patch localStorage. Then we
  // wipe localStorage to a known baseline and reload so the SolKeeper
  // composable re-loads from the new store.
  await page.goto('/')
  await page.evaluate((save) => {
    localStorage.setItem('sol_state_v1', JSON.stringify(save))
  }, buildSave(overrides))
  await page.reload()
  // Wait for the SolKeeperGame mount handles to land on window.
  await page.waitForFunction(() => !!(window as any).__solPhysics)
}

const VIEWPORT_LABEL = (page: Page) => `${page.viewportSize()?.width}×${page.viewportSize()?.height}`

type Track = {
  id: number
  kind: string
  firstSeenT: number
  firstX: number
  firstY: number
  minDist: number
  maxDist: number
  maxCooked: number
  lastDist: number
  died?: { t: number; reason: string | null; cooked: number }
}

const observeOrbits = async (page: Page, totalSeconds: number, sampleMs = 250) => {
  const baseline = await sample(page)
  const cx = baseline.worldW / 2
  const cy = baseline.worldH / 2
  const tracks = new Map<number, Track>()
  const ticks = (totalSeconds * 1000) / sampleMs
  for (let i = 0; i < ticks; i++) {
    const snap = await sample(page)
    const t = (i * sampleMs) / 1000
    for (const b of snap.bodies) {
      const dist = Math.hypot(b.x - cx, b.y - cy)
      let track = tracks.get(b.id)
      if (!track) {
        track = {
          id: b.id,
          kind: b.kind,
          firstSeenT: t,
          firstX: b.x,
          firstY: b.y,
          minDist: dist,
          maxDist: dist,
          maxCooked: b.cookedSeconds,
          lastDist: dist
        }
        tracks.set(b.id, track)
      }
      track.minDist = Math.min(track.minDist, dist)
      track.maxDist = Math.max(track.maxDist, dist)
      track.maxCooked = Math.max(track.maxCooked, b.cookedSeconds)
      track.lastDist = dist
      if (b.dead && !track.died) {
        track.died = { t, reason: b.deathReason ?? null, cooked: b.cookedSeconds }
      }
    }
    await page.waitForTimeout(sampleMs)
  }
  return { baseline, tracks }
}

const reportAndAssert = (label: string, baseline: OrbitReport, tracks: Map<number, Track>) => {
  const asteroidTracks = [...tracks.values()].filter(t => t.kind === 'asteroid')
  asteroidTracks.sort((a, b) => a.id - b.id)

  console.log(`${label} tracked ${tracks.size} bodies (${asteroidTracks.length} asteroids)`)
  for (const t of asteroidTracks) {
    const status = t.died
      ? `DIED@${t.died.t.toFixed(1)}s reason=${t.died.reason} cooked=${t.died.cooked.toFixed(1)}s`
      : `alive cooked=${t.maxCooked.toFixed(1)}s`
    console.log(
      `  body#${t.id} ${t.kind}: spawn(${t.firstX.toFixed(0)}, ${t.firstY.toFixed(0)}) ` +
      `dist range [${t.minDist.toFixed(0)}..${t.maxDist.toFixed(0)}] sunR=${baseline.sunRadius.toFixed(0)} → ${status}`
    )
  }

  // No raw sun-crashes anywhere in the run, ever. We're testing that the
  // auto-cook trajectory holds for ALL stage-1 spawns — not just the
  // first 3 — so that as bodies die and driveSpawning fills slots, the
  // replacements ALSO orbit cleanly.
  const crashedRaw = asteroidTracks.filter(t =>
    t.died && t.died.reason === 'sun' && t.died.cooked < 5
  )
  expect(
    crashedRaw,
    `${crashedRaw.length}/${asteroidTracks.length} asteroids crashed raw into the sun (deathReason=sun, cooked<5s)`
  ).toEqual([])

  // Sanity: at least one auto-cook body must reach the heat zone, or
  // we're not actually testing cooking — we're testing "spawn at apogee
  // then orbit out forever." Orbits should dip through the zone.
  const enteredZone = asteroidTracks.filter(t => t.minDist <= baseline.zoneOuter && t.maxDist >= baseline.zoneInner)
  expect(enteredZone.length, 'at least one asteroid should reach the heat zone').toBeGreaterThanOrEqual(1)
}

test.describe('stage-1 auto-cook orbit stability', () => {
  test('fresh save: every spawn orbits cleanly for 60 s', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[browser ${msg.type()}] ${msg.text()}`)
      }
    })
    await setupGame(page)
    const baseline0 = await sample(page)
    const label = `[${VIEWPORT_LABEL(page)} fresh] world=${baseline0.worldW}×${baseline0.worldH} sunR=${baseline0.sunRadius.toFixed(1)} zone=[${baseline0.zoneInner.toFixed(1)}..${baseline0.zoneOuter.toFixed(1)}]`
    console.log(label)
    // 60 s is long enough to exercise driveSpawning fill-in (every 1.3 s
    // wall, slowed to ~2.2 s by simSpeed) and ride past the first orbital
    // period (~16 s wall × slow-mo).
    const { baseline, tracks } = await observeOrbits(page, 60)
    reportAndAssert(label, baseline, tracks)
  })

  test('returning player (prior ripe feeds + streak): every spawn orbits cleanly for 60 s', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[browser ${msg.type()}] ${msg.text()}`)
      }
    })
    // Mirror the screenshot the user reported — 1-day streak, prior ripe
    // feeds, prior star matter, but on a fresh stage-1 episode.
    await setupGame(page, {
      totalRipeFeeds: 12,
      totalHeatEarned: 8_000,
      starMatter: 1,
      streakDays: 1
    })
    const baseline0 = await sample(page)
    const label = `[${VIEWPORT_LABEL(page)} returning] world=${baseline0.worldW}×${baseline0.worldH} sunR=${baseline0.sunRadius.toFixed(1)} zone=[${baseline0.zoneInner.toFixed(1)}..${baseline0.zoneOuter.toFixed(1)}] ripeFeeds=${baseline0.totalRipeFeeds}`
    console.log(label)
    const { baseline, tracks } = await observeOrbits(page, 60)
    reportAndAssert(label, baseline, tracks)
  })
})
