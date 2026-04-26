<script setup lang="ts">
// Generic HUD pill — icon slot + label + value. Used by HeatBadge,
// StarMatterBadge, ZoneBadge, SessionBadge, StreakBadge so all five share
// the same gradient/border/typography rules.

interface Props {
  label: string
  value: string | number
  /** Tailwind tone for backdrop & accents — picks gradients + text colors below. */
  tone?: 'amber' | 'sky' | 'fuchsia' | 'violet' | 'orange' | 'slate'
  /** Optional ring / pulse highlight (e.g. crowd bonus, combo active). */
  highlight?: boolean
  /** Compact mode for landscape — slightly smaller. */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'slate',
  highlight: false,
  compact: false
})

const tones = {
  amber: { from: 'from-[#3a2010]', to: 'to-[#1a0c04]', label: 'text-amber-200', value: 'text-amber-100' },
  sky: { from: 'from-[#0f1a30]', to: 'to-[#070d1c]', label: 'text-sky-300', value: 'text-sky-100' },
  fuchsia: { from: 'from-[#1a0f24]', to: 'to-[#0f0518]', label: 'text-fuchsia-300', value: 'text-fuchsia-100' },
  violet: { from: 'from-[#1a2350]', to: 'to-[#0e1733]', label: 'text-violet-200', value: 'text-violet-100' },
  orange: { from: 'from-[#3a2010]', to: 'to-[#1a0c04]', label: 'text-orange-200', value: 'text-orange-100' },
  slate: { from: 'from-[#172238]', to: 'to-[#0c1424]', label: 'text-slate-300', value: 'text-slate-100' }
} as const
</script>

<template lang="pug">
  div.relative.inline-flex.items-center.gap-2.rounded-xl.border-2.shadow-lg(
    class="px-3 py-1 bg-gradient-to-b border-[#0f1a30]"
    :class="[\
      tones[props.tone].from,\
      tones[props.tone].to,\
      props.compact ? 'scale-90' : '',\
      props.highlight ? 'ring-2 ring-amber-300' : ''\
    ]"
  )
    //- Caller-provided icon (gradient circle / sparkle / etc.)
    slot(name="icon")
    div.flex.flex-col.leading-none
      span.uppercase.tracking-wider.font-black(
        class="game-text text-[10px]"
        :class="tones[props.tone].label"
      ) {{ props.label }}
      span.font-black.tabular-nums(
        :class="['game-text', tones[props.tone].value, props.compact ? 'text-sm' : 'text-base']"
      ) {{ props.value }}
    //- Caller-provided trailing slot (combo timer chip, ×3 chip, etc.)
    slot
</template>
