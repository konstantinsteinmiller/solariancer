<script setup lang="ts">
import { computed } from 'vue'
import useSolTutorial from '@/use/useSolTutorial'

const { active, stage, progress, canContinue, skip, next, mode, totalStageCount } = useSolTutorial()

// Touch vs desktop — the prompt label changes based on the player's primary input.
const isTouchDevice = computed(() =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0))
)
const continueLabel = computed(() => isTouchDevice.value ? 'Tap to continue' : 'Click to continue')
const isLastStage = computed(() => stage.value >= totalStageCount.value - 1)

interface StageCard {
  title: string
  body: string
  accent: string // tailwind text class for accent words
  tone: 'cool' | 'warm' | 'amber' | 'gold'
}

const introCards: StageCard[] = [
  {
    title: 'PULL INTO THE RING',
    body: 'Drag bodies into the glowing Heat Zone around the Sun',
    accent: 'text-sky-300',
    tone: 'cool'
  },
  {
    title: 'STEER WITH MOVEMENT',
    body: 'Move your finger AROUND the body to curve its orbit. Stay still and gravity wins.',
    accent: 'text-amber-300',
    tone: 'warm'
  },
  {
    title: 'FEED RIPE TO THE SUN!',
    body: 'Only RIPE bodies pay out — raw drops are WASTED. Time it right!',
    accent: 'text-orange-300',
    tone: 'amber'
  },
  {
    title: 'YOU GOT THIS!',
    body: 'Stack 3+ bodies in the ring for ×3 Heat. Go cook the cosmos!',
    accent: 'text-yellow-200',
    tone: 'gold'
  }
]

const advancedCards: StageCard[] = [
  {
    title: 'CROWD ×3',
    body: 'When 3+ bodies orbit the ring at once, every heat tick is tripled. Stacking pays.',
    accent: 'text-amber-300',
    tone: 'warm'
  },
  {
    title: 'CHAIN COMBOS',
    body: 'Feed ripe bodies within 5s of each other to build the COMBO meter — ×2, then ×3.',
    accent: 'text-orange-300',
    tone: 'amber'
  },
  {
    title: 'CLOSE-TO-SUN',
    body: 'The hot inner band cooks 30% faster and only needs 2s warmup — risky, but fast.',
    accent: 'text-orange-300',
    tone: 'amber'
  },
  {
    title: 'EVENTS = REWARDS',
    body: 'Catch comets, survive black holes, ride flares. Every event is bonus Heat or Star Matter.',
    accent: 'text-yellow-200',
    tone: 'gold'
  }
]

const cards = computed(() => mode.value === 'advanced' ? advancedCards : introCards)
const currentCard = computed<StageCard>(() => cards.value[Math.min(stage.value, cards.value.length - 1)]!)

const toneGradient = (tone: StageCard['tone']) => {
  switch (tone) {
    case 'cool':
      return 'from-[#1a3a78] via-[#0d1f44] to-[#070d1c]'
    case 'warm':
      return 'from-[#5a3415] via-[#2a1908] to-[#160a02]'
    case 'amber':
      return 'from-[#7a3a0e] via-[#3a1a06] to-[#1c0a02]'
    case 'gold':
      return 'from-[#a06a14] via-[#4a2a08] to-[#1c0e02]'
  }
}

const toneBorder = (tone: StageCard['tone']) => {
  switch (tone) {
    case 'cool':
      return 'border-sky-400/70'
    case 'warm':
      return 'border-amber-400/70'
    case 'amber':
      return 'border-orange-400/80'
    case 'gold':
      return 'border-yellow-300/90'
  }
}
</script>

<template lang="pug">
  Transition(
    enter-active-class="transition-all duration-300 ease-out"
    leave-active-class="transition-all duration-200 ease-in"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  )
    div.absolute.inset-0.z-30.pointer-events-none(v-if="active")

      //- Click-anywhere backdrop — only captures taps once the read window
      //- has elapsed, so quick-tappers can't blow past the explanation.
      div.absolute.inset-0(
        v-if="canContinue"
        class="pointer-events-auto cursor-pointer"
        @click="next"
      )

      //- Stage card — keyed by stage so it pops on each change
      Transition(
        enter-active-class="transition-all duration-400 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 -translate-y-6 scale-90"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-95"
        mode="out-in"
      )
        div.absolute.pointer-events-none.tutorial-card-wrapper(
          :key="stage"
          class="left-1/2 -translate-x-1/2 top-[12%] sm:top-[14%] max-w-[88vw]"
        )
          div.relative.rounded-3xl.border-2.text-center.shadow-2xl.tutorial-card(
            class="px-5 py-3 backdrop-blur-md tutorial-pop"
            :class="[`bg-gradient-to-b ${toneGradient(currentCard.tone)}`, toneBorder(currentCard.tone)]"
          )
            div.uppercase.font-black.leading-tight.drop-shadow.tutorial-title(
              class="tracking-[0.2em] game-text text-2xl sm:text-3xl"
              :class="currentCard.accent"
            ) {{ currentCard.title }}
            div.text-slate-100.font-medium.mt-1.tutorial-body(
              class="leading-snug text-sm sm:text-base max-w-md mx-auto"
            ) {{ currentCard.body }}
            //- Tap/Click to continue prompt — appears only after the
            //- per-stage read threshold (2s) has elapsed.
            Transition(
              enter-active-class="transition-all duration-300 ease-out"
              leave-active-class="transition-all duration-150 ease-in"
              enter-from-class="opacity-0 translate-y-1"
              leave-to-class="opacity-0"
            )
              div.flex.items-center.justify-center.gap-2.mt-3.tutorial-prompt(v-if="canContinue")
                span.uppercase.tracking-wider.font-black.text-amber-200(class="game-text text-xs sm:text-sm tutorial-blink") {{ isLastStage ? `${continueLabel} to start` : continueLabel }}
                span.text-amber-300.text-base.font-black.leading-none ›

            //- Stage chips
            div.flex.justify-center.tutorial-chips(class="gap-1.5 mt-2.5")
              span.rounded-full.transition-all.duration-300(
                v-for="(c, i) in cards"
                :key="i"
                class="h-1.5"
                :class="[i === stage ? 'w-6 bg-amber-200' : i < stage ? 'w-3 bg-amber-500/70' : 'w-3 bg-white/20']"
              )

      //- Progress bar across the bottom
      div.absolute.left-0.right-0.bottom-0.pointer-events-none(class="h-1.5 sm:h-2 z-30")
        div.h-full.bg-gradient-to-r.from-amber-400.via-orange-400.to-amber-200.transition-all.duration-100(
          :style="{ width: `${progress * 100}%` }"
          style="box-shadow: 0 0 12px rgba(255,180,80,0.7)"
        )

      //- SKIP button
      div.absolute.pointer-events-auto(
        :style="{\
          top: 'calc(0.5rem + env(safe-area-inset-top, 0px))',\
          right: 'calc(0.5rem + env(safe-area-inset-right, 0px))'\
        }"
        class="z-40"
      )
        button.relative.inline-block.cursor-pointer(
          @click.stop="skip"
          class="hover:scale-105 active:scale-95 transition-transform"
        )
          div.relative
            div.absolute.inset-0.translate-y-1.rounded-xl.bg-black.opacity-50
            div.relative.flex.items-center.gap-1.rounded-xl.border-2.px-3(
              class="py-1.5 bg-gradient-to-b from-[#3b2750] to-[#1a0f24] border-violet-500/60 backdrop-blur"
            )
              span.uppercase.tracking-wider.font-black.text-violet-200(class="game-text text-xs sm:text-sm") Skip
              span.text-violet-300.text-base ›
</template>

<style scoped lang="sass">
.tutorial-pop
  animation: tutorialPop 480ms cubic-bezier(.18, 1.2, .32, 1) both

@keyframes tutorialPop
  0%
    transform: scale(.92)
    filter: brightness(1.4)
  60%
    transform: scale(1.04)
    filter: brightness(1.1)
  100%
    transform: scale(1)
    filter: brightness(1)

.tutorial-blink
  animation: tutorialBlink 1.4s ease-in-out infinite

@keyframes tutorialBlink
  0%, 100%
    opacity: 0.55
  50%
    opacity: 1

// ─── Landscape phones — collapse the card so the canvas action is visible ──
//
// On a landscape phone (~667×375) the default tutorial card centred at 12 % top
// covers most of the canvas. Trim padding, font size and tracking, sit the card
// near the very top, and cap its width so the singularity / asteroid demo
// stays readable behind it.
@media (orientation: landscape) and (max-height: 500px)
  .tutorial-card-wrapper
    top: 4% !important
    max-width: 60vw !important
  .tutorial-card
    padding: 0.4rem 0.85rem !important
    border-radius: 1rem !important
  .tutorial-title
    font-size: 0.85rem !important
    letter-spacing: 0.08em !important
    line-height: 1 !important
  .tutorial-body
    font-size: 10px !important
    margin-top: 1px !important
    line-height: 1.15 !important
  .tutorial-prompt
    margin-top: 0.25rem !important
    font-size: 9px !important
  .tutorial-chips
    margin-top: 0.25rem !important
    gap: 0.25rem !important

// ─── Very narrow portrait — same trim, just less aggressive ──
@media (max-width: 380px) and (orientation: portrait)
  .tutorial-card-wrapper
    max-width: 92vw !important
  .tutorial-card
    padding: 0.5rem 0.85rem !important
  .tutorial-title
    font-size: 1.1rem !important
    letter-spacing: 0.1em !important
  .tutorial-body
    font-size: 11px !important
</style>
