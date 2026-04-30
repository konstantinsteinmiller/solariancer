<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import FModal from '@/components/molecules/FModal.vue'
import FIconButton from '@/components/atoms/FIconButton.vue'
import useBattlePass, {
  BP_TOTAL_STAGES,
  BP_XP_PER_STAGE,
  BP_XP_PER_GAME_STAGE,
  BP_XP_PER_COMBO,
  BP_COMBO_THRESHOLD
} from '@/use/useBattlePass'

const {
  currentXp,
  unlockedStages,
  hasUnclaimedReward,
  pendingClaimCount,
  isStageClaimed,
  isStageUnlocked,
  bpHeatReward,
  bpMatterReward,
  bpIsMatterStage,
  claimStage,
  isMaxed,
  daysUntilReset
} = useBattlePass()

const { t } = useI18n()

const isModalOpen = ref(false)
const bpBtnRef = ref<HTMLElement | null>(null)

const formatHeat = (n: number): string => {
  if (n < 1000) return Math.floor(n).toString()
  if (n < 1e6) return (n / 1000).toFixed(1) + 'K'
  if (n < 1e9) return (n / 1e6).toFixed(2) + 'M'
  return (n / 1e9).toFixed(2) + 'B'
}

// ─── Derived UI state ───────────────────────────────────────────────────────

const inProgressStage = computed(() =>
  isMaxed.value ? 0 : unlockedStages.value + 1
)

const progressFraction = computed(() =>
  Math.max(0, Math.min(1, currentXp.value / BP_XP_PER_STAGE))
)

const stageCards = computed(() =>
  Array.from({ length: BP_TOTAL_STAGES }, (_, i) => {
    const stage = i + 1
    const isMatter = bpIsMatterStage(stage)
    return {
      stage,
      isMatter,
      heat: isMatter ? 0 : bpHeatReward(stage),
      matter: isMatter ? bpMatterReward(stage) : 0,
      unlocked: isStageUnlocked(stage),
      claimed: isStageClaimed(stage),
      inProgress: stage === inProgressStage.value
    }
  })
)

// ─── Auto-scroll to in-progress stage when modal opens ─────────────────────

const stripRef = ref<HTMLElement | null>(null)

const scrollToCurrentStage = () => {
  if (!stripRef.value) return
  const firstUnclaimed = stageCards.value.find(c => c.unlocked && !c.claimed)
  const target = firstUnclaimed
    ? firstUnclaimed.stage
    : inProgressStage.value > 0
      ? inProgressStage.value
      : BP_TOTAL_STAGES
  const el = stripRef.value.querySelector<HTMLElement>(`[data-bp-stage="${target}"]`)
  if (!el) return
  const strip = stripRef.value
  const offset = el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2
  strip.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' })
}

watch(isModalOpen, (open) => {
  if (!open) return
  nextTick(() => scrollToCurrentStage())
})

const onClaim = (stage: number) => {
  claimStage(stage)
}

// ─── Drag-to-scroll for the BP strip (mouse only) ──────────────────────────

const isDragging = ref(false)
let dragStartX = 0
let dragScrollLeft = 0
let dragMoved = false

const onStripPointerDown = (e: PointerEvent) => {
  // Touch / pen gestures use the browser's native horizontal scroll.
  if (e.pointerType !== 'mouse') return
  const strip = stripRef.value
  if (!strip) return
  isDragging.value = true
  dragMoved = false
  dragStartX = e.clientX
  dragScrollLeft = strip.scrollLeft
}

const onStripPointerMove = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse') return
  if (!isDragging.value || !stripRef.value) return
  const dx = e.clientX - dragStartX
  if (Math.abs(dx) > 3) {
    if (!dragMoved) {
      stripRef.value.setPointerCapture(e.pointerId)
    }
    dragMoved = true
  }
  if (dragMoved) stripRef.value.scrollLeft = dragScrollLeft - dx
}

const onStripPointerUp = (e: PointerEvent) => {
  if (!isDragging.value) return
  isDragging.value = false
  if (dragMoved) stripRef.value?.releasePointerCapture(e.pointerId)
}
</script>

<template lang="pug">
  //- Open-modal button — caller positions this in the bottom HUD.
  div.battle-pass
    button.group.cursor-pointer.z-10.transition-transform(
      ref="bpBtnRef"
      class="hover:scale-[103%] active:scale-95"
      :class="{ 'attention-bounce': hasUnclaimedReward }"
      @click="isModalOpen = true"
      :aria-label="t('battlePass.battlePass')"
      :title="t('battlePass.battlePass')"
    )
      div.relative
        div.absolute.inset-0.translate-y-1.rounded-xl.bg-black(class="opacity-40")
        div.relative.flex.flex-col.items-center.justify-center.h-10.w-10.rounded-xl.border-2(
          class="bg-gradient-to-b from-[#5b3bff] to-[#2a1a88] border-violet-300/60 shadow-lg leading-none"
        )
          span.font-black.game-text.text-white(class="text-[9px] leading-none") BP
          span.font-black.game-text.text-amber-300.leading-none(class="text-[10px] mt-0.5") {{ unlockedStages }}
        //- Pending-claim chip
        div(
          v-if="pendingClaimCount > 0"
          class="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 border-2 border-[#0f1a30] text-white text-[10px] font-black px-1"
        ) {{ pendingClaimCount }}

  //- Battle Pass Modal
  FModal(
    v-model="isModalOpen"
    :is-closable="true"
    :title="t('battlePass.battlePass')"
  )
    div(class="space-y-3 px-1 sm:px-3 py-2 max-h-[70vh] overflow-y-auto")
      //- Summary row
      div(class="flex items-center gap-2 px-1 sm:px-2")
        div.flex.flex-col.items-start.shrink-0
          span.text-gray-300.font-bold.uppercase(class="text-[8px] sm:text-[10px]") {{ t('stage') }}
          span.text-white.font-black.game-text.leading-none(class="text-lg sm:text-xl") {{ unlockedStages }}/{{ BP_TOTAL_STAGES }}
        div.flex-1.flex.flex-col.gap-1
          div.flex.justify-between.items-end
            span.text-gray-300.font-bold.uppercase(class="text-[8px] sm:text-[10px]")
              template(v-if="isMaxed") {{ t('battlePass.complete') }}
              template(v-else) {{ t('stage') }} {{ inProgressStage }}
            span.text-yellow-400.font-black.game-text(class="text-[9px] sm:text-xs")
              template(v-if="isMaxed") {{ t('battlePass.max') }}
              template(v-else) {{ Math.floor(currentXp) }}/{{ BP_XP_PER_STAGE }} xp
          div.relative.w-full.overflow-hidden.rounded-full.border(
            class="h-2.5 sm:h-3 bg-slate-800/70 border-slate-700"
          )
            div.h-full.rounded-full.transition-all(
              class="bg-gradient-to-r from-[#8b5cf6] via-[#a78bfa] to-[#fbbf24]"
              :style="{ width: `${progressFraction * 100}%` }"
            )

      //- Stage strip
      div.relative
        div.flex.gap-1.overflow-x-auto.overflow-y-hidden.py-2.px-1.bp-strip(
          ref="stripRef"
          class="sm:gap-2"
          :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
          @pointerdown="onStripPointerDown"
          @pointermove="onStripPointerMove"
          @pointerup="onStripPointerUp"
          @pointercancel="onStripPointerUp"
        )
          div(
            v-for="card in stageCards"
            :key="card.stage"
            :data-bp-stage="card.stage"
            class="shrink-0 flex flex-col items-center rounded-xl p-1 sm:p-2 border-2 transition-all w-16 sm:w-20"
            :class="[\
              card.claimed \
                ? 'bg-green-900/40 border-green-500/50' \
                : card.unlocked \
                  ? (card.isMatter ? 'bg-violet-900/40 border-violet-400' : 'bg-amber-900/40 border-amber-400') \
                  : card.inProgress \
                    ? (card.isMatter ? 'bg-violet-900/25 border-violet-500/70' : 'bg-amber-900/25 border-amber-500/70') \
                    : (card.isMatter ? 'bg-violet-900/20 border-violet-700/60' : 'bg-slate-700/50 border-slate-600')\
            ]"
          )
            //- Stage number
            div.text-gray-300.font-bold.uppercase(class="text-[8px] sm:text-[10px]") S{{ card.stage }}

            //- Reward icon: orange dot for Heat, violet diamond for Star Matter.
            //- Matches the visual language used in HeatBadge / StarMatterBadge
            //- so the player reads the reward instantly.
            template(v-if="card.isMatter")
              div.relative.flex.items-center.justify-center(class="my-0.5")
                div.h-5.w-5(
                  class="rotate-45 bg-gradient-to-br from-[#c8a8ff] to-[#5d3aa8]"
                  style="box-shadow: 0 0 8px rgba(170,110,255,0.7)"
                )
            template(v-else)
              div.relative.flex.items-center.justify-center(class="my-0.5")
                div.h-5.w-5.rounded-full(
                  class="bg-gradient-to-br from-[#ffe79e] via-[#ff8c2a] to-[#c5320e]"
                  style="box-shadow: 0 0 6px rgba(255,140,42,0.55)"
                )

            //- Reward amount
            div.font-black.game-text.leading-tight(
              :class="card.isMatter ? 'text-violet-200' : 'text-amber-300'"
              class="text-[9px] sm:text-xs"
            )
              template(v-if="card.isMatter") +{{ card.matter }}
              template(v-else) +{{ formatHeat(card.heat) }}

            //- Status row
            div(class="mt-0.5 text-[8px] sm:text-[10px] font-bold")
              span.text-green-400(v-if="card.claimed") ✓
              template(v-else-if="card.unlocked")
                FIconButton(
                  type="primary"
                  size="sm"
                  icon="right"
                  @click="onClaim(card.stage)"
                )
              template(v-else-if="card.inProgress")
                span.text-amber-300 {{ Math.floor(progressFraction * 100) }}%
              span.text-slate-500(v-else) —

      //- Season reset countdown
      div.text-center(
        v-if="daysUntilReset != null"
        class="text-[10px] sm:text-xs text-amber-400/80 font-bold"
      ) {{ t('battlePass.seasonReset', { n: daysUntilReset }) }}
      //- Footer tip
      div.text-center(class="text-[10px] sm:text-xs text-slate-400 leading-snug")
        template(v-if="isMaxed")
          | {{ t('battlePass.battlePassComplete') }}
        template(v-else-if="hasUnclaimedReward")
          | {{ t('battlePass.rewardsReady', { n: pendingClaimCount }) }}
        template(v-else)
          | {{ t('battlePass.xpHint', { stage: BP_XP_PER_GAME_STAGE, combo: BP_XP_PER_COMBO, threshold: BP_COMBO_THRESHOLD }) }}
</template>

<style scoped lang="sass">
.bp-strip
  scrollbar-width: none
  touch-action: pan-x pan-y
  user-select: none

  &::-webkit-scrollbar
    display: none
</style>

<!--
  Battle Pass strings live in the global locale files (battlePass.*) so
  they participate in the per-language lazy chunk that setI18nLocale
  fetches on language switch — see src/i18n/locales/*.ts.
-->
