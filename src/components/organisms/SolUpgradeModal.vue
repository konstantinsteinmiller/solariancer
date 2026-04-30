<script setup lang="ts">

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FModal from '@/components/molecules/FModal.vue'
import FButton from '@/components/atoms/FButton.vue'
import useSolariancer, { fusionCumulativeBonus, fusionEffectAtLevel } from '@/use/useSolariancer'
import type { UpgradeId } from '@/types/Solariancer'

const { t } = useI18n()

interface Props {
  modelValue: boolean
}

defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const sk = useSolariancer()
const { state, UPGRADES, upgradeCost, isUpgradeMaxed, canAffordUpgrade, buyUpgrade, upgradeCurrency } = sk
const supernovaConfirmOpen = ref(false)
const formatHeat = (n: number): string => {
  if (n < 1000) return Math.floor(n).toString()
  if (n < 1e6) return (n / 1000).toFixed(1) + 'K'
  if (n < 1e9) return (n / 1e6).toFixed(2) + 'M'
  return (n / 1e9).toFixed(2) + 'B'
}
const supernovaProgress = computed(() => {
  const t = sk.supernovaThreshold.value
  if (t <= 0) return 1
  return Math.min(1, state.value.totalHeatEarned / t)
})
const onSupernovaConfirm = () => {
  if (sk.supernova()) {
    supernovaConfirmOpen.value = false
  }
}

interface UpgradeView {
  id: UpgradeId
  title: string
  description: string
  effect: string
  iconColors: [string, string]
  maxLevel: number
  maxLabel: string
  level: number
  currency: 'heat' | 'starMatter'
}

// Upgrade titles + descriptions are pulled from i18n by id. The numeric
// effect strings (`+20% pull / lvl`) stay generated here because they
// embed live multiplier values — translating templated numbers each tick
// is more friction than benefit; the surrounding labels carry the locale.
const view = computed<UpgradeView[]>(() => UPGRADES.map(u => {
  const lvl = state.value.upgrades[u.id]
  const base = {
    id: u.id,
    level: lvl,
    maxLevel: u.maxLevel,
    maxLabel: isFinite(u.maxLevel) ? String(u.maxLevel) : '∞',
    currency: upgradeCurrency(u.id),
    title: t(`game.upgrade.${u.id}.title`),
    description: t(`game.upgrade.${u.id}.description`)
  }
  switch (u.id) {
    case 'singularityCore':
      return {
        ...base,
        effect: `+${(u.effectPerLevel * 100) | 0}% pull / lvl  ·  current ×${(1 + lvl * u.effectPerLevel).toFixed(2)}`,
        iconColors: ['#a070ff', '#3a1a7a']
      }
    case 'fusionStabilizer': {
      const current = 1 + fusionCumulativeBonus(lvl)
      const nextDelta = fusionEffectAtLevel(lvl) * 100
      return {
        ...base,
        effect: `+${nextDelta.toFixed(2)}% next  ·  current ×${current.toFixed(2)}`,
        iconColors: ['#ff9444', '#7a1f0c']
      }
    }
    case 'attractionRadius':
      return {
        ...base,
        effect: `+${(u.effectPerLevel * 100) | 0}% range / lvl`,
        iconColors: ['#5fd2ff', '#0f3e6c']
      }
    case 'automationProbe':
      return {
        ...base,
        effect: lvl > 0
          ? `${lvl} active station${lvl > 1 ? 's' : ''}`
          : t('game.upgrade.noLevels'),
        iconColors: ['#dffafd', '#2b6fa3']
      }
    case 'heatShield':
      return {
        ...base,
        effect: `+${(u.effectPerLevel * 100) | 0}% zone width / lvl  ·  current ×${(1 + lvl * u.effectPerLevel).toFixed(2)}`,
        iconColors: ['#ffd14a', '#7a3a0e']
      }
    case 'orbitalCapacity':
      return {
        ...base,
        effect: lvl > 0 ? `Range +${lvl * 25}px  ·  pull ×${lvl}` : t('game.upgrade.noLevels'),
        iconColors: ['#9eddff', '#1a3470']
      }
    case 'surfaceTension':
      return {
        ...base,
        effect: lvl > 0 ? `${lvl} bounce${lvl > 1 ? 'es' : ''} per body` : t('game.upgrade.noLevels'),
        iconColors: ['#9ee6ff', '#1d4f78']
      }
    case 'cosmicForge':
      return {
        ...base,
        effect: `+${(u.effectPerLevel * 100) | 0}% Heat / lvl  ·  current ×${(1 + lvl * u.effectPerLevel).toFixed(2)}`,
        iconColors: ['#c8a8ff', '#3a1a7a']
      }
    case 'bigProbeStation':
      return {
        ...base,
        effect: lvl > 0
          ? `${lvl} active big station${lvl > 1 ? 's' : ''}`
          : t('game.upgrade.noLevels'),
        iconColors: ['#ffd14a', '#7a3a0e']
      }
  }
}))

const close = () => emit('update:modelValue', false)
</script>

<template lang="pug">
  FModal(
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="t('game.modal.upgradesTitle')"
  )
    div.text-left.overflow-y-auto.pr-1.upgrade-scroll(class="max-h-[60vh]")

      //- ─── Solar Class / Supernova prestige ─────────────────────────────
      //- Spans full width above the upgrade grid.
      div.relative.flex.items-center.gap-3.rounded-xl.border-2.p-2.mb-2(
        class="bg-gradient-to-b from-[#3b1850] to-[#150518] border-fuchsia-400/60"
      )
        //- Star icon — bigger when ranked
        div.relative.h-12.w-12.flex.shrink-0.items-center.justify-center
          div.absolute.inset-0.rounded-full(
            class="bg-gradient-to-br from-[#ff7ae0] via-[#a070ff] to-[#3a1a7a]"
            style="box-shadow: 0 0 18px rgba(220,140,255,0.65), inset 2px 2px 5px rgba(255,255,255,0.5)"
          )
          span.relative.text-lg.font-black.text-white(class="game-text") ★{{ state.solarClass }}
        div.flex-1.text-left.text-white(class="leading-tight")
          div.flex.items-baseline.gap-2.flex-wrap
            span.font-black.uppercase.tracking-wide(class="game-text text-sm sm:text-base") {{ t('game.solar.class') }}
            span.text-fuchsia-200(class="text-[10px] sm:text-xs") {{ t('game.hud.rank') }} {{ state.solarClass }}  ·  {{ t('game.solar.allHeatBonus', { pct: state.solarClass * 5 }) }}
          div.text-slate-300(class="leading-snug text-[11px] sm:text-xs")
            template(v-if="sk.canSupernova.value") {{ t('game.solar.rankReady') }}
            template(v-else) {{ t('game.solar.rankNotReady', { n: formatHeat(sk.supernovaThreshold.value) }) }}
          //- Threshold progress bar
          div.relative.rounded-full.overflow-hidden(
            v-if="!sk.canSupernova.value"
            class="h-1.5 bg-black/50 mt-1"
          )
            div.absolute.inset-y-0.left-0.bg-gradient-to-r.from-fuchsia-400.to-violet-500(
              :style="{ width: `${supernovaProgress * 100}%` }"
            )
          div.text-fuchsia-300.font-bold.tabular-nums(class="text-[11px] sm:text-xs mt-0.5")
            | {{ formatHeat(state.totalHeatEarned) }} / {{ formatHeat(sk.supernovaThreshold.value) }}
        //- Supernova button (eligible) or locked
        div.shrink-0
          template(v-if="sk.canSupernova.value")
            FButton(size="sm" type="primary" @click="supernovaConfirmOpen = true")
              span(class="uppercase font-black tracking-wider text-xs") {{ t('game.solar.supernova') }}
          template(v-else)
            div.rounded-lg.border.border-slate-700.bg-slate-900.px-3.py-2.text-slate-400.text-xs.font-black.uppercase
              | {{ t('game.solar.locked') }}

      //- Upgrade items — 2-col grid on sm+ (and on landscape phones, since
      //- they're sm: by width too). Rows stay full-width on portrait phones.
      div.grid.gap-2(class="grid-cols-1 sm:grid-cols-2")
        div.relative.flex.items-center.gap-2.rounded-xl.border-2.p-2(
          v-for="u in view"
          :key="u.id"
          class="bg-gradient-to-b from-[#172238] to-[#0c1424] border-[#0f1a30]"
        )
          //- Icon — h-10 (was h-12) so the description has more room in the
          //- 2-col grid layout. Big Probe Station's long description used to
          //- wrap to 10+ lines at the old size.
          div.relative.h-10.w-10.flex.shrink-0.items-center.justify-center
            div.absolute.inset-0.rounded-full(
              :style="{ background: `radial-gradient(circle at 30% 30%, ${u.iconColors[0]}, ${u.iconColors[1]})` }"
              style="box-shadow: 0 0 14px rgba(120,140,255,0.45), inset 2px 2px 5px rgba(255,255,255,0.5)"
            )
            span.relative.font-black.text-white(class="game-text text-base") {{ state.upgrades[u.id] }}
          //- Body
          div.flex-1.text-left.text-white(class="leading-tight min-w-0")
            div.flex.items-baseline.gap-2.flex-wrap
              span.font-black.uppercase.tracking-wide(class="game-text text-xs sm:text-sm") {{ u.title }}
              span.text-slate-300(class="text-[10px]") {{ t('game.modal.levelShort') }} {{ u.level }}/{{ u.maxLabel }}
            div.text-slate-300(class="leading-snug text-[10px] sm:text-[11px]") {{ u.description }}
            div.font-bold.text-amber-300(class="text-[10px] sm:text-[11px] mt-0.5") {{ u.effect }}
          //- Buy / Maxed
          div.shrink-0
            template(v-if="isUpgradeMaxed(u.id)")
              div.rounded-lg.border.border-emerald-700.bg-emerald-900.px-3.py-2.text-emerald-200.text-xs.font-black.uppercase {{ t('game.modal.max') }}
            template(v-else)
              FButton(
                :is-disabled="!canAffordUpgrade(u.id)"
                size="sm"
                @click="buyUpgrade(u.id)"
              )
                //- Hybrid cost (Big Probe Station): stack the two currencies
                //- vertically so the button stays narrow. Single-currency
                //- upgrades keep the inline single-row layout.
                div.flex.flex-col.items-center.leading-tight(
                  v-if="sk.upgradeSecondaryHeat(u.id) > 0"
                  class="gap-0.5"
                )
                  div.flex.items-center.gap-1
                    div.h-3.w-3(
                      class="rotate-45 bg-gradient-to-br from-[#c8a8ff] to-[#5d3aa8]"
                      style="box-shadow: 0 0 6px rgba(170,110,255,0.8)"
                    )
                    span.tabular-nums.text-xs {{ upgradeCost(u.id) }}
                  div.flex.items-center.gap-1
                    div.h-3.w-3.rounded-full(
                      class="bg-gradient-to-br from-[#ffe79e] via-[#ff8c2a] to-[#c5320e]"
                    )
                    span.tabular-nums.text-xs {{ formatHeat(sk.upgradeSecondaryHeat(u.id)) }}
                div.flex.items-center.gap-1(v-else)
                  div.h-3.w-3.rounded-full(
                    v-if="u.currency === 'heat'"
                    class="bg-gradient-to-br from-[#ffe79e] via-[#ff8c2a] to-[#c5320e]"
                  )
                  div.h-3.w-3(
                    v-else
                    class="rotate-45 bg-gradient-to-br from-[#c8a8ff] to-[#5d3aa8]"
                    style="box-shadow: 0 0 6px rgba(170,110,255,0.8)"
                  )
                  span.tabular-nums {{ upgradeCost(u.id) }}

    template(#footer)
      FButton(size="md" @click="close") {{ t('game.modal.close') }}

  //- Supernova confirmation modal
  FModal(
    v-model:model-value="supernovaConfirmOpen"
    :is-closable="true"
    :title="t('game.solar.supernovaConfirm')"
    @update:model-value="supernovaConfirmOpen = $event"
  )
    div.flex.flex-col.gap-2.p-2.text-white
      div.text-center.font-black.uppercase.tracking-wider.text-fuchsia-200(class="game-text text-base")
        | {{ t('game.supernovaModal.newClass', { n: state.solarClass + 1 }) }}
      div.text-slate-200(class="leading-snug text-sm text-center")
        | {{ t('game.supernovaModal.reset') }}
      div.text-slate-200(class="leading-snug text-sm text-center mt-1")
        | {{ t('game.supernovaModal.newBonusPrefix') }}
        span.font-black.text-fuchsia-300  {{ ' ' + t('game.supernovaModal.newBonusValue', { pct: (state.solarClass + 1) * 5 }) }}
    template(#footer)
      FButton(type="secondary" @click="supernovaConfirmOpen = false") {{ t('game.modal.cancel') }}
      FButton(type="primary" @click="onSupernovaConfirm") {{ t('game.modal.confirm') }}


</template>

<style scoped lang="sass">
.tabular-nums
  font-variant-numeric: tabular-nums
</style>
