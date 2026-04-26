<script setup lang="ts">
import { computed } from 'vue'
import FModal from '@/components/molecules/FModal.vue'
import useSolMission, { type MissionReward } from '@/use/useSolMission'

const { missionAchieved, missionRewards, claimReward } = useSolMission()

const isOpen = computed(() => missionAchieved.value && missionRewards.value.length > 0)

const cardGradient = (id: MissionReward['id']): string => {
  switch (id) {
    case 'heat':
      return 'from-amber-700 to-orange-900 border-amber-300'
    case 'matter':
      return 'from-violet-700 to-fuchsia-900 border-violet-300'
    case 'boost':
      return 'from-orange-600 to-red-900 border-orange-300'
    case 'combo':
      return 'from-yellow-600 to-amber-900 border-yellow-300'
    case 'ripe':
      return 'from-amber-500 to-rose-900 border-amber-200'
  }
}

const iconFor = (id: MissionReward['id']): string => {
  switch (id) {
    case 'heat':
      return '☼'
    case 'matter':
      return '✦'
    case 'boost':
      return '×2'
    case 'combo':
      return '×3'
    case 'ripe':
      return '🔥'
  }
}
</script>

<template lang="pug">
  FModal(
    :model-value="isOpen"
    :is-closable="false"
    title="Mission Complete"
  )
    div.flex.flex-col.p-1(class="gap-2 sm:gap-3")
      div.text-center.font-black.uppercase.tracking-wider(class="text-sky-200 game-text text-xs sm:text-sm")
        | Choose your reward
      //- Cards stack vertically on phones, 3-column grid on tablet+ so the
      //- modal fits without scrolling on either form factor.
      div.grid(class="grid-cols-1 sm:grid-cols-3 gap-2")
        button.relative.cursor-pointer.text-left(
          v-for="reward in missionRewards"
          :key="reward.id"
          class="hover:scale-[1.03] active:scale-95 transition-transform"
          @click="claimReward(reward)"
        )
          div.relative.rounded-xl.border-2.shadow-lg.overflow-hidden(
            :class="['bg-gradient-to-b', cardGradient(reward.id)]"
            class="p-2 sm:p-3"
          )
            div.flex.items-center.gap-2(class="mb-1 sm:mb-2")
              //- Icon chip — `bg-black/40` MUST be in class="" because of the slash.
              div.h-8.w-8.flex.items-center.justify-center.rounded-lg.font-black.text-white(
                class="bg-black/40 game-text text-base sm:text-lg"
              ) {{ iconFor(reward.id) }}
              span.font-black.uppercase.tracking-wider.text-white(
                class="game-text text-xs sm:text-sm"
              ) {{ reward.title }}
            div.text-white(class="leading-tight text-[11px] sm:text-xs opacity-90") {{ reward.description }}
</template>
