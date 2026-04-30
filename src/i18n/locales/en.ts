// Global locale messages.
//
// Per-language chunks are loaded lazily by `setI18nLocale` (see
// `src/i18n/index.ts`) — each file under `./locales/*.ts` becomes its
// own Vite chunk via `import.meta.glob`. Only the locale the player is
// using ships in the boot bundle; switching languages fetches the next
// chunk on demand.
//
// Keep this file lean: only keys referenced by code reachable from the
// SolariancerGame route belong here. Component-scoped strings live in
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
  },
  // Tutorial — overlay cards (`intro` + `advanced`) and on-canvas labels.
  // Surfaced via window.__i18n.global.t in the renderer (canvas labels)
  // and via useI18n() in SolTutorialOverlay.vue (cards).
  'tutorial': {
    'intro': {
      'meet': {
        'title': 'MEET THE SUN',
        'body': 'This game is about cooking space rocks in the Sun\'s glowing orange ring. Watch the demo!'
      },
      'falloff': {
        'title': 'YOUR FINGER = MAGNET',
        'body': 'Touch and hold the screen — a glowing dot follows you and pulls asteroids in. Closer = stronger pull.'
      },
      'pullIn': {
        'title': 'DRAG IT IN',
        'body': 'Hold near a rock, then drag it into the bright orange ring around the Sun. Don\'t let go!'
      },
      'steer': {
        'title': 'KEEP IT SPINNING',
        'body': 'Once inside the ring, move your finger in CIRCLES around the rock. If it stops moving, the Sun grabs it raw!'
      },
      'feed': {
        'title': 'WAIT FOR GOLD',
        'body': 'Keep spinning until the rock GLOWS GOLD — that means RIPE. Then drop it INTO the Sun for huge points!'
      },
      'finale': {
        'title': 'YOU\'RE A SUN-COOK!',
        'body': '3+ rocks orbiting at once = ×3 points. Now go cook the cosmos!'
      }
    },
    'advanced': {
      'crowd': {
        'title': 'CROWD ×3',
        'body': 'When 3+ rocks orbit the Cook Ring at once, every heat tick is tripled. Stacking pays.'
      },
      'combo': {
        'title': 'CHAIN COMBOS',
        'body': 'Feed ripe rocks within 5s of each other to build the COMBO meter — ×2, then ×3.'
      },
      'hotEdge': {
        'title': 'HOT EDGE = FAST COOK',
        'body': 'Rocks orbiting right next to the Sun cook 30% FASTER — but one slip and they fall in. Risky, rewarding.'
      },
      'events': {
        'title': 'EVENTS = REWARDS',
        'body': 'Catch comets, survive black holes, ride flares. Every event is bonus Heat or Star Matter.'
      }
    },
    'canvas': {
      'sun': 'THE SUN',
      'cookRing': 'COOK RING',
      'hotEdge': 'HOT EDGE',
      'pullClose': 'CLOSE = STRONG',
      'pullFar': 'FAR = WEAK',
      'dragHere': 'DRAG INTO RING',
      'circleIt': 'CIRCLE THE ROCK',
      'feedSun': 'DROP IN SUN!',
      'ripeNow': 'RIPE!',
      'cookFast': 'FAST COOK',
      'cookSlow': 'SLOW COOK',
      'tapToPlay': 'TAP & DRAG'
    },
    'tap': 'Tap to continue',
    'click': 'Click to continue',
    'tapStart': 'Tap to start',
    'clickStart': 'Click to start',
    'skip': 'SKIP'
  },
  // Runtime gameplay strings — HUD, mission/puzzle definitions, modal
  // titles, upgrade copy. Component-scoped strings (settings labels,
  // dropdowns) still live in OptionsModal's local `<i18n>` block.
  'game': {
    'hud': {
      'stage': 'Stage',
      'heat': 'Heat',
      'starMatter': 'Star Matter',
      'inZone': 'In Zone',
      'session': 'Session',
      'streak': 'Streak',
      'ripe': 'Ripe',
      'combo': 'Combo',
      'mission': 'Mission',
      'puzzle': 'Puzzle',
      'solarFlare': 'SOLAR FLARE',
      'flareIncoming': 'FLARE INCOMING',
      'chain': 'chain',
      'rank': 'rank',
      'sessionTip': 'Heat earned this session (resets on reload)',
      'days': 'days'
    },
    'starter': {
      'title': 'Cook in the Heat Zone',
      'body': 'Drag bodies into the glowing ring · Wait until they GLOW GOLD · Drop ripe bodies into the Sun for big Heat'
    },
    'modal': {
      'missionComplete': 'Mission Complete',
      'chooseReward': 'Choose your reward',
      'upgradesTitle': 'Upgrades',
      'replayTutorial': 'Replay tutorial',
      'achievements': 'Achievements',
      'close': 'Close',
      'cancel': 'Cancel',
      'confirm': 'Confirm',
      'max': 'MAX',
      'levelShort': 'lvl'
    },
    'supernovaModal': {
      'newClass': '★ Solar Class {n}',
      'reset': 'Reset Heat, Stage and all Upgrades. Keep Star Matter, Streak and all unlocks.',
      'newBonusPrefix': 'New permanent bonus:',
      'newBonusValue': '+{pct}% all Heat'
    },
    'mission': {
      'reward': {
        'heat': { 'title': '+1000 Heat', 'description': 'Instant heat injection.' },
        'matter': { 'title': '+5 ✦ Star Matter', 'description': 'Stack toward Cosmic Forge.' },
        'boost': { 'title': '×2 Heat for 60s', 'description': 'Every payout doubled.' },
        'combo': { 'title': '×3 Combo for 30s', 'description': 'Skip the chain — straight to ×3.' },
        'ripe': { 'title': 'Ripen All', 'description': 'Every body in the Cook Ring is instantly RIPE.' }
      }
    },
    'puzzle': {
      'crowd': { 'title': 'Crowd Master', 'description': '5s of Crowd ×3 in the zone' },
      'comet': { 'title': 'Comet Hunter', 'description': 'Catch 2 comets' },
      'solo': { 'title': 'Solo Survivor', 'description': 'Survive a Black Hole — no Pull' },
      'flare': { 'title': 'Heat Wave', 'description': 'Earn 800 heat while a Solar Flare is up' },
      'chain': { 'title': 'Chain Master', 'description': 'Reach a ×3 Combo (chain 5 ripe feeds)' },
      'ripe3': { 'title': 'Triple Star', 'description': '3 ripe bodies alive at once' },
      'sprint': { 'title': 'Forge Sprint', 'description': 'Earn 1500 heat in this window' },
      'pristine': { 'title': 'Pristine', 'description': 'No Pull for the full 45s' },
      'progress': {
        'ripe': 'ripe',
        'peak': 'peak',
        'survived': 'SURVIVED — no touch!',
        'survivedHit': 'survived (touched)',
        'inEvent': 'in event…',
        'awaitingBH': 'awaiting BH',
        'broken': 'broken',
        'left': 'left',
        'flameOn': '🔥',
        'waiting': '(waiting)'
      }
    },
    'upgrade': {
      'noLevels': 'No stations — buy to enable',
      'singularityCore': { 'title': 'Singularity Core', 'description': 'Boost the strength of your touch gravity.' },
      'fusionStabilizer': {
        'title': 'Fusion Stabilizer',
        'description': 'Heat Zone tick + sun-feed yield. ∞ levels — but slows every 15 (1× → ¼× → ⅛×).'
      },
      'attractionRadius': {
        'title': 'Resonance Field',
        'description': 'Wider gravitational reach for your singularity.'
      },
      'automationProbe': {
        'title': 'Tether Station',
        'description': 'Slow orbiting station — ropes a passing asteroid, drags it through orbit until ripe, then launches it at the Sun (chains combos).'
      },
      'heatShield': {
        'title': 'Zone Expansion',
        'description': 'Widen the Heat Zone ring around the Sun — more room to herd.'
      },
      'orbitalCapacity': {
        'title': 'Mass Magnet',
        'description': 'Asteroids snap into the nearest planet, adding to its mass instead of cluttering.'
      },
      'surfaceTension': {
        'title': 'Surface Tension',
        'description': 'Bodies bounce off the Sun before being consumed — saves cooked planets from accidents.'
      },
      'cosmicForge': {
        'title': 'Cosmic Forge ✦',
        'description': 'Cosmic-tier. Paid in Star Matter. Multiplies ALL heat earnings — stacks with Fusion Stabilizer.'
      },
      'bigProbeStation': {
        'title': 'Big Probe Station ✦',
        'description': 'High-tier rope drone. Catches asteroids AND mid-size planets (rocky / ice / jewel) and launches them ripe. Max 2.'
      }
    },
    'solar': {
      'class': 'Solar Class',
      'rankReady': 'Ready to go Supernova — prestige resets your run for a permanent multiplier.',
      'rankNotReady': 'Reach {n} lifetime heat to prestige.',
      'allHeatBonus': '+{pct}% all heat',
      'supernova': 'Supernova',
      'supernovaConfirm': 'Go Supernova?',
      'supernovaYes': 'Yes, prestige',
      'supernovaNo': 'Cancel',
      'locked': 'LOCKED'
    },
    'stageType': {
      'gType': 'G-Type',
      'kType': 'K-Type',
      'mType': 'M-Type',
      'redGiant': 'Red Giant',
      'blueDwarf': 'Blue Dwarf',
      'whiteDwarf': 'White Dwarf',
      'brownDwarf': 'Brown Dwarf',
      'neutron': 'Neutron'
    },
    'popup': {
      'wasted': 'WASTED',
      'bounce': 'BOUNCE',
      'launched': 'LAUNCHED!',
      'comet': 'COMET!',
      'cometCaught': 'COMET! +{n}',
      'shatter': 'SHATTER!',
      'stage': 'STAGE {n}!',
      'matterGain': '+✦ matter',
      'bpXp': '+{n} BP XP',
      'comboMult': 'COMBO ×{n}!',
      'blackHole': 'BLACK HOLE!',
      'survived': 'SURVIVED! +{n}',
      'collapsed': 'COLLAPSED',
      'solarFlare': 'SOLAR FLARE!',
      'flareIncoming': 'FLARE INCOMING…',
      'puzzleSolved': 'PUZZLE: {title}!'
    },
    'achievement': {
      'unlockedCount': '{n} / {total} unlocked',
      'tutorial_graduate': { 'title': 'Bright Beginnings', 'description': 'Complete the intro tutorial.' },
      'first_light': { 'title': 'First Light', 'description': 'Feed your first ripe body to the Sun.' },
      'stage_5': { 'title': 'Star-Tested', 'description': 'Reach Stage 5.' },
      'stage_10': { 'title': 'Stellar Veteran', 'description': 'Reach Stage 10.' },
      'stage_25': { 'title': 'Galactic Conqueror', 'description': 'Reach Stage 25.' },
      'heat_1m': { 'title': 'Stellar Tycoon', 'description': 'Earn 1,000,000 lifetime heat.' },
      'heat_100m': { 'title': 'Cosmic Magnate', 'description': 'Earn 100,000,000 lifetime heat.' },
      'comet_first': { 'title': 'Comet Hunter', 'description': 'Catch your first comet.' },
      'comet_25': { 'title': 'Comet Veteran', 'description': 'Catch 25 comets.' },
      'comet_100': { 'title': 'Comet Master', 'description': 'Catch 100 comets.' },
      'bh_first': { 'title': 'Black-Hole Survivor', 'description': 'Survive your first black hole event.' },
      'bh_25': { 'title': 'Event-Horizon Master', 'description': 'Survive 25 black hole events.' },
      'combo_5': { 'title': 'On Fire', 'description': 'Reach a combo chain of 5.' },
      'combo_10': { 'title': 'Inferno', 'description': 'Reach a combo chain of 10.' },
      'ripe_100': { 'title': 'Sun Whisperer', 'description': 'Feed 100 ripe bodies to the Sun.' },
      'streak_3': { 'title': 'On The Daily', 'description': 'Reach a 3-day feed streak.' },
      'streak_30': { 'title': 'Constellation Devotee', 'description': 'Reach a 30-day feed streak.' },
      'first_supernova': { 'title': 'Supernova', 'description': 'Prestige once — reach Solar Class 1.' },
      'solar_class_5': { 'title': 'Pulsar Mind', 'description': 'Reach Solar Class 5.' },
      'cosmic_forge_max': { 'title': 'Forge Master', 'description': 'Max out the Cosmic Forge upgrade.' },
      'big_probe': { 'title': 'Big Iron', 'description': 'Buy a Big Probe Station.' },
      'all_skins': { 'title': 'Gallery of Stars', 'description': 'Unlock all 8 sun skins.' },
      'mission_first': { 'title': 'Mission Achieved', 'description': 'Complete your first 3-minute Mission.' }
    }
  }
}
