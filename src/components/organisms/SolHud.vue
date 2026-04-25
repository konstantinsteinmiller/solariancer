<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import useSolKeeper from '@/use/useSolKeeper'
import { orbitingCount, sessionTime } from '@/use/useGravityPhysics'
import { isMobileLandscape } from '@/use/useUser'

const { state, sessionHeat, lastEarnedSplash } = useSolKeeper()

const heatDisplay = computed(() => formatNumber(state.value.heat))
const matterDisplay = computed(() => state.value.starMatter.toLocaleString())
const orbitDisplay = computed(() => orbitingCount.value)
const sessionDisplay = computed(() => formatNumber(sessionHeat.value))

function formatNumber(n: number): string {
  if (n < 1000) return Math.floor(n).toString()
  if (n < 10000) return n.toFixed(0)
  if (n < 1e6) return (n / 1000).toFixed(1) + 'K'
  if (n < 1e9) return (n / 1e6).toFixed(2) + 'M'
  return (n / 1e9).toFixed(2) + 'B'
}

const splash = ref<{ amount: number; key: number } | null>(null)
let splashKey = 0
watch(lastEarnedSplash, (v) => {
  if (!v) return
  splashKey++
  splash.value = { amount: v.amount, key: splashKey }
  const k = splashKey
  setTimeout(() => {
    if (splash.value && splash.value.key === k) splash.value = null
  }, 900)
})
</script>

<template lang="pug">
  div.pointer-events-none.absolute.inset-0(class="z-20")
    //- Top-left: Heat Energy badge
    div.absolute.top-0.left-0.pointer-events-auto(
      :style="{\
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',\
        paddingLeft: 'calc(0.5rem + env(safe-area-inset-left, 0px))'\
      }"
      :class="{ 'scale-90': isMobileLandscape }"
    )
      div.flex.flex-col.gap-1
        div.relative.inline-flex.items-center.gap-2.rounded-xl.border-2.px-3.py-1(
          class="bg-gradient-to-b from-[#2b1a3a] to-[#1a0f24] border-[#0f1a30] shadow-lg"
        )
          div.absolute.inset-0.rounded-xl.translate-y-1.bg-black.opacity-40(class="-z-10")
          //- Plasma orb icon (CSS gradient)
          div.relative
            div.h-6.w-6.rounded-full(
              class="bg-gradient-to-br from-[#ffe79e] via-[#ff8c2a] to-[#c5320e]"
              style="box-shadow: 0 0 12px rgba(255,160,80,0.85), inset 1px 1px 4px rgba(255,255,255,0.6)"
            )
          div.flex.flex-col.leading-none
            span.uppercase.tracking-wider.text-amber-200(class="game-text text-[10px]") Heat
            span.text-lg.font-black.text-amber-100(class="game-text tabular-nums") {{ heatDisplay }}
          //- Splash gainer
          Transition(
            enter-active-class="transition-all duration-200 ease-out"
            leave-active-class="transition-all duration-500 ease-in"
            enter-from-class="opacity-0 -translate-y-1"
            leave-to-class="opacity-0 -translate-y-6"
          )
            span.absolute.text-amber-300.text-sm.font-black.pointer-events-none(
              v-if="splash"
              :key="splash.key"
              class="left-full ml-2 game-text tabular-nums whitespace-nowrap"
            ) +{{ Math.round(splash.amount) }}

        //- Star matter (only when > 0)
        div.relative.inline-flex.items-center.gap-2.rounded-xl.border-2.px-3.py-1(
          v-if="state.starMatter > 0"
          class="bg-gradient-to-b from-[#1a2350] to-[#0e1733] border-[#0f1a30] shadow-lg"
        )
          div.h-5.w-5(
            class="rotate-45 bg-gradient-to-br from-[#c8a8ff] to-[#5d3aa8]"
            style="box-shadow: 0 0 8px rgba(170,110,255,0.8)"
          )
          div.flex.flex-col.leading-none
            span.uppercase.tracking-wider.text-violet-200(class="game-text text-[10px]") Star Matter
            span.text-base.font-black.text-violet-100(class="game-text tabular-nums") {{ matterDisplay }}

    //- Top-right: orbits + session
    div.absolute.top-0.right-0.pointer-events-auto.text-right(
      :style="{\
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',\
        paddingRight: 'calc(0.5rem + env(safe-area-inset-right, 0px))'\
      }"
      :class="{ 'scale-90': isMobileLandscape }"
    )
      div.flex.flex-col.gap-1.items-end
        div.inline-flex.items-center.gap-2.rounded-xl.border-2.px-3.py-1(
          class="bg-gradient-to-b from-[#0f1a30] to-[#070d1c] border-[#0f1a30] shadow-lg"
        )
          span.uppercase.tracking-wider.text-sky-300(class="game-text text-[10px]") Orbits
          span.text-lg.font-black.text-sky-100(class="game-text tabular-nums") {{ orbitDisplay }}
        div.inline-flex.items-center.gap-2.rounded-xl.border-2.px-3.py-1(
          class="bg-gradient-to-b from-[#0f1a30] to-[#070d1c] border-[#0f1a30] shadow-lg"
        )
          span.uppercase.tracking-wider.text-fuchsia-300(class="game-text text-[10px]") Session
          span.text-sm.font-black.text-fuchsia-100(class="game-text tabular-nums") {{ sessionDisplay }}
</template>

<style scoped lang="sass">
.tabular-nums
  font-variant-numeric: tabular-nums
</style>
