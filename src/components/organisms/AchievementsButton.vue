<script setup lang="ts">
import { ref } from 'vue'
import useAchievements from '@/use/useAchievements'
import AchievementsModal from '@/components/organisms/AchievementsModal.vue'

const { unseenCount, markAllSeen } = useAchievements()

const showModal = ref(false)

function open() {
  showModal.value = true
  markAllSeen()
}
</script>

<template lang="pug">
  div.ach-btn-wrap
    div.relative.inline-block
      button.ach-btn(
        @click="open"
        aria-label="Achievements"
      )
        span.ach-btn__shadow
        span.ach-btn__body
          svg(viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round")
            path(d="M12 2 L18 5 V11 Q18 16 12 21 Q6 16 6 11 V5 Z")
            polyline(points="9 11 11 13 15 9")
      span.ach-btn__badge(v-if="unseenCount > 0") {{ unseenCount }}

  AchievementsModal(
    :is-open="showModal"
    @close="showModal = false"
  )
</template>

<style scoped lang="sass">
.ach-btn-wrap
  display: inline-block
  transform: scale(0.8)
  transform-origin: center
  line-height: 0

  @media (min-width: 640px)
    transform: scale(1)

.ach-btn
  position: relative
  display: inline-block
  padding: 0
  background: transparent
  border: 0
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  transition: filter 0.08s ease

  &:hover
    filter: brightness(1.08)

  &:active .ach-btn__body
    transform: translateY(2px)

.ach-btn__shadow
  position: absolute
  inset: 0
  transform: translateY(4px)
  border-radius: 0.5rem
  background: #0e5a52
  z-index: 0

.ach-btn__body
  position: relative
  display: inline-flex
  align-items: center
  justify-content: center
  padding: 0.5rem
  border-radius: 0.5rem
  border: 2px solid #083344
  background: linear-gradient(180deg, #7dffe1 0%, #22d3ee 45%, #0891b2 100%)
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.55), inset 0 -3px 0 rgba(0, 0, 0, 0.22), 0 0 10px rgba(45, 212, 191, 0.35)
  z-index: 1

  svg
    display: block
    width: 1.75rem
    height: 1.75rem
    object-fit: contain
    filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.5))

.ach-btn__badge
  position: absolute
  top: -0.3rem
  right: -0.35rem
  min-width: 1.1rem
  height: 1.1rem
  padding: 0 0.25rem
  border-radius: 9999px
  background: linear-gradient(180deg, #fb7185 0%, #dc2626 100%)
  color: #fff
  font-family: inherit
  font-weight: 900
  font-size: 0.68rem
  line-height: 1.1rem
  text-align: center
  border: 2px solid #3b0000
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 8px rgba(252, 165, 165, 0.6)
  text-shadow: 1px 1px 0 #000
  z-index: 2
  animation: ach-badge-pulse 1.1s ease-in-out infinite alternate

@keyframes ach-badge-pulse
  from
    transform: scale(1)
  to
    transform: scale(1.12)
</style>
