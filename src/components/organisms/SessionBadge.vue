<script setup lang="ts">
// "Session" = total Heat earned since this session began (page load /
// reload). Resets on refresh; not persisted. Useful for short-run scoring
// and bragging.
import { useI18n } from 'vue-i18n'
import useSolariancer from '@/use/useSolariancer'
import SolBadge from '@/components/atoms/SolBadge.vue'

const props = defineProps<{ compact?: boolean }>()
const sk = useSolariancer()
const { t } = useI18n()

const formatNumber = (n: number): string => {
  if (n < 1000) return Math.floor(n).toString()
  if (n < 10000) return n.toFixed(0)
  if (n < 1e6) return (n / 1000).toFixed(1) + 'K'
  if (n < 1e9) return (n / 1e6).toFixed(2) + 'M'
  return (n / 1e9).toFixed(2) + 'B'
}
</script>

<template lang="pug">
  SolBadge(
    :label="t('game.hud.session')"
    :value="formatNumber(sk.sessionHeat.value)"
    tone="fuchsia"
    :compact="props.compact"
    :title="t('game.hud.sessionTip')"
  )
    template(#icon)
      //- Hourglass-style accent
      div.h-4.w-4.rounded-sm(
        class="bg-gradient-to-b from-[#ff80c8] to-[#7b2670]"
        style="box-shadow: 0 0 6px rgba(255,128,200,0.55)"
      )
</template>
