<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FModal from '@/components/molecules/FModal.vue'
import useAchievements from '@/use/useAchievements'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { achievements, isUnlocked, unlockedCount, totalCount, markAllSeen } = useAchievements()
const { t } = useI18n()
// Title + description are pulled from i18n by id — composable carries
// only id / glyph / colors / check predicate.
const achievementTitle = (id: string) => t(`game.achievement.${id}.title`)
const achievementDescription = (id: string) => t(`game.achievement.${id}.description`)

// Mark unseen unlocks as seen the moment the modal opens, so the trophy
// icon's pulse can clear once the player has actually looked at the list.
watch(() => props.isOpen, (open) => {
  if (open) markAllSeen()
})
</script>

<template lang="pug">
  FModal(
    :model-value="isOpen"
    @update:model-value="(v) => !v && emit('close')"
    :title="t('game.modal.achievements')"
  )
    div.flex.items-center.justify-center.gap-2.mb-3
      span.text-cyan-300.font-black.game-text(class="text-sm sm:text-base")
        | {{ t('game.achievement.unlockedCount', { n: unlockedCount, total: totalCount }) }}

    div.grid.gap-3.overflow-y-auto.ach-grid(
      class="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-h-[60vh] p-1"
    )
      div.ach-card(
        v-for="a in achievements"
        :key="a.id"
        :class="{ 'ach-card--locked': !isUnlocked(a.id) }"
      )
        //- Crest badge
        div.ach-crest
          svg.ach-crest__svg(viewBox="-60 -60 120 120" xmlns="http://www.w3.org/2000/svg")
            defs
              linearGradient(:id="`ach-body-${a.id}`" x1="0%" y1="0%" x2="0%" y2="100%")
                stop(offset="0%" :stop-color="isUnlocked(a.id) ? a.color.from : '#64748b'")
                stop(offset="100%" :stop-color="isUnlocked(a.id) ? a.color.to : '#1f2937'")
              linearGradient(:id="`ach-ribbon-${a.id}`" x1="0%" y1="0%" x2="0%" y2="100%")
                stop(offset="0%" :stop-color="isUnlocked(a.id) ? a.color.from : '#94a3b8'")
                stop(offset="100%" :stop-color="isUnlocked(a.id) ? a.color.accent : '#334155'")
              filter(:id="`ach-halo-${a.id}`" x="-75%" y="-75%" width="250%" height="250%")
                feGaussianBlur(in="SourceGraphic" stdDeviation="6")

            //- Soft glow behind unlocked badge
            g(v-if="isUnlocked(a.id)" :filter="`url(#ach-halo-${a.id})`" opacity="0.75")
              circle(cx="0" cy="0" r="42" :fill="a.color.from")

            //- Laurel wreath — two curved leaf clusters on the sides
            g(:stroke="isUnlocked(a.id) ? a.color.accent : '#475569'" stroke-width="2" fill="none" stroke-linecap="round")
              path(d="M-46 -8 Q-54 10 -42 30")
              path(d="M-46 -4 Q-52 8 -42 20")
              path(d="M46 -8 Q54 10 42 30")
              path(d="M46 -4 Q52 8 42 20")
            //- Small leaves
            g(:fill="isUnlocked(a.id) ? a.color.from : '#64748b'")
              ellipse(cx="-50" cy="-2" rx="4" ry="2" transform="rotate(30 -50 -2)")
              ellipse(cx="-50" cy="10" rx="4" ry="2" transform="rotate(55 -50 10)")
              ellipse(cx="-48" cy="22" rx="4" ry="2" transform="rotate(80 -48 22)")
              ellipse(cx="50" cy="-2" rx="4" ry="2" transform="rotate(-30 50 -2)")
              ellipse(cx="50" cy="10" rx="4" ry="2" transform="rotate(-55 50 10)")
              ellipse(cx="48" cy="22" rx="4" ry="2" transform="rotate(-80 48 22)")

            //- Shield body
            path(
              d="M0 -46 L36 -34 L36 6 Q36 32 0 46 Q-36 32 -36 6 L-36 -34 Z"
              :fill="`url(#ach-body-${a.id})`"
              :stroke="isUnlocked(a.id) ? a.color.accent : '#111827'"
              stroke-width="3"
              stroke-linejoin="round"
            )
            //- Inner chevron decoration
            path(
              d="M-28 -18 L0 -6 L28 -18 L28 -2 L0 10 L-28 -2 Z"
              :fill="isUnlocked(a.id) ? a.color.accent : '#0f172a'"
              opacity="0.55"
            )
            //- Inner rim
            path(
              d="M0 -40 L30 -30 L30 4 Q30 26 0 40 Q-30 26 -30 4 L-30 -30 Z"
              fill="none"
              :stroke="isUnlocked(a.id) ? '#ffffff' : '#94a3b8'"
              stroke-width="1.4"
              opacity="0.5"
            )

            //- Glyph (label inside the shield)
            text(
              x="0"
              y="8"
              text-anchor="middle"
              font-family="'Inter', sans-serif"
              font-weight="900"
              font-size="18"
              :fill="isUnlocked(a.id) ? '#ffffff' : '#94a3b8'"
              style="text-shadow: 1px 1px 0 #000;"
            ) {{ a.glyph }}

            //- Ribbon banner across the bottom
            g
              path(
                d="M-34 36 L-30 50 L-14 46 L-14 36 Z"
                :fill="`url(#ach-ribbon-${a.id})`"
                :stroke="isUnlocked(a.id) ? a.color.accent : '#111827'"
                stroke-width="1.5"
                stroke-linejoin="round"
              )
              path(
                d="M34 36 L30 50 L14 46 L14 36 Z"
                :fill="`url(#ach-ribbon-${a.id})`"
                :stroke="isUnlocked(a.id) ? a.color.accent : '#111827'"
                stroke-width="1.5"
                stroke-linejoin="round"
              )
              rect(
                x="-18"
                y="34"
                width="36"
                height="14"
                rx="2"
                :fill="`url(#ach-ribbon-${a.id})`"
                :stroke="isUnlocked(a.id) ? a.color.accent : '#111827'"
                stroke-width="1.5"
              )
              //- Tiny star in the ribbon (unlocked only)
              g(v-if="isUnlocked(a.id)")
                circle(cx="0" cy="41" r="3" fill="#ffffff")

            //- Lock overlay
            g(v-if="!isUnlocked(a.id)")
              circle(cx="0" cy="0" r="14" fill="rgba(0,0,0,0.65)" stroke="#94a3b8" stroke-width="2")
              rect(x="-5" y="-3" width="10" height="9" rx="1.5" fill="#cbd5e1")
              path(d="M-3 -3 Q-3 -10 0 -10 Q3 -10 3 -3" fill="none" stroke="#cbd5e1" stroke-width="2")

        //- Title + description
        div.ach-title.game-text {{ achievementTitle(a.id) }}
        div.ach-desc.game-text {{ achievementDescription(a.id) }}
</template>

<style scoped lang="sass">
.ach-card
  display: flex
  flex-direction: column
  align-items: center
  gap: 0.35rem
  padding: 0.75rem 0.5rem 0.65rem
  border-radius: 0.75rem
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 100%)
  border: 2px solid #334155

  &--locked
    filter: saturate(0.25) brightness(0.75)

.ach-crest
  width: 5rem
  height: 5rem

  @media (min-width: 640px)
    width: 6rem
    height: 6rem

.ach-crest__svg
  width: 100%
  height: 100%
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.7))

.ach-title
  color: #fff
  font-weight: 900
  text-transform: uppercase
  text-align: center
  font-size: 0.75rem
  line-height: 1.1
  letter-spacing: 0.02em
  text-shadow: 1px 1px 0 #000

.ach-desc
  color: #cbd5e1
  text-align: center
  font-size: 0.65rem
  line-height: 1.2
  font-weight: 700
  text-shadow: 1px 1px 0 #000

.ach-card--locked
  .ach-title
    color: #94a3b8

  .ach-desc
    color: #64748b

// ─── Landscape phones — fit 5 crests per row, smaller cells ─────────────
//
// Default sm:grid-cols-3 / md:grid-cols-4 was tuned for portrait. In a 667 ×
// 375 phone landscape the modal's content area is ~600 × 250, so cards have
// to shrink to fit anything more than two rows. 5 columns + 3.5rem crests
// give the player a one-glance view of progress.
@media (orientation: landscape) and (max-height: 500px)
  .ach-grid
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important
    gap: 0.4rem !important
    // Use most of the viewport — modal chrome (header + footer + frame
    // padding) eats ~30 % vertically, so 70 vh is the practical ceiling
    // before content gets clipped by the modal's outer rounded frame.
    max-height: 70vh !important
    padding: 0.25rem !important
  .ach-card
    padding: 0.35rem 0.25rem 0.25rem !important
    gap: 0.15rem !important
  .ach-crest
    width: 3rem !important
    height: 3rem !important
  .ach-title
    font-size: 0.55rem !important
    line-height: 1 !important
  .ach-desc
    font-size: 0.5rem !important
    line-height: 1.05 !important
</style>
