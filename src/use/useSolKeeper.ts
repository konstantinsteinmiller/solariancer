import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { SolKeeperState, UpgradeDef, UpgradeId } from '@/types/solkeeper'

const STORAGE_KEY = 'sol_keeper_state_v1'

export const UPGRADES: UpgradeDef[] = [
  { id: 'singularityCore', baseCost: 60, costGrowth: 1.55, maxLevel: 12, effectPerLevel: 0.20 },
  { id: 'fusionStabilizer', baseCost: 90, costGrowth: 1.50, maxLevel: 15, effectPerLevel: 0.10 },
  { id: 'attractionRadius', baseCost: 140, costGrowth: 1.55, maxLevel: 10, effectPerLevel: 0.18 },
  { id: 'automationProbe', baseCost: 250, costGrowth: 1.85, maxLevel: 5, effectPerLevel: 1.00 },
  { id: 'heatShield', baseCost: 180, costGrowth: 1.60, maxLevel: 8, effectPerLevel: 0.12 },
  { id: 'orbitalCapacity', baseCost: 320, costGrowth: 1.95, maxLevel: 6, effectPerLevel: 1.00 }
]

const defaultState = (): SolKeeperState => ({
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
    attractionRadius: 0
  },
  achievements: []
})

const loadState = (): SolKeeperState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<SolKeeperState>
    const fallback = defaultState()
    return {
      ...fallback,
      ...parsed,
      upgrades: { ...fallback.upgrades, ...(parsed.upgrades ?? {}) }
    }
  } catch {
    return defaultState()
  }
}

// Singleton state
const state: Ref<SolKeeperState> = ref(loadState())
const sessionHeat: Ref<number> = ref(0)
const isUpgradeModalOpen: Ref<boolean> = ref(false)
const isOptionsOpen: Ref<boolean> = ref(false)
const lastEarnedSplash: Ref<{ amount: number; at: number } | null> = ref(null)

const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
  } catch { /* swallow */
  }
}

const upgradeEffect = (id: UpgradeId): number => {
  const def = UPGRADES.find(u => u.id === id)
  return def ? def.effectPerLevel : 0
}

// Derived effects
const singularityPower = computed(() => 1 + state.value.upgrades.singularityCore * upgradeEffect('singularityCore'))
const fusionMultiplier = computed(() => 1 + state.value.upgrades.fusionStabilizer * upgradeEffect('fusionStabilizer'))
const attractionRadius = computed(() => 1 + state.value.upgrades.attractionRadius * upgradeEffect('attractionRadius'))
const probeCount = computed(() => (state.value.upgrades.automationProbe * upgradeEffect('automationProbe')) | 0)
const sunRadiusBonus = computed(() => 1 + state.value.upgrades.heatShield * upgradeEffect('heatShield'))
const orbitCapacityBonus = computed(() => (state.value.upgrades.orbitalCapacity * upgradeEffect('orbitalCapacity')) | 0)

const upgradeCost = (id: UpgradeId): number => {
  const def = UPGRADES.find(u => u.id === id)!
  const lvl = state.value.upgrades[id]
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, lvl))
}

const isUpgradeMaxed = (id: UpgradeId): boolean => {
  const def = UPGRADES.find(u => u.id === id)!
  return state.value.upgrades[id] >= def.maxLevel
}

const canAffordUpgrade = (id: UpgradeId): boolean => state.value.heat >= upgradeCost(id) && !isUpgradeMaxed(id)

const buyUpgrade = (id: UpgradeId): boolean => {
  if (!canAffordUpgrade(id)) return false
  const cost = upgradeCost(id)
  state.value = {
    ...state.value,
    heat: state.value.heat - cost,
    upgrades: { ...state.value.upgrades, [id]: state.value.upgrades[id] + 1 }
  }
  saveState()
  return true
}

const addHeat = (amount: number) => {
  if (amount <= 0) return
  state.value.heat += amount
  state.value.totalHeatEarned += amount
  sessionHeat.value += amount
  if (sessionHeat.value > state.value.bestSession) {
    state.value.bestSession = sessionHeat.value
  }
  // throttle saves: every ~64 units
  if (Math.random() < 0.04) saveState()
}

const addStarMatter = (amount: number) => {
  if (amount <= 0) return
  state.value.starMatter += amount
  saveState()
}

const resetSession = () => {
  sessionHeat.value = 0
}

const fullReset = () => {
  state.value = defaultState()
  sessionHeat.value = 0
  saveState()
}

const flushSave = () => saveState()

export default function useSolKeeper() {
  return {
    state,
    sessionHeat,
    isUpgradeModalOpen,
    isOptionsOpen,
    lastEarnedSplash,
    UPGRADES,
    singularityPower,
    fusionMultiplier,
    attractionRadius,
    probeCount,
    sunRadiusBonus,
    orbitCapacityBonus,
    upgradeCost,
    isUpgradeMaxed,
    canAffordUpgrade,
    buyUpgrade,
    addHeat,
    addStarMatter,
    resetSession,
    fullReset,
    flushSave
  }
}
