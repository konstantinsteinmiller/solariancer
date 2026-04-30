<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FIconButton from '@/components/atoms/FIconButton.vue'
import FButton from '@/components/atoms/FButton.vue'
import FMuteButton from '@/components/atoms/FMuteButton.vue'
import FPerfMeter from '@/components/atoms/FPerfMeter.vue'
import BattlePass from '@/components/organisms/BattlePass.vue'
import SolHud from '@/components/organisms/SolHud.vue'
import SolUpgradeModal from '@/components/organisms/SolUpgradeModal.vue'
import SolTutorialOverlay from '@/components/organisms/SolTutorialOverlay.vue'
import MissionRewardModal from '@/components/organisms/MissionRewardModal.vue'
import AchievementsModal from '@/components/organisms/AchievementsModal.vue'
import OptionsModal from '@/components/organisms/OptionsModal.vue'
import useGravityPhysics from '@/use/useGravityPhysics'
import useSolariancer from '@/use/useSolariancer'
import useSolTutorial from '@/use/useSolTutorial'
import useSolAudio from '@/use/useSolAudio'
import useAchievements from '@/use/useAchievements'
import { startRenderLoop } from '@/use/useSolariancerRenderer'
import { isMobileLandscape, isMobilePortrait, isCompactViewport, isGlitch, isY8 } from '@/use/useUser'
import useBottomSafe from '@/use/useBottomSafe'
import { useMusic } from '@/use/useSound'

// Glitch.fun wraps the iframe in a chrome that includes a top "trial /
// access" badge and a bottom toolbar. Both intrude ~50–60 px into the
// game viewport and cover our HUD. Pad the affected sides on Glitch
// builds only — every other platform serves the iframe unobstructed.
const GLITCH_CHROME_PX = 65

// Static asset URL helper. Vite's `--base=./` (used by every portal
// build) makes index.html paths relative, but `<img src="/...">` stays
// document-absolute and breaks when the host serves us under a sub-path
// (Glitch). `import.meta.env.BASE_URL` is the build-time-resolved base
// (typically './' for portals, '/' for surge/dev), so prefixing every
// public-asset reference with it works on every platform.
const assetUrl = (p: string): string =>
  `${import.meta.env.BASE_URL}${p.replace(/^\//, '')}`
const settingsIconUrl = assetUrl('/images/icons/settings-icon_128x128.webp')
const gearsIconUrl = assetUrl('/images/icons/gears_128x128.webp')

// Y8 portal branding — the rectangle wordmark sits above the FMuteButton in
// the bottom-left HUD column on Y8 builds only. Loaded lazily via a v-if on
// `isY8` (other builds never request the file). Source asset lives under
// `public/images/logo/y8-logo-with-border*.png`; we serve the @2x version on
// retina via the standard srcset hint.
const y8LogoUrl = assetUrl('/images/logo/y8-with-border.png')
const y8LogoUrl2x = assetUrl('/images/logo/y8-with-border@2x.png')

const canvasRef = ref<HTMLCanvasElement | null>(null)
let stopRender: (() => void) | null = null

const physics = useGravityPhysics()
const sk = useSolariancer()
const tutorial = useSolTutorial()
const audio = useSolAudio()
const achievements = useAchievements()
const isAchievementsOpen = ref(false)
const { bottomGapPx, scheduleBottomMeasure } = useBottomSafe()
const { startBattleMusic, stopBattleMusic } = useMusic()
const { t } = useI18n()

scheduleBottomMeasure()

// ─── Pointer/touch handling ────────────────────────────────────────────────
//
// One pointer at a time. Down → activate singularity at the touch point and
// (if a body is under the finger) grab it; Move → keep singularity in sync;
// Up → release singularity and drop any grabbed body.

interface PointerSession {
  id: number
  startX: number
  startY: number
  isGrab: boolean
}

let session: PointerSession | null = null

const eventToCanvasCoords = (e: PointerEvent | Touch): { x: number; y: number } | null => {
  const c = canvasRef.value
  if (!c) return null
  const rect = c.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

const onPointerDown = (e: PointerEvent) => {
  if (tutorial.active.value) return
  if (session) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const pt = eventToCanvasCoords(e)
  if (!pt) return
  // Reject taps too close to any body's outer edge — direct grabbing is
  // gone; the singularity is a remote tool. Tightens with Singularity Core.
  if (!physics.canCreateSingularityAt(pt.x, pt.y)) return
  e.preventDefault()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  session = { id: e.pointerId, startX: pt.x, startY: pt.y, isGrab: false }
  physics.setSingularity(true, pt.x, pt.y)
}

const onPointerMove = (e: PointerEvent) => {
  if (tutorial.active.value) return
  if (!session || session.id !== e.pointerId) return
  const pt = eventToCanvasCoords(e)
  if (!pt) return
  // Skip drag updates that would put the singularity inside a no-go zone —
  // the singularity simply stays where it was last allowed. The physics
  // step also collapses it if a body drifts INTO the active singularity.
  if (!physics.canCreateSingularityAt(pt.x, pt.y)) return
  physics.updateSingularity(pt.x, pt.y)
}

const endSession = () => {
  if (!session) return
  physics.setSingularity(false)
  session = null
}

const onPointerUp = (e: PointerEvent) => {
  if (!session || session.id !== e.pointerId) return
  endSession()
}

const onPointerCancel = (e: PointerEvent) => {
  if (!session || session.id !== e.pointerId) return
  endSession()
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────

onMounted(() => {
  if (canvasRef.value) {
    stopRender = startRenderLoop(canvasRef.value)
  }
  // Expose live game state on window so e2e tests (and devtools spelunking)
  // can introspect physics + state without prop-drilling. No-op for normal
  // runs because nothing reads these in production code.
  ;(window as any).__solPhysics = physics
  ;(window as any).__solSk = sk
  ;(window as any).__solTutorial = tutorial
  scheduleBottomMeasure()
  // Browsers require a user gesture to start audio; arm music on first interaction.
  const armMusic = () => {
    try {
      startBattleMusic()
    } catch { /* ignore */
    }
    window.removeEventListener('pointerdown', armMusic)
    window.removeEventListener('keydown', armMusic)
  }
  window.addEventListener('pointerdown', armMusic, { once: true })
  window.addEventListener('keydown', armMusic, { once: true })

  // First-time players get the scripted 10s tutorial. The render loop is now
  // running, so spawning a tutorial body and driving the singularity will be
  // visible immediately.
  if (!sk.state.value.tutorialSeen) {
    // Defer one frame so the canvas has been sized by the renderer.
    requestAnimationFrame(() => tutorial.start())
  }

  // Browser refresh / tab close — explicitly tear down audio so a final
  // rumble frame can't survive the navigation.
  const onBeforeUnload = () => {
    try {
      audio.stop()
    } catch { /* ignore */
    }
  }
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('pagehide', onBeforeUnload)
  ;(window as any).__solBeforeUnload = onBeforeUnload
})

onUnmounted(() => {
  stopRender?.()
  stopBattleMusic()
  // Tear down the synthesised audio layers (heat hum + black-hole rumble)
  // so they don't keep playing after the view unmounts. Particularly
  // important for the rumble — without this it would persist on the
  // shared AudioContext.
  audio.stop()
  const w = window as any
  if (w.__solBeforeUnload) {
    window.removeEventListener('beforeunload', w.__solBeforeUnload)
    window.removeEventListener('pagehide', w.__solBeforeUnload)
    delete w.__solBeforeUnload
  }
  sk.flushSave()
})

// ─── UI bits ───────────────────────────────────────────────────────────────

const openUpgrades = () => {
  sk.isUpgradeModalOpen.value = true
}
const openOptions = () => {
  sk.isOptionsOpen.value = true
}
const replayTutorial = () => {
  if (tutorial.active.value) return
  tutorial.start()
}
const openAchievements = () => {
  isAchievementsOpen.value = true
}

const showStarterHint = computed(() =>
  !tutorial.active.value && sk.state.value.tutorialSeen && sk.state.value.totalHeatEarned < 10
)

// ─── Stage-1 idle hint ─────────────────────────────────────────────────────
//
// If the player is on stage 1 with zero ripe feeds and the wall clock has
// drifted 30 s past either their last ripe feed (or, if they've never made
// one, the moment they mounted into the game), pulse the replay-tutorial
// `?` button. Drives a `Date.now()` poll instead of a watch because the
// underlying signal is wall time, not a reactive value.
const NOW_TICK_MS = 1000
const STAGE1_IDLE_HINT_AFTER_S = 30
const mountedAt = ref(performance.now())
const nowTick = ref(performance.now())
let nowTickHandle: number | null = null
onMounted(() => {
  nowTickHandle = window.setInterval(() => {
    nowTick.value = performance.now()
  }, NOW_TICK_MS)
})
onUnmounted(() => {
  if (nowTickHandle !== null) clearInterval(nowTickHandle)
})

const stage1IdleHintActive = computed(() => {
  if (tutorial.active.value) return false
  if (sk.state.value.stage !== 1) return false
  if (sk.state.value.totalRipeFeeds > 0) return false
  const lastEvent = sk.lastRipeFeedAt.value > 0 ? sk.lastRipeFeedAt.value : mountedAt.value
  return (nowTick.value - lastEvent) / 1000 >= STAGE1_IDLE_HINT_AFTER_S
})
</script>

<template lang="pug">
  div.absolute.inset-0.overflow-hidden(class="select-none touch-none")
    canvas.absolute.inset-0.block(
      ref="canvasRef"
      class="touch-none cursor-pointer"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @pointerleave="onPointerCancel"
      @contextmenu.prevent
    )

    //- HUD
    SolHud

    //- Bottom action buttons. Left column stacks Mute (top) + Settings (bottom).
    //- Right column has the replay-tutorial helper and the Upgrades button.
    div.absolute.left-0.right-0.pointer-events-none.flex.justify-between(
      :style="{\
        bottom: `calc(0.5rem + env(safe-area-inset-bottom, 0px) + ${bottomGapPx}px${isGlitch ? ` + ${GLITCH_CHROME_PX}px` : ''})`,\
        paddingLeft: 'calc(0.5rem + env(safe-area-inset-left, 0px))',\
        paddingRight: 'calc(0.5rem + env(safe-area-inset-right, 0px))'\
      }"
      class="z-20"
    )
      div.pointer-events-auto.flex.flex-col.items-start.gap-2(
        :class="[isCompactViewport ? 'scale-80 origin-bottom-left' : '']"
      )
        //- Y8 portal branding — only rendered on Y8 builds. The v-if
        //- prevents the request entirely on other platforms; isY8 is a
        //- static `import.meta.env` boolean so Vite tree-shakes the
        //- whole branch out of non-Y8 bundles.
        img.h-8.w-auto(
          v-if="isY8"
          :src="y8LogoUrl"
          :srcset="`${y8LogoUrl} 1x, ${y8LogoUrl2x} 2x`"
          alt="Y8"
          class="opacity-95 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
        )
        FMuteButton
        //- Bottom row: Settings + Battle Pass side-by-side. The BP button
        //- carries its own pending-claim chip and bounce hint, so giving
        //- it a dedicated slot next to Settings keeps both reachable at
        //- thumb height on portrait phones.
        div.flex.items-end.gap-2
          FIconButton(type="secondary" size="md" :img-src="settingsIconUrl" @click="openOptions")
          BattlePass

      div.pointer-events-auto.flex.items-end.gap-2(
        :class="[isCompactViewport ? 'scale-80 origin-bottom-right' : '']"
      )
        //- Achievements — pulses when there are unseen unlocks
        button.relative.inline-block.cursor-pointer(
          @click="openAchievements"
          class="hover:scale-105 active:scale-95 transition-transform"
          :class="{ 'attention-bounce': achievements.unseenCount.value > 0 }"
          :aria-label="t('game.modal.achievements')"
          :title="t('game.modal.achievements')"
        )
          div.relative
            div.absolute.inset-0.translate-y-1.rounded-xl.bg-black(class="opacity-40")
            div.relative.flex.items-center.justify-center.h-10.w-10.rounded-xl.border-2(
              class="bg-gradient-to-b from-[#5a3415] to-[#1a0c04] border-amber-400/60 shadow-lg"
            )
              span.text-amber-200.text-xl.font-black.leading-none(class="game-text") 🏆
            //- Unread chip
            div(
              v-if="achievements.unseenCount.value > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 border-2 border-[#0f1a30] text-white text-[10px] font-black px-1"
            ) {{ achievements.unseenCount.value }}
        button.relative.inline-block.cursor-pointer(
          @click="replayTutorial"
          class="hover:scale-105 active:scale-95 transition-transform"
          :class="{ 'attention-bounce': stage1IdleHintActive }"
          :aria-label="t('game.modal.replayTutorial')"
          :title="t('game.modal.replayTutorial')"
        )
          div.relative
            div.absolute.inset-0.translate-y-1.rounded-xl.bg-black.opacity-40
            div.relative.flex.items-center.justify-center.h-10.w-10.rounded-xl.border-2(
              class="bg-gradient-to-b from-[#1f3a78] to-[#0a1633] border-[#0f1a30] shadow-lg"
            )
              span.text-sky-200.text-2xl.font-black.leading-none(class="game-text") ?
        //- Upgrades — universally readable gears icon. Square button matches
        //- the achievements / replay-tutorial buttons next to it. Bounce
        //- only after the player has cooked their first ripe so the menu
        //- has context — pushing them at it before that confuses the loop.
        button.relative.inline-block.cursor-pointer(
          @click="openUpgrades"
          class="hover:scale-105 active:scale-95 transition-transform"
          :class="{ 'attention-bounce': sk.upgradeHintAllowed.value && (showStarterHint || sk.state.value.heat >= 60) }"
          :aria-label="t('game.modal.upgradesTitle')"
          :title="t('game.modal.upgradesTitle')"
        )
          div.relative
            div.absolute.inset-0.translate-y-1.rounded-xl.bg-black(class="opacity-40")
            div.relative.flex.items-center.justify-center.h-10.w-10.rounded-xl.border-2(
              class="bg-gradient-to-b from-[#a070ff] to-[#5a2bb6] border-violet-300/60 shadow-lg"
            )
              img.h-7.w-7(
                :src="gearsIconUrl"
                alt="upgrades"
                style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6))"
              )

    //- Starter hint
    Transition(
      enter-active-class="transition-all duration-500 ease-out"
      leave-active-class="transition-all duration-300 ease-in"
      enter-from-class="opacity-0 translate-y-4"
      leave-to-class="opacity-0 translate-y-2"
    )
      div.absolute.pointer-events-none(
        v-if="showStarterHint"
        class="left-1/2 -translate-x-1/2 z-10"
        :style="{ bottom: `calc(${isMobilePortrait ? '24%' : '20%'} + env(safe-area-inset-bottom, 0px))` }"
      )
        div.rounded-2xl.border-2.px-4.py-2.text-center.text-white(
          class="bg-black/60 border-violet-500 backdrop-blur-sm"
        )
          div.font-black.uppercase.tracking-wider(class="game-text text-violet-200 text-base sm:text-lg") {{ t('game.starter.title') }}
          div.text-slate-200(class="leading-tight max-w-xs text-xs sm:text-sm") {{ t('game.starter.body') }}

    //- Tutorial overlay (auto-starts for first-time players)
    SolTutorialOverlay

    //- Mission reward picker (opens automatically when a mission is achieved)
    MissionRewardModal

    //- Achievements modal — opened by the trophy button
    AchievementsModal(:is-open="isAchievementsOpen" @close="isAchievementsOpen = false")

    //- Modals
    SolUpgradeModal(v-model="sk.isUpgradeModalOpen.value")
    OptionsModal(v-if="sk.isOptionsOpen.value" :is-open="sk.isOptionsOpen.value" @close="sk.isOptionsOpen.value = false")

    //- Perf overlay — only renders when `localStorage.fps === 'true'`. Mounted
    //- here (not in App.vue or via SaveManager) so the flag stays a developer
    //- toggle and never round-trips to the cloud save.
    FPerfMeter(:offset-y="52")
</template>

<style scoped lang="sass">
canvas
  -webkit-user-select: none
  user-select: none
  -webkit-touch-callout: none
</style>
