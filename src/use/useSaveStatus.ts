import { ref } from 'vue'
import type { Ref } from 'vue'
import type { SaveManager } from '@/utils/save/SaveManager'
import type { HydrateNotice } from '@/utils/save/types'

// ─── Save status surface ────────────────────────────────────────────────
//
// Reactive surface for the save layer. Composables that read localStorage
// at module-evaluation time `watch(saveDataVersion, () => reload())` so a
// late-firing strategy retry (e.g. cloud was offline at boot, came back
// later) refreshes their in-memory state.
//
// `bonusCoinsAwarded` is the coins-restored notice produced by a
// `remote-wins` merge. UI surfaces this as a toast/banner so the player
// understands why their stage / coins jumped.

/** Bumped on every successful hydrate transition. Composables watching
 *  this will re-read localStorage to pick up cloud-restored values. */
export const saveDataVersion: Ref<number> = ref(0)

/** Coins / heat awarded by the most recent `remote-wins` merge. UI reads
 *  this to show a "save restored" banner; can be cleared by the consumer. */
export const bonusCoinsAwarded: Ref<number> = ref(0)

/** Last hydrate notice (state + reason). Useful for diagnostics overlays. */
export const lastHydrateNotice: Ref<HydrateNotice | null> = ref(null)

let installed = false

export const installSaveStatus = (manager: SaveManager): void => {
  if (installed) return
  installed = true
  const strategy = manager.strategyRef
  if (!strategy.onHydrateNotice) return
  strategy.onHydrateNotice((notice) => {
    lastHydrateNotice.value = notice
    if (notice.state === 'success-with-data') {
      saveDataVersion.value += 1
    }
    if (typeof notice.bonusCoins === 'number' && notice.bonusCoins > 0) {
      bonusCoinsAwarded.value = notice.bonusCoins
    }
  })
}

const useSaveStatus = () => ({
  saveDataVersion,
  bonusCoinsAwarded,
  lastHydrateNotice
})

export default useSaveStatus
