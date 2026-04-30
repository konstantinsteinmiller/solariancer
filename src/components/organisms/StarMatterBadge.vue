<script setup lang="ts">
// Star Matter — meta currency. Only shown when > 0 to avoid HUD clutter.
import { useI18n } from 'vue-i18n'
import useSolariancer from '@/use/useSolariancer'
import SolBadge from '@/components/atoms/SolBadge.vue'

const props = defineProps<{ compact?: boolean }>()
const sk = useSolariancer()
const { t } = useI18n()
</script>

<template lang="pug">
  SolBadge(
    v-if="sk.state.value.starMatter > 0"
    :label="t('game.hud.starMatter')"
    :value="sk.state.value.starMatter.toLocaleString()"
    tone="violet"
    :compact="props.compact"
  )
    template(#icon)
      div.h-5.w-5(
        class="rotate-45 bg-gradient-to-br from-[#c8a8ff] to-[#5d3aa8]"
        style="box-shadow: 0 0 8px rgba(170,110,255,0.8)"
      )
</template>
