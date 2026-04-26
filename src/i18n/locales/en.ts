// Global locale messages.
//
// Per-language chunks are loaded lazily by `setI18nLocale` (see
// `src/i18n/index.ts`) — each file under `./locales/*.ts` becomes its
// own Vite chunk via `import.meta.glob`. Only the locale the player is
// using ships in the boot bundle; switching languages fetches the next
// chunk on demand.
//
// Keep this file lean: only keys referenced by code reachable from the
// SolKeeperGame route belong here. Component-scoped strings live in
// each component's `<i18n>` SFC block (e.g. OptionsModal's settings
// labels) so they stay co-located with their UI.
export default {
  'gameName': 'Solariancer',
  'crazyGamesOnly': 'This game is only available on',
  // Universal UI primitives
  'cancel': 'Cancel',
  'stage': 'Stage',
  // Battle Pass — referenced from BattlePass.vue
  'battlePass': {
    'battlePass': 'Battle Pass',
    'complete': 'COMPLETE',
    'max': 'MAX',
    'battlePassComplete': 'Battle Pass complete — nice work!',
    'rewardsReady': 'You have {n} reward(s) ready to collect!',
    'xpHint': '+{stage} xp per stage advance · +{combo} xp per {threshold}+ body combo',
    'seasonReset': 'Season resets in {n} day(s) — collect your rewards!'
  }
}
