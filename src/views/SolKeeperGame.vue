<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import FIconButton from '@/components/atoms/FIconButton.vue'
import FButton from '@/components/atoms/FButton.vue'
import FMuteButton from '@/components/atoms/FMuteButton.vue'
import SolHud from '@/components/organisms/SolHud.vue'
import SolUpgradeModal from '@/components/organisms/SolUpgradeModal.vue'
import OptionsModal from '@/components/organisms/OptionsModal.vue'
import useGravityPhysics from '@/use/useGravityPhysics'
import useSolKeeper from '@/use/useSolKeeper'
import { startRenderLoop } from '@/use/useSolKeeperRenderer'
import { isMobileLandscape, isMobilePortrait } from '@/use/useUser'
import useBottomSafe from '@/use/useBottomSafe'
import { useMusic } from '@/use/useSound'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let stopRender: (() => void) | null = null

const physics = useGravityPhysics()
const sk = useSolKeeper()
const { bottomGapPx, scheduleBottomMeasure } = useBottomSafe()
const { startBattleMusic, stopBattleMusic } = useMusic()

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
  if (session) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const pt = eventToCanvasCoords(e)
  if (!pt) return
  e.preventDefault()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  session = { id: e.pointerId, startX: pt.x, startY: pt.y, isGrab: false }
  // Try to grab a body under the finger first
  const grabbed = physics.grabNearestBody(pt.x, pt.y)
  session.isGrab = !!grabbed
  physics.setSingularity(true, pt.x, pt.y)
}

const onPointerMove = (e: PointerEvent) => {
  if (!session || session.id !== e.pointerId) return
  const pt = eventToCanvasCoords(e)
  if (!pt) return
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
})

onUnmounted(() => {
  stopRender?.()
  stopBattleMusic()
  sk.flushSave()
})

// ─── UI bits ───────────────────────────────────────────────────────────────

const openUpgrades = () => {
  sk.isUpgradeModalOpen.value = true
}
const openOptions = () => {
  sk.isOptionsOpen.value = true
}

const showStarterHint = computed(() =>
  sk.state.value.totalHeatEarned < 10
)
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

    //- Bottom action buttons
    div.absolute.left-0.right-0.pointer-events-none.flex.justify-between(
      :style="{\
        bottom: `calc(0.5rem + env(safe-area-inset-bottom, 0px) + ${bottomGapPx}px)`,\
        paddingLeft: 'calc(0.5rem + env(safe-area-inset-left, 0px))',\
        paddingRight: 'calc(0.5rem + env(safe-area-inset-right, 0px))'\
      }"
      class="z-20"
    )
      div.pointer-events-auto.flex.items-end.gap-2
        FMuteButton

      div.pointer-events-auto.flex.items-end.gap-2
        FIconButton(type="secondary" size="md" img-src="/images/icons/settings-icon_128x128.webp" @click="openOptions")
        button.relative.inline-block.cursor-pointer(
          @click="openUpgrades"
          class="hover:scale-[103%] active:scale-95 transition-transform"
          :class="{ 'attention-bounce': showStarterHint || (sk.state.value.heat >= 60) }"
        )
          div.relative
            div.absolute.inset-0.translate-y-1.rounded-2xl(class="bg-[#5a2790]")
            div.relative.flex.items-center.gap-2.rounded-2xl.border-2.px-4.py-2(
              class="bg-gradient-to-b from-[#a070ff] to-[#5a2bb6] border-[#0f1a30]"
            )
              div.h-6.w-6.rounded-full.flex.items-center.justify-center.text-white.font-black(
                class="bg-white/20"
                style="text-shadow: 0 1px 2px rgba(0,0,0,0.6)"
              ) ↑
              span.text-white.font-black.uppercase.tracking-wide.text-sm(class="game-text") Upgrades

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
          div.font-black.uppercase.tracking-wider(class="game-text text-violet-200 text-base sm:text-lg") Touch & Drag
          div.text-slate-200(class="leading-tight max-w-xs text-xs sm:text-sm") Pull rocks into orbit · Drop them into the Sun for Heat

    //- Modals
    SolUpgradeModal(v-model="sk.isUpgradeModalOpen.value")
    OptionsModal(v-if="sk.isOptionsOpen.value" :is-open="sk.isOptionsOpen.value" @close="sk.isOptionsOpen.value = false")
</template>

<style scoped lang="sass">
canvas
  -webkit-user-select: none
  user-select: none
  -webkit-touch-callout: none
</style>
