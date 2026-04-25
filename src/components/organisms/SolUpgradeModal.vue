<script setup lang="ts">

import { computed } from 'vue'
import FModal from '@/components/molecules/FModal.vue'
import FButton from '@/components/atoms/FButton.vue'
import useSolKeeper from '@/use/useSolKeeper'
import type { UpgradeId } from '@/types/solkeeper'

interface Props {
  modelValue: boolean
}

defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const { state, UPGRADES, upgradeCost, isUpgradeMaxed, canAffordUpgrade, buyUpgrade } = useSolKeeper()

interface UpgradeView {
  id: UpgradeId
  title: string
  description: string
  effect: string
  iconColors: [string, string]
  maxLevel: number
  level: number
}

const view = computed<UpgradeView[]>(() => UPGRADES.map(u => {
  const lvl = state.value.upgrades[u.id]
  const base = { id: u.id, level: lvl, maxLevel: u.maxLevel }
  switch (u.id) {
    case 'singularityCore':
      return {
        ...base,
        title: 'Singularity Core',
        description: 'Boost the strength of your touch gravity.',
        effect: `+${(u.effectPerLevel * 100) | 0}% pull / lvl  ·  current ×${(1 + lvl * u.effectPerLevel).toFixed(2)}`,
        iconColors: ['#a070ff', '#3a1a7a']
      }
    case 'fusionStabilizer':
      return {
        ...base,
        title: 'Fusion Stabilizer',
        description: 'Planets in stable orbit yield more Heat.',
        effect: `+${(u.effectPerLevel * 100) | 0}% Heat / lvl  ·  current ×${(1 + lvl * u.effectPerLevel).toFixed(2)}`,
        iconColors: ['#ff9444', '#7a1f0c']
      }
    case 'attractionRadius':
      return {
        ...base,
        title: 'Resonance Field',
        description: 'Wider gravitational reach for your singularity.',
        effect: `+${(u.effectPerLevel * 100) | 0}% range / lvl`,
        iconColors: ['#5fd2ff', '#0f3e6c']
      }
    case 'automationProbe':
      return {
        ...base,
        title: 'Stabilizer Probe',
        description: 'A drone that nudges nearby orbits toward stability.',
        effect: `${lvl} active  ·  +1 probe per level`,
        iconColors: ['#dffafd', '#2b6fa3']
      }
    case 'heatShield':
      return {
        ...base,
        title: 'Solar Mantle',
        description: 'Expand the Sun — easier sun-feeds.',
        effect: `+${(u.effectPerLevel * 100) | 0}% sun radius / lvl`,
        iconColors: ['#ffd14a', '#7a3a0e']
      }
    case 'orbitalCapacity':
      return {
        ...base,
        title: 'Orbital Capacity',
        description: 'Spawn celestial bodies more frequently.',
        effect: `Faster spawns / lvl`,
        iconColors: ['#9eddff', '#1a3470']
      }
  }
}))

const close = () => emit('update:modelValue', false)
</script>

<template lang="pug">
  FModal(
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Upgrades"
  )
    div.text-left.overflow-y-auto.pr-1(class="max-h-[60vh] space-y-2 sm:space-y-3")
      div.relative.flex.items-center.gap-3.rounded-xl.border-2.p-2(
        v-for="u in view"
        :key="u.id"
        class="bg-gradient-to-b from-[#172238] to-[#0c1424] border-[#0f1a30]"
      )
        //- Icon
        div.relative.h-12.w-12.flex.shrink-0.items-center.justify-center
          div.absolute.inset-0.rounded-full(
            :style="{ background: `radial-gradient(circle at 30% 30%, ${u.iconColors[0]}, ${u.iconColors[1]})` }"
            style="box-shadow: 0 0 14px rgba(120,140,255,0.45), inset 2px 2px 5px rgba(255,255,255,0.5)"
          )
          span.relative.text-lg.font-black.text-white(class="game-text") {{ state.upgrades[u.id] }}
        //- Body
        div.flex-1.text-left.text-white(class="leading-tight")
          div.flex.items-baseline.gap-2.flex-wrap
            span.font-black.uppercase.tracking-wide(class="game-text text-sm sm:text-base") {{ u.title }}
            span.text-slate-300(class="text-[10px] sm:text-xs") lvl {{ u.level }}/{{ u.maxLevel }}
          div.text-slate-300(class="leading-snug text-[11px] sm:text-xs") {{ u.description }}
          div.font-bold.text-amber-300(class="text-[11px] sm:text-xs mt-0.5") {{ u.effect }}
        //- Buy / Maxed
        div.shrink-0
          template(v-if="isUpgradeMaxed(u.id)")
            div.rounded-lg.border.border-emerald-700.bg-emerald-900.px-3.py-2.text-emerald-200.text-xs.font-black.uppercase MAX
          template(v-else)
            FButton(
              :is-disabled="!canAffordUpgrade(u.id)"
              size="sm"
              @click="buyUpgrade(u.id)"
            )
              div.flex.items-center.gap-1
                div.h-3.w-3.rounded-full(
                  class="bg-gradient-to-br from-[#ffe79e] via-[#ff8c2a] to-[#c5320e]"
                )
                span.tabular-nums {{ upgradeCost(u.id) }}

    template(#footer)
      FButton(size="md" @click="close") Close


</template>

<style scoped lang="sass">
.tabular-nums
  font-variant-numeric: tabular-nums
</style>
