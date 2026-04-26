<script setup lang="ts">
// Bodies currently in the Heat Zone. Highlights amber + shows ×3 chip when
// the crowd bonus is active (3+ bodies orbiting at once).
import useSolKeeper from '@/use/useSolKeeper'
import { orbitingCount, crowdBonusActive } from '@/use/useGravityPhysics'
import SolBadge from '@/components/atoms/SolBadge.vue'

const props = defineProps<{ compact?: boolean }>()
const _sk = useSolKeeper()
</script>

<template lang="pug">
  SolBadge(
    label="In Zone"
    :value="orbitingCount"
    :tone="crowdBonusActive ? 'amber' : 'sky'"
    :highlight="crowdBonusActive"
    :compact="props.compact"
  )
    template(#icon)
      //- Tiny ring icon mimicking the Heat Zone
      div.h-4.w-4.rounded-full.border-2(
        :class="crowdBonusActive ? 'border-amber-300' : 'border-sky-300'"
      )
    span.uppercase.text-amber-300(
      v-if="crowdBonusActive"
      class="game-text text-[10px] font-black"
    ) ×3
</template>
