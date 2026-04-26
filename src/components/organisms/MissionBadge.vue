<script setup lang="ts">
import { computed } from 'vue'
import useSolMission from '@/use/useSolMission'

const props = defineProps<{ compact?: boolean }>()
const { missionActive, missionTimeLeft, missionProgress, missionEarned, missionGoal } = useSolMission()

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const timeLabel = computed(() => formatTime(missionTimeLeft.value))
const progressLabel = computed(() => `${Math.floor(missionEarned.value)} / ${missionGoal.value}`)
const isUrgent = computed(() => missionTimeLeft.value < 30)
</script>

<template lang="pug">
  div.relative.inline-flex.items-center.gap-2.rounded-xl.border-2.shadow-lg(
    v-if="missionActive"
    class="px-3 py-1 bg-gradient-to-b from-[#0f3a78] to-[#091a3a] border-[#0f1a30]"
    :class="[isUrgent ? 'border-red-400 ring-2 ring-red-500/40' : 'border-sky-500/60', compact ? 'scale-90' : '']"
  )
    //- Mission icon — small target/crosshair
    div.relative.h-5.w-5.rounded-full.flex.items-center.justify-center(
      class="bg-gradient-to-br from-sky-300 to-blue-700"
      style="box-shadow: 0 0 8px rgba(120,200,255,0.85)"
    )
      div.h-2.w-2.rounded-full.bg-white
    div.flex.flex-col.leading-none(class="min-w-[6.5rem]")
      div.flex.items-baseline.gap-1.justify-between
        span.uppercase.tracking-wider.text-sky-200.font-black(class="game-text text-[10px]") Mission
        span.font-black.tabular-nums(
          class="game-text text-[10px]"
          :class="isUrgent ? 'text-red-300' : 'text-sky-300'"
        ) {{ timeLabel }}
      //- Progress bar
      div.relative.h-1.rounded-full.overflow-hidden(class="bg-black/50 mt-0.5")
        div.absolute.inset-y-0.left-0.bg-gradient-to-r.from-sky-300.to-cyan-400.transition-all.duration-200(
          :style="{ width: `${missionProgress * 100}%` }"
        )
      span.font-bold.tabular-nums(
        class="game-text text-[9px] text-sky-100 mt-0.5"
      ) {{ progressLabel }}
</template>
