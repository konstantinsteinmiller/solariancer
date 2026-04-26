import { ref } from 'vue'
import { prependBaseUrl } from '@/utils/function.ts'

// Shared state so it can be accessed by both the loader and the progress component
const loadingProgress = ref(0)
const areAllAssetsLoaded = ref(false)
// Currently active backdrop image src — the renderer subscribes to this and
// swaps the canvas backdrop when the high-res image preloads.
export const currentBgSrc = ref<string>(prependBaseUrl('images/bg/bg_800x450.webp'))

// Persistent caches.
//
// `audio` holds HTMLAudioElements (used for streamed background music where
// we don't want the whole file decoded into memory).
//
// `audioBuffers` holds decoded PCM data for short SFX — a single shared
// AudioBuffer per file that we replay by spawning a fresh
// `AudioBufferSourceNode` on every `playSound()` call. This is the only
// way to get true "decode once, play many" semantics in the browser:
// HTMLAudioElement.cloneNode() copies the element but NOT the decoded
// audio, so each clone re-fetches (from disk cache at best) and
// re-decodes on the main thread. Web Audio skips both.
export const resourceCache = {
  images: new Map<string, HTMLImageElement>(),
  audio: new Map<string, HTMLAudioElement>(),
  audioBuffers: new Map<string, AudioBuffer>()
}

// ─── Shared AudioContext ───────────────────────────────────────────────────
//
// Browsers cap the number of AudioContexts per page (typically 6), so we
// create one on demand and reuse it everywhere. Also: autoplay policy keeps
// new contexts in a `suspended` state until a user gesture — we arm a
// one-shot click/touch listener to resume it on first interaction.

let sharedAudioCtx: AudioContext | null = null
let resumeListenerArmed = false

export const getAudioContext = (): AudioContext | null => {
  if (sharedAudioCtx) return sharedAudioCtx
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!Ctor) return null
  try {
    sharedAudioCtx = new Ctor() as AudioContext
  } catch {
    return null
  }
  armResumeOnGesture()
  return sharedAudioCtx
}

const armResumeOnGesture = (): void => {
  if (resumeListenerArmed) return
  resumeListenerArmed = true
  const resume = () => {
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume()
    }
  }
  // `pointerdown` covers mouse + touch + pen; keydown handles keyboard-only
  // users. `{ once: true }` so we don't leak listeners past the first
  // gesture.
  window.addEventListener('pointerdown', resume, { once: true })
  window.addEventListener('keydown', resume, { once: true })
}

/**
 * Synchronous image lookup that guarantees a single `HTMLImageElement`
 * per `src`. If the image is already in the cache (preloaded or
 * previously demand-loaded) the cached instance is returned immediately.
 * Otherwise a new Image is created, stored in the cache, and returned —
 * so all *subsequent* callers share the decoded bitmap and the browser
 * doesn't re-fetch or re-decode.
 *
 * Call sites can use the return value with `ctx.drawImage` right away;
 * if the image isn't loaded yet the usual `.complete && .naturalWidth`
 * gate handles it (same as the existing render paths).
 */
export const getCachedImage = (src: string): HTMLImageElement => {
  const existing = resourceCache.images.get(src)
  if (existing) return existing
  const img = new Image()
  img.src = src
  resourceCache.images.set(src, img)
  return img
}

/**
 * Decode a remote audio file into an AudioBuffer and cache it. Returns
 * `null` if Web Audio isn't available or decode fails — callers should
 * then fall back to HTMLAudio. Safe to call multiple times; concurrent
 * calls share the same in-flight decode.
 */
const pendingDecodes = new Map<string, Promise<AudioBuffer | null>>()
export const loadAudioBuffer = async (src: string): Promise<AudioBuffer | null> => {
  const cached = resourceCache.audioBuffers.get(src)
  if (cached) return cached
  const existing = pendingDecodes.get(src)
  if (existing) return existing

  const ctx = getAudioContext()
  if (!ctx) return null

  const promise = (async () => {
    try {
      const res = await fetch(src)
      if (!res.ok) return null
      const arrayBuffer = await res.arrayBuffer()
      const buffer = await ctx.decodeAudioData(arrayBuffer)
      resourceCache.audioBuffers.set(src, buffer)
      return buffer
    } catch (e) {
      console.warn(`[assets] decodeAudioData failed for ${src}`, e)
      return null
    } finally {
      pendingDecodes.delete(src)
    }
  })()
  pendingDecodes.set(src, promise)
  return promise
}

// ─── Preload tiers (Sol Keeper) ────────────────────────────────────────────
//
// Two layers, chosen to minimise the time to first interactive frame and
// then eliminate every visible / audible pop-in before the player can
// trigger it.
//
//   1. CRITICAL — splash-blocking. Drives the FLogoProgress %, gates the
//      RouterView mount. Strictly limited to assets that paint the very
//      first frame of SolKeeperGame:
//         • the splash logo
//         • the low-res space backdrop (used as splash CSS background AND
//           as the canvas backdrop until the hi-res version lands)
//         • the two icons that sit on the bottom HUD (settings, gears)
//      Everything else is deferred so the loader can hit 100% in tens of
//      ms on cached loads and within a single network round-trip on cold.
//
//   2. DEFERRED — fire-and-forget once the splash is done. Anything the
//      player will see / hear during normal play but isn't on the very
//      first frame:
//         • the high-res backdrop (silent swap when ready — the renderer
//           subscribes to `currentBgSrc`)
//         • gameplay SFX (collisions, explosions, stage-up)
//         • the two icons used inside OptionsModal — by the time the
//           player taps Settings these are already in cache, so the
//           modal renders without a flash.

const CRITICAL_IMAGES = [
  'images/logo/logo_256x256.webp',
  'images/bg/bg_800x450.webp',
  'images/icons/settings-icon_128x128.webp',
  'images/icons/gears_128x128.webp'
]

const DEFERRED_IMAGES = [
  // Inside OptionsModal — needs to be cached before the player taps Settings.
  'images/icons/sound-icon_128x128.webp',
  'images/icons/difficulty-icon_128x128.webp'
]

// High-res backdrop — once decoded we point the renderer at it. The swap
// is silent: the renderer keeps drawing the low-res image until the hi-res
// is in `resourceCache.images` and then picks it up on its next frame.
const HIGH_RES_BG = 'images/bg/bg_1280x720.webp'

// Gameplay SFX actually triggered by Sol Keeper. Sourced from
// `useGravityPhysics.ts` (clash-* on body collisions / sun feeds,
// explosion-1 on comet/black-hole detonations, level-up on stage advance).
// The synthesised audio in `useSolAudio.ts` (heat hum, black-hole rumble)
// uses Web Audio oscillators directly and isn't a file at all.
const SOUND_ASSETS = [
  'audio/sfx/clash-1.ogg',
  'audio/sfx/clash-2.ogg',
  'audio/sfx/clash-3.ogg',
  'audio/sfx/clash-4.ogg',
  'audio/sfx/clash-5.ogg',
  'audio/sfx/explosion-1.ogg',
  'audio/sfx/level-up.ogg'
]

type AssetEntry = { src: string; type: 'image' | 'audio' }

const loadAsset = (
  { src, type }: AssetEntry,
  onLoaded?: () => void
): Promise<unknown> => {
  if (type === 'image' && resourceCache.images.has(src)) {
    onLoaded?.()
    return Promise.resolve()
  }
  if (type === 'audio' && resourceCache.audioBuffers.has(src)) {
    onLoaded?.()
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    if (type === 'image') {
      const img = new Image()
      img.onload = () => {
        resourceCache.images.set(src, img)
        onLoaded?.()
        resolve(img)
      }
      img.onerror = () => {
        console.error('Preload fail:', src)
        onLoaded?.()
        resolve(null)
      }
      img.src = src
    } else {
      // SFX preload path — decode into an AudioBuffer so every playSound
      // call spawns a zero-cost source node instead of re-decoding. If
      // Web Audio is unavailable (very old browsers, private modes that
      // block AudioContext), fall back to caching an HTMLAudioElement so
      // playSound still has something to clone from.
      loadAudioBuffer(src).then((buffer) => {
        if (buffer) {
          onLoaded?.()
          resolve(buffer)
          return
        }
        const audio = new Audio()
        audio.oncanplaythrough = () => {
          resourceCache.audio.set(src, audio)
          onLoaded?.()
          resolve(audio)
        }
        audio.onerror = () => {
          onLoaded?.()
          resolve(null)
        }
        audio.src = src
        audio.load()
      })
    }
  })
}

const runInChunks = async (assets: AssetEntry[], chunkSize: number, onLoaded?: () => void) => {
  for (let i = 0; i < assets.length; i += chunkSize) {
    const chunk = assets.slice(i, i + chunkSize)
    await Promise.all(chunk.map(a => loadAsset(a, onLoaded)))
  }
}

// Tracks the in-flight deferred preload so repeat calls share the same
// promise (the splash screen `preloadAssets()` triggers it; tests that
// need to await it can grab the returned promise).
let deferredAssetsPromise: Promise<void> | null = null

export default () => {
  const preloadAssets = async () => {
    if (areAllAssetsLoaded.value) return

    const criticalAssets: AssetEntry[] = CRITICAL_IMAGES
      .map(src => ({ src: prependBaseUrl(src), type: 'image' as const }))

    let loadedCount = 0
    const totalCount = criticalAssets.length
    const onOne = () => {
      loadedCount++
      loadingProgress.value = Math.floor((loadedCount / totalCount) * 100)
    }

    try {
      await runInChunks(criticalAssets, 10, onOne)
      areAllAssetsLoaded.value = true
      loadingProgress.value = 100
    } catch (error) {
      console.error('Preload failed:', error)
      loadingProgress.value = 100
    }

    // Fire-and-forget. Not awaited so the splash exits the moment the
    // critical tier is done.
    void preloadDeferredAssets()
  }

  /**
   * Background loader for the rest. Order:
   *   1. SFX — small OGGs that decode in a few ms. Loaded first so the
   *      first body collision (which can fire seconds after the splash
   *      exits) doesn't pop a silent then-late sound.
   *   2. Modal-only icons — tiny WebPs. Cached before the player taps
   *      Settings.
   *   3. High-res backdrop — biggest single asset, swapped silently. We
   *      keep it last because the low-res version is already on screen
   *      and looks fine; the swap is a quality bump, not a functional
   *      requirement.
   *
   * Idempotent — repeat calls share the in-flight promise.
   */
  const preloadDeferredAssets = (): Promise<void> => {
    if (deferredAssetsPromise) return deferredAssetsPromise

    const sfx: AssetEntry[] = SOUND_ASSETS
      .map(src => prependBaseUrl(src))
      .filter(src => !resourceCache.audioBuffers.has(src))
      .map(src => ({ src, type: 'audio' as const }))

    const modalIcons: AssetEntry[] = DEFERRED_IMAGES
      .map(src => prependBaseUrl(src))
      .filter(src => !resourceCache.images.has(src))
      .map(src => ({ src, type: 'image' as const }))

    deferredAssetsPromise = (async () => {
      try {
        // Smaller chunks than the splash loader — we're competing with
        // game render work once the player is interactive, so we keep the
        // bandwidth footprint modest.
        await runInChunks(sfx, 4)
        await runInChunks(modalIcons, 4)

        const hiResSrc = prependBaseUrl(HIGH_RES_BG)
        if (!resourceCache.images.has(hiResSrc)) {
          await new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              resourceCache.images.set(hiResSrc, img)
              currentBgSrc.value = hiResSrc
              resolve()
            }
            img.onerror = () => resolve()
            img.src = hiResSrc
          })
        } else {
          currentBgSrc.value = hiResSrc
        }
      } catch (e) {
        console.error('Deferred asset preload failed:', e)
      }
    })()
    return deferredAssetsPromise
  }

  return {
    loadingProgress,
    areAllAssetsLoaded,
    preloadAssets,
    preloadDeferredAssets,
    resourceCache // exported for debugging memory usage
  }
}
