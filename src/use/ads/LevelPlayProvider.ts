// Unity LevelPlay (ironSource) provider, wired through the Tauri plugin
// at `src-tauri/plugins/tauri-plugin-levelplay/`. COPPA / Families
// Policy flags are applied on the native side BEFORE `LevelPlay.init`
// so every mediation adapter picks them up — see the Kotlin class doc
// for the ordering rationale.
//
// Surface:
//   • `init()` invokes the native init command once, flips `isReady`
//     true on success, and is idempotent. Any failure leaves
//     `isReady` false so the ad placements stay hidden (the "failsafe"
//     behaviour we want on partially-configured builds).
//   • `showRewardedAd()` resolves `true` only if the video played all
//     the way through AND the reward was credited.
//   • `showMidgameAd()` resolves when the interstitial closed or failed.
//
// Per-format readiness (`isRewardedReady`, `isInterstitialReady`)
// reflects the actual SDK ad-load state, not just init status. The
// native plugin emits a `rewarded-state` / `interstitial-state` event
// with `{ ready: boolean }` from the LevelPlay listener callbacks
// (onAdLoaded → ready=true, onAdLoadFailed/onAdClosed/onAdDisplayFailed
// → ready=false). The flag flips back to true after the auto-reload
// queued in onAdClosed succeeds. Components gate v-if on these refs
// so a "watch ad" button never appears unless an ad is actually
// loaded and tappable.
//
// App keys & ad unit IDs are platform-specific and ship in the bundle
// from Vite env vars (they are public identifiers, not secrets).
import { ref } from 'vue'
import { invoke, addPluginListener } from '@tauri-apps/api/core'
import { isDebug } from '@/use/useMatch'
import type { AdProvider } from './types'

// Force the LevelPlay Test Suite overlay on launch. Driven from
// .env.tauri's VITE_APP_ADS_TEST_SUITE flag so you can toggle it
// without flipping the runtime debug flag in localStorage. Keep this
// set to `false` for production builds — the overlay opens an
// interactive Activity over the game.
const forceTestSuite = import.meta.env.VITE_APP_ADS_TEST_SUITE === 'true'

const androidAppKey = import.meta.env.VITE_APP_LEVELPLAY_ANDROID_APP_ID ?? ''
const iosAppKey = import.meta.env.VITE_APP_LEVELPLAY_IOS_APP_ID ?? ''
const androidRewardedAdUnit = import.meta.env.VITE_APP_LEVELPLAY_ANDROID_REWARDED_ID ?? ''
const androidInterstitialAdUnit = import.meta.env.VITE_APP_LEVELPLAY_ANDROID_INTERSTITIAL_ID ?? ''
const iosRewardedAdUnit = import.meta.env.VITE_APP_LEVELPLAY_IOS_REWARDED_ID ?? ''
const iosInterstitialAdUnit = import.meta.env.VITE_APP_LEVELPLAY_IOS_INTERSTITIAL_ID ?? ''

const isReady = ref(false)
const isRewardedReady = ref(false)
const isInterstitialReady = ref(false)
let initStarted = false

const detectPlatform = (): 'android' | 'ios' | 'other' => {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'other'
}

type InitResponse = { initialized: boolean }
type ShowAdResponse = { shown: boolean; rewarded?: boolean; error?: string }
type StatePayload = { ready: boolean }

export const createLevelPlayProvider = (): AdProvider => ({
  name: 'levelplay',
  isReady,
  isRewardedReady,
  isInterstitialReady,
  init: async () => {
    if (initStarted) return
    initStarted = true

    const platform = detectPlatform()
    const appKey = platform === 'android' ? androidAppKey : platform === 'ios' ? iosAppKey : ''
    const rewardedAdUnitId =
      platform === 'android' ? androidRewardedAdUnit : platform === 'ios' ? iosRewardedAdUnit : ''
    const interstitialAdUnitId =
      platform === 'android' ? androidInterstitialAdUnit : platform === 'ios' ? iosInterstitialAdUnit : ''

    if (!appKey) {
      console.warn(`[ads/levelplay] no app key for platform "${platform}" — ads disabled`)
      return
    }

    // Subscribe to per-format readiness events BEFORE invoking init.
    // The plugin's `onAdLoaded` may fire synchronously inside the init
    // success callback if a cached ad was already available, so racing
    // the listener registration after init is risky. The listeners are
    // safe to register before init: the plugin queues `trigger()` calls
    // until the webview is ready to receive them.
    try {
      await addPluginListener<StatePayload>('levelplay', 'rewarded-state', (data) => {
        isRewardedReady.value = !!data?.ready
      })
      await addPluginListener<StatePayload>('levelplay', 'interstitial-state', (data) => {
        isInterstitialReady.value = !!data?.ready
      })
    } catch (e) {
      console.warn('[ads/levelplay] failed to subscribe to state events', e)
    }

    try {
      const res = await invoke<InitResponse>('plugin:levelplay|init', {
        payload: {
          appKey,
          rewardedAdUnitId,
          interstitialAdUnitId,
          isChildDirected: true,
          admobTfcd: true,
          admobTfua: true,
          deviceIdOptOut: true,
          metaMixedAudience: false,
          enableTestSuite: isDebug.value || forceTestSuite
        }
      })
      if (res.initialized) isReady.value = true
    } catch (e) {
      console.warn('[ads/levelplay] init failed', e)
    }
  },
  showRewardedAd: async () => {
    if (!isReady.value) return false
    try {
      const res = await invoke<ShowAdResponse>('plugin:levelplay|show_rewarded')
      return res.rewarded === true
    } catch (e) {
      console.warn('[ads/levelplay] show_rewarded failed', e)
      return false
    }
  },
  showMidgameAd: async () => {
    if (!isReady.value) return
    try {
      await invoke<ShowAdResponse>('plugin:levelplay|show_interstitial')
    } catch (e) {
      console.warn('[ads/levelplay] show_interstitial failed', e)
    }
  }
})
