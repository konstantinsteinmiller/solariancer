<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import useSolPuzzles from '@/use/useSolPuzzles'

const props = defineProps<{ compact?: boolean }>()
const { activePuzzle, puzzleTimeLeft, puzzleProgress, puzzleProgressLabel } = useSolPuzzles()
const { t } = useI18n()
// Localised puzzle title; the composable now stores `id` only — the display
// strings live in the i18n locale files under `game.puzzle.<id>.title`.
const puzzleTitle = computed(() =>
  activePuzzle.value ? t(`game.puzzle.${activePuzzle.value.id}.title`) : ''
)

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
const timeLabel = computed(() => formatTime(puzzleTimeLeft.value))
const isUrgent = computed(() => puzzleTimeLeft.value < 10)
</script>

<template lang="pug">
  div.relative.inline-flex.items-center.gap-2.rounded-xl.border-2.shadow-lg(
    v-if="activePuzzle"
    class="px-3 py-1 bg-gradient-to-b from-[#3b1850] to-[#150518] border-[#0f1a30]"
    :class="[isUrgent ? 'border-red-400 ring-2 ring-red-500/40' : 'border-fuchsia-400/60', compact ? 'scale-90' : '']"
  )
    //- Constellation icon — small star cluster
    div.relative.h-5.w-5(class="rotate-45 bg-gradient-to-br from-[#ff7ae0] to-[#5d3aa8]"
      style="box-shadow: 0 0 8px rgba(220,140,255,0.85)")
    div.flex.flex-col.leading-none(class="min-w-[7rem]")
      div.flex.items-baseline.gap-1.justify-between
        span.uppercase.tracking-wider.text-fuchsia-200.font-black(class="game-text text-[10px]") {{ t('game.hud.puzzle') }}
        span.font-black.tabular-nums(
          class="game-text text-[10px]"
          :class="isUrgent ? 'text-red-300' : 'text-fuchsia-300'"
        ) {{ timeLabel }}
      span.font-bold(
        class="game-text text-[10px] text-fuchsia-100 truncate max-w-[8rem]"
      ) {{ puzzleTitle }}
      div.relative.h-1.rounded-full.overflow-hidden(class="bg-black/50 mt-0.5")
        div.absolute.inset-y-0.left-0.bg-gradient-to-r.from-fuchsia-300.to-violet-500.transition-all.duration-200(
          :style="{ width: `${puzzleProgress * 100}%` }"
        )
      span.font-bold.tabular-nums(
        class="game-text text-[9px] text-fuchsia-200 mt-0.5"
      ) {{ puzzleProgressLabel }}
</template>
