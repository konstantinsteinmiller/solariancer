<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import useSolKeeper from '@/use/useSolKeeper'
import useSolEvents from '@/use/useSolEvents'
import { ripeCount } from '@/use/useGravityPhysics'
import { isMobileLandscape, isCompactViewport, isTabletViewport } from '@/use/useUser'
import SolStageBadge from '@/components/organisms/SolStageBadge.vue'
import HeatBadge from '@/components/organisms/HeatBadge.vue'
import StarMatterBadge from '@/components/organisms/StarMatterBadge.vue'
import ZoneBadge from '@/components/organisms/ZoneBadge.vue'
import SessionBadge from '@/components/organisms/SessionBadge.vue'
import StreakBadge from '@/components/organisms/StreakBadge.vue'
import MissionBadge from '@/components/organisms/MissionBadge.vue'
import PuzzleBadge from '@/components/organisms/PuzzleBadge.vue'

const sk = useSolKeeper()
const events = useSolEvents()
const { state } = sk
const { comboCount, comboMultiplier, comboActive, comboTimeLeft } = sk
const { flareActive, flareWarning, flareTimeLeft, flareMultiplier } = events

// Compact mode = anything narrow enough that the badges need to shrink.
// Covers mobile portrait, mobile landscape, and narrow desktop windows.
const compact = computed(() => isCompactViewport.value)
// Tablet sits between phone and desktop — use a slight scale-down.
const tablet = computed(() => isTabletViewport.value)
</script>

<template lang="pug">
  div.pointer-events-none.absolute.inset-0(class="z-20")

    //- ─── Top-left ───────────────────────────────────────────────────────
    //- Stage badge — Chaos Arena style with 1000-heat progress bar.
    div.absolute.top-0.left-0.pointer-events-auto(
      :style="{\
        paddingTop: 'calc(0.4rem + env(safe-area-inset-top, 0px))',\
        paddingLeft: 'calc(0.4rem + env(safe-area-inset-left, 0px))'\
      }"
      :class="[\
        compact ? 'scale-75 origin-top-left' : (tablet ? 'scale-90 origin-top-left' : '')\
      ]"
    )
      SolStageBadge

    //- ─── Top-right ──────────────────────────────────────────────────────
    //- Stack: each row is [secondary badge | primary badge].
    //- Row 1: ZoneBadge | HeatBadge
    //- Row 2: SessionBadge | StarMatterBadge
    //- Row 3: (empty)     | StreakBadge      ← bottom-most
    div.absolute.top-0.right-0.pointer-events-auto(
      :style="{\
        paddingTop: 'calc(0.4rem + env(safe-area-inset-top, 0px))',\
        paddingRight: 'calc(0.4rem + env(safe-area-inset-right, 0px))'\
      }"
      :class="[\
        compact ? 'scale-75 origin-top-right' : (tablet ? 'scale-90 origin-top-right' : '')\
      ]"
    )
      div.flex.flex-col.gap-1.items-end
        div.flex.items-center.gap-2
          ZoneBadge(:compact="compact")
          HeatBadge(:compact="compact")
        div.flex.items-center.gap-2(v-if="state.starMatter > 0 || state.preferences.showSessionBadge")
          SessionBadge(v-if="state.preferences.showSessionBadge" :compact="compact")
          StarMatterBadge(:compact="compact")
        StreakBadge(:compact="compact")
        MissionBadge(:compact="compact")
        PuzzleBadge(:compact="compact")

        //- Ripe-body chip — only when there are cooked bodies waiting to feed
        div.inline-flex.items-center.gap-2.rounded-xl.border-2.shadow-lg(
          v-if="ripeCount > 0"
          class="px-3 py-1 bg-gradient-to-b from-[#3a2415] to-[#1c0f06] border-[#0f1a30]"
        )
          span.uppercase.tracking-wider.text-amber-200.font-black(class="game-text text-[10px]") Ripe
          span.font-black.text-amber-100.tabular-nums(class="game-text text-base") {{ ripeCount }}

    //- ─── Top-center: combo + flare cluster (unchanged) ──────────────────
    div.absolute.pointer-events-none(
      :style="{ top: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }"
      class="left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1"
      :class="[compact ? 'scale-75 origin-top' : (tablet ? 'scale-90 origin-top' : '')]"
    )
      Transition(
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-300 ease-in"
        enter-from-class="opacity-0 -translate-y-2 scale-90"
        leave-to-class="opacity-0 -translate-y-2 scale-95"
      )
        div.inline-flex.items-center.gap-2.rounded-2xl.border-2.shadow-2xl(
          v-if="flareActive || flareWarning"
          class="px-4 py-1.5 backdrop-blur-md"
          :class="flareActive\
            ? 'bg-gradient-to-b from-[#7a1f0c] to-[#3a0e04] border-orange-400 animate-pulse'\
            : 'bg-gradient-to-b from-[#5a2c10] to-[#2a1408] border-amber-400'"
        )
          span.text-xl.font-black(
            class="game-text"
            :class="flareActive ? 'text-orange-200' : 'text-amber-200'"
          ) {{ flareActive ? `☼ SOLAR FLARE ×${flareMultiplier}` : '⚠ FLARE INCOMING' }}
          span.text-orange-100.font-black.tabular-nums(class="game-text text-base") {{ flareTimeLeft.toFixed(1) }}s

      Transition(
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-300 ease-in"
        enter-from-class="opacity-0 -translate-y-1 scale-90"
        leave-to-class="opacity-0 -translate-y-2 scale-95"
      )
        //- Combo banner — collapses on compact viewports (drops the chain
        //- subtext, tightens padding) so it never overlaps the right-side
        //- HUD column on portrait phones.
        div.inline-flex.items-center.rounded-2xl.border-2.shadow-2xl(
          v-if="comboActive"
          class="bg-gradient-to-b from-[#3a2010] to-[#1a0c04] border-amber-300 backdrop-blur-md"
          :class="[compact ? 'gap-1 px-2 py-0.5' : 'gap-2 px-4 py-1.5']"
        )
          span.text-amber-200.font-black.uppercase.tracking-wider(
            class="game-text"
            :class="compact ? 'text-[10px]' : 'text-xs'"
          ) Combo
          span.text-amber-100.font-black(
            class="game-text"
            :class="compact ? 'text-base' : 'text-xl'"
          ) ×{{ comboMultiplier }}
          span.text-amber-300.font-bold.tabular-nums(
            class="game-text"
            :class="compact ? 'text-[10px]' : 'text-xs'"
          ) {{ comboTimeLeft.toFixed(1) }}s
          //- Chain count is hidden on compact — it's nice-to-have, not crit.
          span.text-amber-200.uppercase.font-bold(
            v-if="!compact"
            class="game-text text-[10px]"
          ) {{ comboCount }} chain
</template>

<style scoped lang="sass">
.tabular-nums
  font-variant-numeric: tabular-nums
</style>
