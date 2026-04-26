<script setup lang="ts">
// Top-left stage chip with progress bar to next stage.
// Visual riff on the Chaos Arena stage badge — a 3D drop-shadow base, a
// tinted gradient body, and a chunky number chip on the left.
import { computed } from 'vue'
import useSolKeeper from '@/use/useSolKeeper'

const sk = useSolKeeper()

const stageId = computed(() => sk.state.value.stage)
const stageName = computed(() => sk.stageTypeName.value)
const progress = computed(() => sk.stageProgressFraction.value)
const progressLabel = computed(() => `${Math.floor(sk.state.value.stageProgress)} / ${sk.currentStageGoal.value}`)
const solarClass = computed(() => sk.state.value.solarClass)

interface StageTheme {
  from: string;
  to: string;
  border: string;
  shadow: string;
  number: string;
  numberBg: string;
  accent: string;
  bar: string
}

// Cycles through palettes by sun-skin tier (which is itself derived from stage)
const themes: StageTheme[] = [
  // 0: G-Type
  {
    from: 'from-amber-500',
    to: 'to-amber-800',
    border: 'border-amber-300',
    shadow: 'bg-amber-950',
    number: 'text-amber-50',
    numberBg: 'bg-amber-950/70',
    accent: 'text-amber-200',
    bar: 'from-amber-300 to-orange-400'
  },
  // 1: K-Type
  {
    from: 'from-orange-500',
    to: 'to-orange-800',
    border: 'border-orange-300',
    shadow: 'bg-orange-950',
    number: 'text-orange-50',
    numberBg: 'bg-orange-950/70',
    accent: 'text-orange-200',
    bar: 'from-orange-300 to-red-500'
  },
  // 2: M-Type
  {
    from: 'from-red-500',
    to: 'to-red-800',
    border: 'border-red-300',
    shadow: 'bg-red-950',
    number: 'text-red-50',
    numberBg: 'bg-red-950/70',
    accent: 'text-red-200',
    bar: 'from-red-300 to-rose-500'
  },
  // 3: Red Giant
  {
    from: 'from-rose-500',
    to: 'to-rose-900',
    border: 'border-rose-300',
    shadow: 'bg-rose-950',
    number: 'text-rose-50',
    numberBg: 'bg-rose-950/70',
    accent: 'text-rose-200',
    bar: 'from-rose-300 to-red-700'
  },
  // 4: Blue Dwarf
  {
    from: 'from-sky-500',
    to: 'to-sky-900',
    border: 'border-sky-300',
    shadow: 'bg-sky-950',
    number: 'text-sky-50',
    numberBg: 'bg-sky-950/70',
    accent: 'text-sky-200',
    bar: 'from-sky-300 to-blue-500'
  },
  // 5: White Dwarf
  {
    from: 'from-slate-300',
    to: 'to-slate-700',
    border: 'border-slate-200',
    shadow: 'bg-slate-950',
    number: 'text-slate-50',
    numberBg: 'bg-slate-950/70',
    accent: 'text-slate-100',
    bar: 'from-white to-sky-300'
  },
  // 6: Brown Dwarf
  {
    from: 'from-stone-600',
    to: 'to-stone-900',
    border: 'border-stone-300',
    shadow: 'bg-stone-950',
    number: 'text-stone-50',
    numberBg: 'bg-stone-950/70',
    accent: 'text-stone-200',
    bar: 'from-stone-400 to-amber-700'
  },
  // 7: Neutron
  {
    from: 'from-fuchsia-500',
    to: 'to-fuchsia-900',
    border: 'border-fuchsia-300',
    shadow: 'bg-fuchsia-950',
    number: 'text-fuchsia-50',
    numberBg: 'bg-fuchsia-950/70',
    accent: 'text-fuchsia-200',
    bar: 'from-fuchsia-300 to-violet-600'
  }
]

const theme = computed<StageTheme>(() => themes[sk.sunSkinTier.value] ?? themes[0]!)
</script>

<template lang="pug">
  div.relative
    //- 3D drop-shadow base
    div.absolute.inset-0.translate-y-1.rounded-xl.opacity-80(:class="theme.shadow")
    //- Body
    div.relative.flex.items-center.gap-2.rounded-xl.border-2.shadow-lg.overflow-hidden(
      :class="['bg-gradient-to-b', theme.from, theme.to, theme.border]"
      class="pl-1.5 pr-3 py-1"
    )
      //- Stage number chip
      div.relative.flex.items-center.justify-center.rounded-lg.border(
        :class="[theme.numberBg, theme.border]"
        class="min-w-7 h-7 sm:min-w-8 sm:h-8 px-1"
      )
        span.font-black.game-text.leading-none(
          :class="theme.number"
          class="text-sm sm:text-base"
        ) {{ stageId }}
      //- Label, name, progress
      div.flex.flex-col.leading-tight(class="min-w-[7.5rem] sm:min-w-[9rem]")
        div.flex.items-baseline.gap-1
          span.font-black.uppercase.tracking-wider.game-text.text-white(
            class="text-[9px] sm:text-[11px] opacity-90"
          ) Stage {{ stageId }}
          span.font-bold.italic.game-text(
            :class="theme.accent"
            class="text-[10px] sm:text-xs"
          ) {{ stageName }}
          //- Solar Class chip — only when prestiged at least once
          span.font-black.text-fuchsia-200(
            v-if="solarClass > 0"
            class="game-text text-[9px] sm:text-[10px] px-1 rounded-full bg-fuchsia-900/70 border border-fuchsia-400/60"
          ) ★{{ solarClass }}
        //- Progress bar
        div.relative.rounded-full.overflow-hidden(
          class="h-1.5 bg-black/50 mt-0.5"
        )
          div.absolute.inset-y-0.left-0.rounded-full.transition-all.duration-200(
            :class="['bg-gradient-to-r', theme.bar]"
            :style="{ width: `${progress * 100}%` }"
          )
        span.text-white.font-bold.tabular-nums(
          class="game-text text-[9px] sm:text-[10px] opacity-80 mt-0.5"
        ) {{ progressLabel }}
</template>
