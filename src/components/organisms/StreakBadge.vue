<script setup lang="ts">
// Daily-feed streak. Hidden until the streak is at least 1 day.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import useSolariancer from '@/use/useSolariancer'
import SolBadge from '@/components/atoms/SolBadge.vue'

const props = defineProps<{ compact?: boolean }>()
const sk = useSolariancer()
const { t } = useI18n()

const streakDays = computed(() => sk.state.value.streak.days)
const valueLabel = computed(() => `${streakDays.value}d`)
</script>

<template lang="pug">
  SolBadge(
    v-if="streakDays >= 1"
    :label="t('game.hud.streak')"
    :value="valueLabel"
    tone="orange"
    :compact="props.compact"
  )
    template(#icon)
      div.h-5.w-5.rounded-full(
        class="bg-gradient-to-br from-[#ff8c2a] via-[#ff5530] to-[#d6240a]"
        style="box-shadow: 0 0 8px rgba(255,120,60,0.85)"
      )
</template>
