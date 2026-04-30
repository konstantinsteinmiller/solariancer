import { ref } from 'vue'
import type { Ref } from 'vue'
import type { AdProvider } from './types'
import {
  gameDistributionPlugin,
  gdSdkReady,
  gdAdsBlocked,
  gdShowMidgameAd,
  gdShowRewardedAd
} from '@/utils/gameDistributionPlugin'

// ─── GameDistribution ad provider ────────────────────────────────────────
//
// Wraps the GD SDK behind the project's `AdProvider` interface. Two
// idiosyncrasies worth knowing:
//
//   1. GD's `showAd` returns a Promise that resolves on completion — but
//      "completion" includes errors (no fill, ad blocker, IMA 303, etc.).
//      The SDK fires `SDK_REWARDED_WATCH_COMPLETE` only on full playthrough,
//      so we treat the promise resolution as "ad cycle finished" and rely
//      on the SDK event for the reward signal — wrapped in `gdShowRewardedAd`.
//
//   2. `isRewardedReady` flips `true` immediately after `init` because GD
//      does not surface a "loaded" signal — they preload the next slot
//      transparently and fail with no-fill at show time. This means the
//      "Watch ad" button stays visible always; if the dev preview has no
//      demand, the user gets a `completed=false` from the showRewardedAd
//      call (== legitimate no-fill, NOT a wiring bug — see PITFALLS.md §6).

export const createGameDistributionProvider = (): AdProvider => {
  const isReady: Ref<boolean> = ref(false)
  const isRewardedReady: Ref<boolean> = ref(false)
  const isInterstitialReady: Ref<boolean> = ref(false)

  const init = async (): Promise<void> => {
    await gameDistributionPlugin()
    // Promote SDK ready state into the provider's reactive surface.
    isReady.value = gdSdkReady.value
    if (!gdAdsBlocked.value) {
      // GD doesn't surface a per-format "loaded" signal — we optimistically
      // mark both available; failures bubble up at show time.
      isRewardedReady.value = true
      isInterstitialReady.value = true
    }
  }

  const showRewardedAd = async (): Promise<boolean> => {
    if (!isRewardedReady.value) return false
    return gdShowRewardedAd()
  }

  const showMidgameAd = async (): Promise<void> => {
    if (!isInterstitialReady.value) return
    return gdShowMidgameAd()
  }

  return {
    name: 'gameDistribution',
    isReady,
    isRewardedReady,
    isInterstitialReady,
    init,
    showRewardedAd,
    showMidgameAd
  }
}
