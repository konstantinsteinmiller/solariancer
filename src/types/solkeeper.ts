export type BodyKind = 'asteroid' | 'rocky' | 'gas' | 'ice' | 'jewel'

export interface CelestialBody {
  id: number
  kind: BodyKind
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  mass: number
  hue: number
  rotation: number
  rotationSpeed: number
  /** Pre-baked surface detail rendered into a tiny offscreen canvas */
  pattern?: HTMLCanvasElement
  /** Heat per second value while orbiting */
  yieldRate: number
  /** Bonus heat granted when fed to the sun */
  sunFeedBonus: number
  /** Time alive — used to fade in newcomers */
  age: number
  /** Bookkeeping for the physics step; cleared each frame */
  ax: number
  ay: number
  /** Smoothed orbit-stability score (0..1) */
  orbitStability: number
  /** Time spent in stable orbit, used to award bonus tickers */
  stableSeconds: number
  /** True while the body's centre is inside the Heat Zone annulus around the sun */
  inHeatZone: boolean
  /** True while the body is inside the (narrower, hotter) Close-to-Sun annulus */
  inCloseZone: boolean
  /** Continuous seconds spent inside the Heat Zone — 10s makes a body "ripe" */
  cookedSeconds: number
  /** Remaining bounces granted by the Surface Tension upgrade. 0 = next sun touch destroys. */
  bouncesLeft: number
  /** Short-lived visual flash timer for magnet snap / bounce / cooked transitions. */
  fxFlash: number
  /** Count of zone-heat ticks this body has earned. Capped — see ZONE_HEAT_TICKS_MAX. */
  zoneHeatTicks: number
  /** Trail buffer (ring) — last N positions for streak rendering */
  trail: number[]
  trailHead: number
  /** Marked true when removed; physics loop compacts. */
  dead: boolean
  /** When dead, may carry a death reason for VFX */
  deathReason?: 'sun' | 'collide' | 'eject'
  /** True while user is dragging this body */
  grabbed: boolean
  /** Marks an event-spawned comet — visually distinct, awards big bonus on first grab. */
  isComet?: boolean
  /** Once a comet has been "caught", flip this so the reward is paid only once. */
  cometCaught?: boolean
}

export interface SolStreak {
  /** Consecutive day-count of sessions where the player fed at least one ripe body. */
  days: number
  /** ISO date (YYYY-MM-DD) of the last day the streak ticked. */
  lastDateISO: string | null
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
  shrink: number
  alpha: number
}

export interface ScorePopup {
  x: number
  y: number
  text: string
  life: number
  maxLife: number
  color: string
  vy: number
  size: number
}

export type UpgradeId =
  | 'singularityCore'
  | 'fusionStabilizer'
  | 'automationProbe'
  | 'heatShield'
  | 'orbitalCapacity'
  | 'attractionRadius'
  | 'surfaceTension'
  | 'cosmicForge'
  | 'bigProbeStation'

export type UpgradeCurrency = 'heat' | 'starMatter'

export interface UpgradeDef {
  id: UpgradeId
  baseCost: number
  costGrowth: number
  maxLevel: number
  /** Linear/multiplicative effect per level — interpreted in useSolKeeper */
  effectPerLevel: number
  /** Defaults to 'heat'. Cosmic-tier upgrades are paid in star matter. */
  currency?: UpgradeCurrency
  /** Optional secondary heat cost (paid in addition to the primary currency). */
  heatCostBase?: number
  heatCostGrowth?: number
}

export interface SolKeeperState {
  heat: number
  starMatter: number
  totalHeatEarned: number
  bestSession: number
  upgrades: Record<UpgradeId, number>
  achievements: string[]
  /** True after the player has completed (or skipped) the intro tutorial. */
  tutorialSeen: boolean
  /** True after the player has completed (or skipped) the advanced tutorial (combo / crowd). */
  tutorialAdvancedSeen: boolean
  /** Daily-feed streak — drives sun-skin progression and is a return-on-day-2 hook. */
  streak: SolStreak
  /** Lifetime tally of ripe sun-feeds — drives Black Hole event scheduling and stats. */
  totalRipeFeeds: number
  /** Lifetime comet catches — pure stat for prestige UI down the road. */
  totalCometsCaught: number
  /** Lifetime survived black holes — same. */
  totalBlackHolesSurvived: number
  /** Best combo chain ever reached. Persists across prestige. */
  bestComboChain: number
  /** Highest stage ever reached. Persists across prestige (stage itself resets). */
  highestStage: number
  /** Lifetime missions completed (chose a reward). */
  totalMissionsCompleted: number
  /** Solar Class — permanent rank gained on Supernova prestige. +5%/rank to all heat. */
  solarClass: number
  /** Lifetime heat earned at the moment of the most recent prestige. */
  lifetimeHeatAtReset: number
  /** True once the player has triggered (and seen) their first 3+ combo
   *  celebration. Stops the oversized "+50 BP COMBO!" overlay from firing
   *  again after the onboarding moment is over. */
  firstComboCelebrated: boolean
  /** Current stage number (1+). Each stage clears at STAGE_HEAT_GOAL heat earned. */
  stage: number
  /** Heat earned toward the current stage (resets to overflow on stage advance). */
  stageProgress: number
  /** Persisted player preferences for the Solariancer UI. */
  preferences: SolKeeperPreferences
}

export interface SolKeeperPreferences {
  /** Show the per-session heat badge in the HUD. Off by default; opt-in via Settings. */
  showSessionBadge: boolean
  /** Override for the sun palette. -1 means auto (follow current stage). 0..7 picks a specific palette. */
  selectedSunSkin: number
  /** Highest sun-skin tier (0..7) the player has unlocked by reaching that stage. */
  unlockedSunSkin: number
  /** Trail palette: 'auto' uses the body's hue. Other values override. */
  trailPalette: 'auto' | 'rainbow' | 'ember' | 'plasma' | 'aurora'
  /** Trail palettes the player has unlocked through milestones. 'auto' is always included. */
  unlockedTrails: string[]
}
