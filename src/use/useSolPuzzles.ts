import { ref } from 'vue'
import useSolariancer from '@/use/useSolariancer'
import useSolEvents from '@/use/useSolEvents'
import {
  tutorialMode,
  crowdBonusActive,
  singularityActive,
  spawnPopup,
  spawnParticles,
  worldCenterX,
  worldCenterY,
  bodies
} from '@/use/useGravityPhysics'
import { COOK_TIME_SECONDS } from '@/use/useGravityPhysics'

// ─── Constellation puzzles ─────────────────────────────────────────────────
//
// Skill-tested mini-objectives that run in parallel with the Mission system.
// Where Missions test heat output, puzzles test technique. One active
// puzzle at a time, ~45-second window, +2 ✦ Star Matter on success.
//
// Implemented puzzles:
//   - "Crowd Master"  — accumulate 5 seconds of Crowd Bonus active
//   - "Comet Hunter"  — catch 2 comets within the puzzle window
//   - "Solo Survivor" — survive a Black Hole event with NO singularity created
//   - "Heat Wave"     — earn N heat while a Solar Flare is active
//   - "Chain Master"  — reach a ×3 combo (5+ chained ripe feeds)
//   - "Triple Star"   — have 3 ripe bodies alive at the same time
//   - "Forge Sprint"  — earn N heat anywhere in the puzzle window
//   - "Pristine"      — never trigger the singularity for the full window

const PUZZLE_DURATION = 45            // seconds
const PUZZLE_BREAK = 30               // seconds between puzzles
const REWARD_STAR_MATTER = 2

export type PuzzleId =
  | 'crowd' | 'comet' | 'solo'
  | 'flare' | 'chain' | 'ripe3' | 'sprint' | 'pristine'

export interface PuzzleDef {
  id: PuzzleId
}

// Definitions are pure id list — title + description live in the locale
// files under `game.puzzle.<id>.{title,description}`. Components look them
// up via t() so every language renders correctly.
const PUZZLES: PuzzleDef[] = [
  { id: 'crowd' },
  { id: 'comet' },
  { id: 'solo' },
  { id: 'flare' },
  { id: 'chain' },
  { id: 'ripe3' },
  { id: 'sprint' },
  { id: 'pristine' }
]

// Looks up the active locale's translation for a puzzle progress phrase.
// Used by the per-puzzle progress label below — the label itself is built
// here (it includes counters and units) but the English-only words come
// from i18n. Falls back to the English string if i18n is unavailable.
const tx = (key: string, fallback: string): string => {
  const t = (window as any).__i18n?.global?.t
  if (typeof t !== 'function') return fallback
  try {
    const v = t(key)
    return typeof v === 'string' && v.length > 0 ? v : fallback
  } catch {
    return fallback
  }
}

const activePuzzle = ref<PuzzleDef | null>(null)
const puzzleStartedAtMs = ref(0)
const puzzleProgress = ref(0)         // 0..1 (puzzle-specific meaning)
const puzzleProgressLabel = ref('')   // small display string ("3.2s / 5s", "1 / 2", etc.)
let nextPuzzleAtMs = performance.now() + PUZZLE_BREAK * 1000

// Per-puzzle scratch state
let crowdSecondsAccum = 0
let cometCountAtStart = 0
let blackHoleAtStart = false
let blackHoleCleared = false  // event ended successfully during this puzzle
let singularityUsedDuringPuzzle = false
// New scratch
let heatAtStart = 0           // baseline heat at puzzle start (for flare / sprint)
let heatDuringFlare = 0       // accumulated for 'flare' puzzle
let comboPeak = 0             // peak combo count seen in window (for 'chain')

// puzzleTimeLeft is a REF (not a computed) because it needs to update every
// frame as `performance.now()` advances — Vue can't track that as a reactive
// dependency. The tick/evaluate functions below write the new value.
const puzzleTimeLeft = ref(0)

const startPuzzle = () => {
  if (activePuzzle.value) return
  const sk = useSolariancer()
  const def = PUZZLES[Math.floor(Math.random() * PUZZLES.length)]!
  activePuzzle.value = def
  puzzleStartedAtMs.value = performance.now()
  puzzleProgress.value = 0
  puzzleProgressLabel.value = ''
  // Per-puzzle scratch
  crowdSecondsAccum = 0
  cometCountAtStart = sk.state.value.totalCometsCaught
  blackHoleAtStart = false
  blackHoleCleared = false
  singularityUsedDuringPuzzle = false
  heatAtStart = sk.state.value.heat
  heatDuringFlare = 0
  comboPeak = sk.comboCount.value
  lastHeat = sk.state.value.heat
}

const succeed = () => {
  if (!activePuzzle.value) return
  const sk = useSolariancer()
  sk.addStarMatter(REWARD_STAR_MATTER)
  const titleStr = tx(`game.puzzle.${activePuzzle.value.id}.title`, activePuzzle.value.id)
  // Localised "PUZZLE: <title>!" — popup template lives in `popup.puzzleSolved`.
  const headline = tx('game.popup.puzzleSolved', `PUZZLE: ${titleStr}!`)
    .replace('{title}', titleStr)
  spawnPopup(worldCenterX.value, worldCenterY.value - 110, headline, '#a070ff', 26)
  spawnPopup(worldCenterX.value, worldCenterY.value - 80, `+${REWARD_STAR_MATTER} ✦`, '#c8a8ff', 22)
  spawnParticles(worldCenterX.value, worldCenterY.value, 22, 280, 220, 4, 0.8)
  activePuzzle.value = null
  nextPuzzleAtMs = performance.now() + PUZZLE_BREAK * 1000
}

const fail = () => {
  activePuzzle.value = null
  nextPuzzleAtMs = performance.now() + PUZZLE_BREAK * 1000
}

// Track heat earned this frame for puzzles that need a per-frame delta (the
// 'flare' puzzle only counts heat that lands while a Solar Flare is up).
let lastHeat = 0

const evaluate = (dt: number) => {
  if (!activePuzzle.value) return
  const sk = useSolariancer()
  const events = useSolEvents()
  const now = performance.now()
  const elapsed = (now - puzzleStartedAtMs.value) / 1000
  puzzleTimeLeft.value = Math.max(0, PUZZLE_DURATION - elapsed)

  // Per-frame heat delta (used by 'flare' to attribute earnings to flare
  // windows only). `lastHeat` is reseeded on each puzzle start below via
  // the dedicated branch — until it has a meaningful baseline we treat
  // delta as zero rather than feeding garbage forward.
  const heatNow = sk.state.value.heat
  const heatDelta = Math.max(0, heatNow - lastHeat)
  lastHeat = heatNow

  switch (activePuzzle.value.id) {
    case 'crowd': {
      if (crowdBonusActive.value) crowdSecondsAccum += dt
      const goal = 5
      puzzleProgress.value = Math.min(1, crowdSecondsAccum / goal)
      puzzleProgressLabel.value = `${crowdSecondsAccum.toFixed(1)}s / ${goal}s`
      if (crowdSecondsAccum >= goal) succeed()
      break
    }
    case 'comet': {
      const caught = sk.state.value.totalCometsCaught - cometCountAtStart
      const goal = 2
      puzzleProgress.value = Math.min(1, caught / goal)
      puzzleProgressLabel.value = `${caught} / ${goal}`
      if (caught >= goal) succeed()
      break
    }
    case 'solo': {
      // Track when a black-hole event begins/ends during the puzzle.
      // Track if the player creates a singularity at any point.
      const bh = events.blackHoleActive.value
      if (singularityActive.value) singularityUsedDuringPuzzle = true
      if (bh && !blackHoleAtStart) blackHoleAtStart = true
      if (!bh && blackHoleAtStart && !blackHoleCleared) blackHoleCleared = true
      // Display: tells the player what we're waiting for
      puzzleProgressLabel.value = blackHoleCleared
        ? (singularityUsedDuringPuzzle
          ? tx('game.puzzle.progress.survivedHit', 'survived (touched)')
          : tx('game.puzzle.progress.survived', 'SURVIVED — no touch!'))
        : (blackHoleAtStart
          ? tx('game.puzzle.progress.inEvent', 'in event…')
          : tx('game.puzzle.progress.awaitingBH', 'awaiting BH'))
      puzzleProgress.value = blackHoleCleared ? (singularityUsedDuringPuzzle ? 0.5 : 1) : 0
      if (blackHoleCleared) {
        if (singularityUsedDuringPuzzle) fail()
        else succeed()
      }
      break
    }
    case 'flare': {
      // Earn heat WHILE a Solar Flare is up. Counts only the heat earned
      // during flare-active frames, so the player has to deliberately
      // stage bodies into the zone for the flare window.
      if (events.flareActive.value) heatDuringFlare += heatDelta
      const goal = 800
      puzzleProgress.value = Math.min(1, heatDuringFlare / goal)
      puzzleProgressLabel.value = `${Math.round(heatDuringFlare)} / ${goal}`
        + (events.flareActive.value
          ? ` ${tx('game.puzzle.progress.flameOn', '🔥')}`
          : ` ${tx('game.puzzle.progress.waiting', '(waiting)')}`)
      if (heatDuringFlare >= goal) succeed()
      break
    }
    case 'chain': {
      // Reach a ×3 combo (combo count >= 5) at any point in the window.
      const goal = 5
      if (sk.comboCount.value > comboPeak) comboPeak = sk.comboCount.value
      puzzleProgress.value = Math.min(1, comboPeak / goal)
      puzzleProgressLabel.value = `${tx('game.puzzle.progress.peak', 'peak')} ×${Math.min(comboPeak, goal)} / ×${goal}`
      if (comboPeak >= goal) succeed()
      break
    }
    case 'ripe3': {
      // Have at least 3 ripe bodies alive simultaneously at one moment.
      let ripeNow = 0
      for (const b of bodies.value) {
        if (b.dead) continue
        if (b.cookedSeconds >= COOK_TIME_SECONDS) ripeNow++
      }
      const goal = 3
      puzzleProgress.value = Math.min(1, ripeNow / goal)
      puzzleProgressLabel.value = `${ripeNow} / ${goal} ${tx('game.puzzle.progress.ripe', 'ripe')}`
      if (ripeNow >= goal) succeed()
      break
    }
    case 'sprint': {
      // Earn N heat anywhere in the puzzle window (raw output check).
      const earned = sk.state.value.heat - heatAtStart
      const goal = 1500
      puzzleProgress.value = Math.min(1, earned / goal)
      puzzleProgressLabel.value = `${Math.round(earned)} / ${goal}`
      if (earned >= goal) succeed()
      break
    }
    case 'pristine': {
      // Survive the entire 45 s without touching the singularity. Fail
      // immediately on activation; success is awarded by the timeout
      // branch below if the player never tripped it.
      if (singularityActive.value) singularityUsedDuringPuzzle = true
      puzzleProgress.value = singularityUsedDuringPuzzle
        ? 0
        : Math.min(1, elapsed / PUZZLE_DURATION)
      puzzleProgressLabel.value = singularityUsedDuringPuzzle
        ? tx('game.puzzle.progress.broken', 'broken')
        : `${Math.round(PUZZLE_DURATION - elapsed)}s ${tx('game.puzzle.progress.left', 'left')}`
      if (singularityUsedDuringPuzzle) {
        fail()
        return
      }
      break
    }
  }

  // Timeout — for most puzzles this means the goal wasn't met. The
  // 'pristine' puzzle is the inverse: surviving the full window without
  // tripping the singularity IS the success condition.
  if (elapsed >= PUZZLE_DURATION) {
    if (activePuzzle.value?.id === 'pristine' && !singularityUsedDuringPuzzle) succeed()
    else fail()
  }
}

const tick = (dt: number) => {
  if (tutorialMode.value) return
  if (activePuzzle.value) {
    evaluate(dt)
    return
  }
  puzzleTimeLeft.value = 0
  if (performance.now() >= nextPuzzleAtMs) startPuzzle()
}

const reset = () => {
  activePuzzle.value = null
  puzzleTimeLeft.value = 0
  nextPuzzleAtMs = performance.now() + PUZZLE_BREAK * 1000
}

export default function useSolPuzzles() {
  return {
    activePuzzle,
    puzzleTimeLeft,
    puzzleProgress,
    puzzleProgressLabel,
    tick,
    reset
  }
}
