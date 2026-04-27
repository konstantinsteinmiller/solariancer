import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Stage-1 auto-cook orbit-stability test ───────────────────────────────
//
// Drives the live physics module (no Vue component, no canvas, no
// browser) through 60 simulated seconds of stage-1 onboarding. For every
// body the spawner emits, we record:
//   • spawn position + initial dist from sun
//   • min / max distance from sun across the run
//   • cookedSeconds at end of run (or at death)
//   • death reason (sun / eject / collide / null)
//
// Pass criteria:
//   • NO asteroid dies with deathReason='sun' while cookedSeconds < 5
//     (= "raw crash") at any of the three viewport shapes.
//
// We run three configurations to mirror the 3 Playwright projects we
// were going to use:
//   • desktop  1280×720
//   • tablet    768×1024
//   • mobile    393×727
//
// The fixed-step renderer loop normally drives `physics.tick(dt)`; here
// we call it directly with FIXED_DT just like `useSolKeeperRenderer`
// does. With slow-time multiplier active on stage 1, each tick
// corresponds to FIXED_DT * simSpeedMultiplier real-world seconds of
// motion — so 60 seconds of wall time = 60 / 0.6 = 100 real seconds of
// elapsed orbit.

// We do NOT static-import useGravityPhysics or useSolKeeper here — both
// are module singletons and we need to re-load them per test (after
// changing localStorage) to get a fresh sk + physics state.

const FIXED_DT = 1 / 60
const TOTAL_SIM_SECONDS = 60
const TICKS = Math.ceil(TOTAL_SIM_SECONDS / FIXED_DT)

interface Track {
  id: number
  kind: string
  spawnX: number
  spawnY: number
  minDist: number
  maxDist: number
  maxCooked: number
  died?: { reason: string | null; cookedAt: number }
}

const VIEWPORTS = [
  { name: 'desktop', w: 1280, h: 720 },
  { name: 'tablet', w: 768, h: 1024 },
  { name: 'mobile', w: 393, h: 727 }
] as const

const KEEPER_KEY = 'sol_state_v1'

const seedFreshSave = () => {
  // Mirror the same fresh stage-1 baseline the e2e test uses. Tutorial
  // marked seen so initWorld plants its seed ring without the tutorial
  // hijacking the world.
  localStorage.setItem(
    KEEPER_KEY,
    JSON.stringify({
      heat: 0,
      starMatter: 0,
      totalHeatEarned: 0,
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
      streak: { days: 0, lastDateISO: null },
      totalRipeFeeds: 0,
      totalCometsCaught: 0,
      totalBlackHolesSurvived: 0,
      bestComboChain: 0,
      highestStage: 1,
      totalMissionsCompleted: 0,
      solarClass: 0,
      lifetimeHeatAtReset: 0,
      firstComboCelebrated: false,
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
  )
}

const seedReturningSave = (stageProgress = 0) => {
  // Player who already has a streak + ripe feeds + star matter. The
  // gating fix means stage-1 helpers should engage regardless of
  // stageProgress as long as state.stage === 1. We test multiple
  // stageProgress values to catch any future re-introduction of an
  // intermediate-progress fault zone.
  localStorage.setItem(
    KEEPER_KEY,
    JSON.stringify({
      heat: 0,
      starMatter: 1,
      totalHeatEarned: 8000,
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
      streak: { days: 1, lastDateISO: new Date().toISOString().slice(0, 10) },
      totalRipeFeeds: 12,
      totalCometsCaught: 0,
      totalBlackHolesSurvived: 0,
      bestComboChain: 0,
      highestStage: 1,
      totalMissionsCompleted: 0,
      solarClass: 0,
      lifetimeHeatAtReset: 0,
      firstComboCelebrated: false,
      stage: 1,
      stageProgress,
      preferences: {
        showSessionBadge: false,
        selectedSunSkin: -1,
        unlockedSunSkin: 0,
        trailPalette: 'auto',
        unlockedTrails: ['auto']
      }
    })
  )
}

interface RunResult {
  tracks: Map<number, Track>
  cx: number
  cy: number
  zoneInner: number
  zoneOuter: number
}

const runSimulation = async (w: number, h: number): Promise<RunResult> => {
  // Re-import the physics module fresh per simulation so module-level
  // state (singleton bodies array, spawn counters, sk singleton) starts
  // clean. Caller is responsible for vi.resetModules() before this.
  const mod = await import('@/use/useGravityPhysics')
  const physics = mod.default()
  mod.worldWidth.value = w
  mod.worldHeight.value = h
  physics.initWorld(w, h)

  const cx = w / 2
  const cy = h / 2
  const tracks = new Map<number, Track>()

  for (let i = 0; i < TICKS; i++) {
    physics.tick(FIXED_DT)
    for (const b of physics.bodies.value) {
      const dist = Math.hypot(b.x - cx, b.y - cy)
      let track = tracks.get(b.id)
      if (!track) {
        track = {
          id: b.id,
          kind: b.kind,
          spawnX: b.x,
          spawnY: b.y,
          minDist: dist,
          maxDist: dist,
          maxCooked: b.cookedSeconds
        }
        tracks.set(b.id, track)
      }
      if (!b.dead) {
        track.minDist = Math.min(track.minDist, dist)
        track.maxDist = Math.max(track.maxDist, dist)
        track.maxCooked = Math.max(track.maxCooked, b.cookedSeconds)
      } else if (!track.died) {
        track.died = { reason: b.deathReason ?? null, cookedAt: b.cookedSeconds }
      }
    }
  }

  return {
    tracks,
    cx,
    cy,
    zoneInner: physics.heatZoneInner.value,
    zoneOuter: physics.heatZoneOuter.value
  }
}

const reportAndAssert = (label: string, r: RunResult, sunRadius: number) => {
  const asteroidTracks = [...r.tracks.values()]
    .filter(t => t.kind === 'asteroid')
    .sort((a, b) => a.id - b.id)

  console.log(
    `${label} zone=[${r.zoneInner.toFixed(1)}..${r.zoneOuter.toFixed(1)}] sunR=${sunRadius.toFixed(1)} bodies=${asteroidTracks.length}`
  )
  for (const t of asteroidTracks) {
    const status = t.died
      ? `DIED reason=${t.died.reason} cooked=${t.died.cookedAt.toFixed(1)}s`
      : `alive cooked=${t.maxCooked.toFixed(1)}s`
    console.log(
      `  body#${t.id}: spawn(${t.spawnX.toFixed(0)}, ${t.spawnY.toFixed(0)}) ` +
      `dist [${t.minDist.toFixed(0)}..${t.maxDist.toFixed(0)}] → ${status}`
    )
  }

  const crashed = asteroidTracks.filter(
    t => t.died?.reason === 'sun' && t.died.cookedAt < 5
  )
  expect(
    crashed.map(t => `#${t.id} cooked=${t.died!.cookedAt.toFixed(1)}s`),
    `${crashed.length}/${asteroidTracks.length} asteroids crashed raw into the sun (deathReason=sun, cooked<5)`
  ).toEqual([])

  const enteredZone = asteroidTracks.filter(
    t => t.minDist <= r.zoneOuter && t.maxDist >= r.zoneInner
  )
  expect(enteredZone.length).toBeGreaterThanOrEqual(1)
}

describe('stage-1 auto-cook orbit stability (jsdom physics)', () => {
  beforeEach(() => {
    // Drop module cache — useSolKeeper + useGravityPhysics both read
    // localStorage at module-init, so to test from a different save we
    // must re-evaluate from scratch.
    vi.resetModules()
  })

  for (const vp of VIEWPORTS) {
    it(`fresh save: ${vp.name} ${vp.w}×${vp.h}`, async () => {
      seedFreshSave()
      vi.resetModules()
      const result = await runSimulation(vp.w, vp.h)
      const physics = (await import('@/use/useGravityPhysics')).default()
      reportAndAssert(
        `[${vp.name} fresh ${vp.w}×${vp.h}]`,
        result,
        physics.sunRadius.value
      )
    })

    it(`returning player (stageProgress=0): ${vp.name} ${vp.w}×${vp.h}`, async () => {
      seedReturningSave(0)
      vi.resetModules()
      const result = await runSimulation(vp.w, vp.h)
      const physics = (await import('@/use/useGravityPhysics')).default()
      reportAndAssert(
        `[${vp.name} returning sp=0 ${vp.w}×${vp.h}]`,
        result,
        physics.sunRadius.value
      )
    })

    // The user-reported "<300 heat all still crash" scenario — stageProgress
    // sits in what used to be the gating fault zone (200-500). After the
    // fix, stage1HintsActive covers ALL of stage 1, so this should orbit
    // identically to stageProgress=0.
    it(`returning player (stageProgress=250): ${vp.name} ${vp.w}×${vp.h}`, async () => {
      seedReturningSave(250)
      vi.resetModules()
      const result = await runSimulation(vp.w, vp.h)
      const physics = (await import('@/use/useGravityPhysics')).default()
      reportAndAssert(
        `[${vp.name} returning sp=250 ${vp.w}×${vp.h}]`,
        result,
        physics.sunRadius.value
      )
    })
  }
})
