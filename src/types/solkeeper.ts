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
  /** Trail buffer (ring) — last N positions for streak rendering */
  trail: number[]
  trailHead: number
  /** Marked true when removed; physics loop compacts. */
  dead: boolean
  /** When dead, may carry a death reason for VFX */
  deathReason?: 'sun' | 'collide' | 'eject'
  /** True while user is dragging this body */
  grabbed: boolean
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

export interface UpgradeDef {
  id: UpgradeId
  baseCost: number
  costGrowth: number
  maxLevel: number
  /** Linear/multiplicative effect per level — interpreted in useSolKeeper */
  effectPerLevel: number
}

export interface SolKeeperState {
  heat: number
  starMatter: number
  totalHeatEarned: number
  bestSession: number
  upgrades: Record<UpgradeId, number>
  achievements: string[]
}
