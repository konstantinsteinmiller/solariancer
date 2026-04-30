import { ref } from 'vue'
import { GameDistributionStrategy } from '@/utils/save/GameDistributionStrategy'
import type { SaveStrategy } from '@/utils/save/types'

// ─── GameDistribution plugin ─────────────────────────────────────────────
//
// Loads the GD SDK script, configures it with our game ID (from
// VITE_GAME_DISTRIBUTION_GAME_ID), and exposes `showRewardedAd` /
// `showMidgameAd` wrappers used by `GameDistributionProvider`.
//
// Two surfaces:
//
//   1. `createGameDistributionSaveStrategy()` — returned to the boot
//      pipeline. Always returns a strategy (GD's "save" is just
//      localStorage — the strategy is a thin Strategy-shaped no-op).
//
//   2. `gameDistributionPlugin()` — fire-and-forget kicker that injects
//      the GD SDK script tag, wires the global `GD_OPTIONS`, and listens
//      for `SDK_READY` / `SDK_GAME_START` lifecycle events.
//
// Both are loaded via dynamic `import('@/utils/gameDistributionPlugin')`
// from `main.ts` (which is in the obfuscator's exclude list so the
// dynamic import is safe — see PITFALLS.md §1).

const GD_SDK_URL = 'https://html5.api.gamedistribution.com/main.min.js'

export const gdAdsBlocked = ref(false)
export const gdSdkReady = ref(false)
export const gdRewardedReady = ref(false)
export const gdInterstitialReady = ref(false)

let initialized = false
let pluginPromise: Promise<void> | null = null

const resolveGameId = (): string | null => {
  const id = import.meta.env.VITE_GAME_DISTRIBUTION_GAME_ID
  if (typeof id === 'string' && id.length > 0) return id
  return null
}

export const createGameDistributionSaveStrategy = (): SaveStrategy => {
  // GD has no cloud save API. Strategy is a Strategy-shaped no-op.
  return new GameDistributionStrategy()
}

/** Poke the GD SDK to load. Safe to call multiple times — coalesces. */
export const gameDistributionPlugin = (): Promise<void> => {
  if (pluginPromise) return pluginPromise
  pluginPromise = (async () => {
    if (initialized) return
    initialized = true
    const gameId = resolveGameId()
    if (!gameId) {
      console.warn('[gd] VITE_GAME_DISTRIBUTION_GAME_ID is empty — SDK not loaded.')
      return
    }
    try {
      installGdOptions(gameId)
      await loadGdSdk()
    } catch (e) {
      console.warn('[gd] SDK load failed (likely ad blocker)', e)
      gdAdsBlocked.value = true
    }
  })()
  return pluginPromise
}

const installGdOptions = (gameId: string): void => {
  const w = window as any
  // GD's pre-init config object — must exist BEFORE the SDK script loads.
  // `tagForChildDirectedTreatment: true` is a responsible default since GD
  // aggregates traffic that includes under-13 players. Even non-kids games
  // should set this — GD's bidders honor the flag.
  w.GD_OPTIONS = {
    gameId,
    advertisementSettings: {
      autoplay: false
    },
    tagForChildDirectedTreatment: true,
    onEvent: (event: { name: string; message?: string }) => {
      switch (event.name) {
        case 'SDK_READY':
          gdSdkReady.value = true
          break
        case 'SDK_REWARDED_WATCH_COMPLETE':
          // Provider listens via `showRewardedAd` promise.
          break
        case 'AD_SDK_LOADER_READY':
        case 'SDK_GAME_START':
        case 'SDK_GAME_PAUSE':
          break
        case 'AD_BLOCKER_DETECTED':
          gdAdsBlocked.value = true
          break
        default:
          // Most lifecycle events are informational; no action needed.
          break
      }
    }
  }
}

const loadGdSdk = (): Promise<void> => new Promise<void>((resolve, reject) => {
  const existing = document.querySelector(`script[src="${GD_SDK_URL}"]`)
  if (existing) return resolve()
  const tag = document.createElement('script')
  tag.src = GD_SDK_URL
  tag.async = true
  tag.onload = () => resolve()
  tag.onerror = () => reject(new Error('GD SDK load error'))
  document.head.appendChild(tag)
})

/** Show a rewarded ad. Resolves `true` only on full video playthrough.
 *  Returns `false` on any failure / skip / no-fill. */
export const gdShowRewardedAd = async (): Promise<boolean> => {
  const w = window as any
  const sdk = w.gdsdk
  if (!sdk?.showAd) return false
  try {
    await sdk.showAd('rewarded')
    return true
  } catch (e) {
    console.warn('[gd] rewarded ad failed', e)
    return false
  }
}

/** Show an interstitial / midgame ad. Never throws — resumes gameplay
 *  whether the ad served or not. */
export const gdShowMidgameAd = async (): Promise<void> => {
  const w = window as any
  const sdk = w.gdsdk
  if (!sdk?.showAd) return
  try {
    await sdk.showAd('interstitial')
  } catch (e) {
    console.warn('[gd] midgame ad failed', e)
  }
}
