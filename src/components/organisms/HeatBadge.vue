<script setup lang="ts">
// Top-line resource badge: current heat balance with the splash gainer
// animation that pops out the right side on every payout.
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import useSolariancer from '@/use/useSolariancer'
import SolBadge from '@/components/atoms/SolBadge.vue'

const { t } = useI18n()

const props = defineProps<{ compact?: boolean }>()
const sk = useSolariancer()

const splash = ref<{ amount: number; key: number } | null>(null)
let splashKey = 0
watch(sk.lastEarnedSplash, (v) => {
  if (!v) return
  splashKey++
  splash.value = { amount: v.amount, key: splashKey }
  const k = splashKey
  setTimeout(() => {
    if (splash.value && splash.value.key === k) splash.value = null
  }, 900)
})

const formatNumber = (n: number): string => {
  if (n < 1000) return Math.floor(n).toString()
  if (n < 10000) return n.toFixed(0)
  if (n < 1e6) return (n / 1000).toFixed(1) + 'K'
  if (n < 1e9) return (n / 1e6).toFixed(2) + 'M'
  return (n / 1e9).toFixed(2) + 'B'
}
</script>

<template lang="pug">
  SolBadge(:label="t('game.hud.heat')" :value="formatNumber(sk.state.value.heat)" tone="amber" :compact="props.compact")
    template(#icon)
      div.relative.h-6.w-6.rounded-full(
        class="bg-gradient-to-br from-[#ffe79e] via-[#ff8c2a] to-[#c5320e]"
        style="box-shadow: 0 0 12px rgba(255,160,80,0.85), inset 1px 1px 4px rgba(255,255,255,0.6)"
      )
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
</template>
