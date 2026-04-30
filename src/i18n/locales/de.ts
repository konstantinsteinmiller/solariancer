// Global locale messages — see ./en.ts for the canonical key list and
// the lazy-loading rationale.
export default {
  'gameName': 'Solariancer',
  'crazyGamesOnly': 'Dieses Spiel ist nur verfügbar auf',
  'cancel': 'Abbrechen',
  'stage': 'Etappe',
  'battlePass': {
    'battlePass': 'Battle Pass',
    'complete': 'ABGESCHLOSSEN',
    'max': 'MAX',
    'battlePassComplete': 'Battle Pass abgeschlossen — gut gemacht!',
    'rewardsReady': 'Du hast {n} Belohnung(en) zum Abholen!',
    'xpHint': '+{stage} xp pro Etappen-Aufstieg · +{combo} xp pro {threshold}+ Combo',
    'seasonReset': 'Saison endet in {n} Tag(en) — hol dir deine Belohnungen!'
  },
  'tutorial': {
    'intro': {
      'meet': {
        'title': 'DIE SONNE',
        'body': 'Im Spiel kochst du Weltraum-Brocken im orange leuchtenden Ring der Sonne. Schau zu!'
      },
      'falloff': {
        'title': 'DEIN FINGER = MAGNET',
        'body': 'Berühre den Bildschirm — ein leuchtender Punkt folgt deinem Finger und zieht Asteroiden an. Näher = stärker.'
      },
      'pullIn': {
        'title': 'ZIEH IHN REIN',
        'body': 'Halte beim Brocken, dann zieh ihn in den hellen Kochring um die Sonne. Nicht loslassen!'
      },
      'steer': {
        'title': 'IN BEWEGUNG HALTEN',
        'body': 'Im Ring? Bewege deinen Finger in KREISEN um den Brocken. Bleibst du stehen, frisst die Sonne ihn roh!'
      },
      'feed': {
        'title': 'WARTE AUF GOLD',
        'body': 'Kreise weiter, bis der Brocken GOLDEN LEUCHTET — er ist REIF. Dann ab in die Sonne für fette Punkte!'
      },
      'finale': {
        'title': 'DU BIST SONNEN-KOCH!',
        'body': '3+ Brocken gleichzeitig im Ring = ×3 Punkte. Jetzt koch den Kosmos!'
      }
    },
    'advanced': {
      'crowd': {
        'title': 'MENGE ×3',
        'body': 'Sind 3+ Brocken gleichzeitig im Kochring, wird jeder Hitze-Tick verdreifacht. Stapeln lohnt sich.'
      },
      'combo': {
        'title': 'KETTEN-COMBOS',
        'body': 'Füttere reife Brocken innerhalb von 5 s, um die COMBO-Anzeige aufzubauen — ×2, dann ×3.'
      },
      'hotEdge': {
        'title': 'HEISSE KANTE = TURBO-GAR',
        'body': 'Brocken direkt an der Sonne garen 30 % SCHNELLER — aber ein Patzer und sie fallen rein. Riskant und lohnend.'
      },
      'events': {
        'title': 'EVENTS = BELOHNUNGEN',
        'body': 'Fang Kometen, überstehe Schwarze Löcher, reite auf Flares. Jedes Event gibt Bonus-Hitze oder Sternenmaterie.'
      }
    },
    'canvas': {
      'sun': 'DIE SONNE',
      'cookRing': 'KOCHRING',
      'hotEdge': 'HEISSE KANTE',
      'pullClose': 'NAH = STARK',
      'pullFar': 'FERN = SCHWACH',
      'dragHere': 'IN DEN RING ZIEHEN',
      'circleIt': 'IM KREIS BEWEGEN',
      'feedSun': 'IN DIE SONNE!',
      'ripeNow': 'REIF!',
      'cookFast': 'SCHNELL GAR',
      'cookSlow': 'LANGSAM GAR',
      'tapToPlay': 'TIPPEN & ZIEHEN'
    },
    'tap': 'Tippen zum Fortfahren',
    'click': 'Klick zum Fortfahren',
    'tapStart': 'Tippen zum Starten',
    'clickStart': 'Klick zum Starten',
    'skip': 'ÜBERSPRINGEN'
  },
  'game': {
    'hud': {
      'stage': 'Etappe',
      'heat': 'Hitze',
      'starMatter': 'Sternenmaterie',
      'inZone': 'Im Ring',
      'session': 'Session',
      'streak': 'Serie',
      'ripe': 'Reif',
      'combo': 'Combo',
      'mission': 'Mission',
      'puzzle': 'Rätsel',
      'solarFlare': 'SONNEN-FLARE',
      'flareIncoming': 'FLARE NAHT',
      'chain': 'Kette',
      'rank': 'Rang',
      'sessionTip': 'Hitze in dieser Session (zurückgesetzt beim Reload)',
      'days': 'Tage'
    },
    'starter': {
      'title': 'Im Heat-Ring kochen',
      'body': 'Brocken in den leuchtenden Ring ziehen · Warten bis sie GOLDEN GLÜHEN · Reife Brocken in die Sonne werfen für viel Hitze'
    },
    'modal': {
      'missionComplete': 'Mission erfüllt',
      'chooseReward': 'Wähle deine Belohnung',
      'upgradesTitle': 'Upgrades',
      'replayTutorial': 'Tutorial wiederholen',
      'achievements': 'Erfolge',
      'close': 'Schließen',
      'cancel': 'Abbrechen',
      'confirm': 'Bestätigen',
      'max': 'MAX',
      'levelShort': 'St.'
    },
    'supernovaModal': {
      'newClass': '★ Solar-Klasse {n}',
      'reset': 'Hitze, Etappe und alle Upgrades zurücksetzen. Sternenmaterie, Serie und alle Freischaltungen bleiben.',
      'newBonusPrefix': 'Neuer permanenter Bonus:',
      'newBonusValue': '+{pct}% gesamte Hitze'
    },
    'mission': {
      'reward': {
        'heat': { 'title': '+1000 Hitze', 'description': 'Sofortige Hitze-Spritze.' },
        'matter': { 'title': '+5 ✦ Sternenmaterie', 'description': 'Vorrat für Cosmic Forge.' },
        'boost': { 'title': '×2 Hitze für 60s', 'description': 'Jede Auszahlung verdoppelt.' },
        'combo': { 'title': '×3 Combo für 30s', 'description': 'Kette überspringen — direkt auf ×3.' },
        'ripe': { 'title': 'Alles reifen', 'description': 'Jeder Brocken im Kochring sofort REIF.' }
      }
    },
    'puzzle': {
      'crowd': { 'title': 'Massen-Meister', 'description': '5s mit Crowd ×3 im Ring' },
      'comet': { 'title': 'Kometen-Jäger', 'description': '2 Kometen fangen' },
      'solo': { 'title': 'Solo-Überlebt', 'description': 'Schwarzes Loch überleben — kein Pull' },
      'flare': { 'title': 'Hitzewelle', 'description': '800 Hitze während eines Sonnen-Flares' },
      'chain': { 'title': 'Ketten-Meister', 'description': '×3 Combo erreichen (5 reife Würfe in Folge)' },
      'ripe3': { 'title': 'Triple-Star', 'description': '3 reife Brocken gleichzeitig' },
      'sprint': { 'title': 'Forge-Sprint', 'description': '1500 Hitze in diesem Fenster' },
      'pristine': { 'title': 'Makellos', 'description': 'Kein Pull für die ganzen 45s' },
      'progress': {
        'ripe': 'reif',
        'peak': 'Spitze',
        'survived': 'ÜBERLEBT — nicht berührt!',
        'survivedHit': 'überlebt (berührt)',
        'inEvent': 'im Event…',
        'awaitingBH': 'warte auf BL',
        'broken': 'verloren',
        'left': 'übrig',
        'flameOn': '🔥',
        'waiting': '(warten)'
      }
    },
    'upgrade': {
      'noLevels': 'Keine Stationen — kaufen zum Aktivieren',
      'singularityCore': { 'title': 'Singularitätskern', 'description': 'Verstärkt deine Touch-Schwerkraft.' },
      'fusionStabilizer': {
        'title': 'Fusions-Stabilisator',
        'description': 'Hitze-Tick im Ring + Sonnen-Bonus. ∞ Stufen — verlangsamt sich alle 15 (1× → ¼× → ⅛×).'
      },
      'attractionRadius': { 'title': 'Resonanz-Feld', 'description': 'Größere Reichweite deiner Singularität.' },
      'automationProbe': {
        'title': 'Tether-Station',
        'description': 'Langsame Bahnstation — fängt Asteroiden ein, lässt sie reifen, schießt sie in die Sonne (Combo-Ketten).'
      },
      'heatShield': {
        'title': 'Ring-Erweiterung',
        'description': 'Verbreitert den Heat-Ring um die Sonne — mehr Platz zum Lenken.'
      },
      'orbitalCapacity': {
        'title': 'Massen-Magnet',
        'description': 'Asteroiden schnappen in den nächsten Planeten und vergrößern ihn statt zu kollidieren.'
      },
      'surfaceTension': {
        'title': 'Oberflächenspannung',
        'description': 'Brocken prallen von der Sonne ab, bevor sie verbrannt werden — rettet gekochte Planeten.'
      },
      'cosmicForge': {
        'title': 'Kosmische Schmiede ✦',
        'description': 'Kosmisches Tier. Mit Sternenmaterie bezahlt. Multipliziert ALLE Hitze-Erträge — stapelt mit Fusion.'
      },
      'bigProbeStation': {
        'title': 'Große Sondenstation ✦',
        'description': 'High-Tier-Tether-Drohne. Fängt Asteroiden UND mittelgroße Planeten (felsig / Eis / Juwel) und schießt sie reif. Max 2.'
      }
    },
    'solar': {
      'class': 'Solar-Klasse',
      'rankReady': 'Bereit für Supernova — Prestige setzt deinen Lauf für einen permanenten Multiplikator zurück.',
      'rankNotReady': 'Erreiche {n} Lebenszeit-Hitze, um zu prestigen.',
      'allHeatBonus': '+{pct}% gesamte Hitze',
      'supernova': 'Supernova',
      'supernovaConfirm': 'Supernova auslösen?',
      'supernovaYes': 'Ja, prestigen',
      'supernovaNo': 'Abbrechen',
      'locked': 'GESPERRT'
    },
    'stageType': {
      'gType': 'G-Typ',
      'kType': 'K-Typ',
      'mType': 'M-Typ',
      'redGiant': 'Roter Riese',
      'blueDwarf': 'Blauer Zwerg',
      'whiteDwarf': 'Weißer Zwerg',
      'brownDwarf': 'Brauner Zwerg',
      'neutron': 'Neutronenstern'
    },
    'popup': {
      'wasted': 'VERSCHWENDET',
      'bounce': 'ABPRALL',
      'launched': 'ABGESCHOSSEN!',
      'comet': 'KOMET!',
      'cometCaught': 'KOMET! +{n}',
      'shatter': 'ZERSPLITTERT!',
      'stage': 'ETAPPE {n}!',
      'matterGain': '+✦ Materie',
      'bpXp': '+{n} BP XP',
      'comboMult': 'COMBO ×{n}!',
      'blackHole': 'SCHWARZES LOCH!',
      'survived': 'ÜBERLEBT! +{n}',
      'collapsed': 'KOLLABIERT',
      'solarFlare': 'SONNEN-FLARE!',
      'flareIncoming': 'FLARE NAHT…',
      'puzzleSolved': 'RÄTSEL: {title}!'
    },
    'achievement': {
      'unlockedCount': '{n} / {total} freigeschaltet',
      'tutorial_graduate': { 'title': 'Heller Anfang', 'description': 'Schließe das Intro-Tutorial ab.' },
      'first_light': { 'title': 'Erstes Licht', 'description': 'Füttere deinen ersten reifen Brocken an die Sonne.' },
      'stage_5': { 'title': 'Sternenerprobt', 'description': 'Erreiche Etappe 5.' },
      'stage_10': { 'title': 'Stellarer Veteran', 'description': 'Erreiche Etappe 10.' },
      'stage_25': { 'title': 'Galaktischer Eroberer', 'description': 'Erreiche Etappe 25.' },
      'heat_1m': { 'title': 'Stellarer Tycoon', 'description': 'Verdiene 1.000.000 Lebenszeit-Hitze.' },
      'heat_100m': { 'title': 'Kosmischer Magnat', 'description': 'Verdiene 100.000.000 Lebenszeit-Hitze.' },
      'comet_first': { 'title': 'Kometen-Jäger', 'description': 'Fange deinen ersten Kometen.' },
      'comet_25': { 'title': 'Kometen-Veteran', 'description': 'Fange 25 Kometen.' },
      'comet_100': { 'title': 'Kometen-Meister', 'description': 'Fange 100 Kometen.' },
      'bh_first': { 'title': 'Schwarzlochüberlebender', 'description': 'Überlebe dein erstes Schwarzes-Loch-Event.' },
      'bh_25': { 'title': 'Ereignishorizont-Meister', 'description': 'Überlebe 25 Schwarzes-Loch-Events.' },
      'combo_5': { 'title': 'In Flammen', 'description': 'Erreiche eine Combo-Kette von 5.' },
      'combo_10': { 'title': 'Inferno', 'description': 'Erreiche eine Combo-Kette von 10.' },
      'ripe_100': { 'title': 'Sonnenflüsterer', 'description': 'Füttere 100 reife Brocken an die Sonne.' },
      'streak_3': { 'title': 'Tägliche Routine', 'description': 'Erreiche eine 3-Tage-Serie.' },
      'streak_30': { 'title': 'Konstellations-Anhänger', 'description': 'Erreiche eine 30-Tage-Serie.' },
      'first_supernova': { 'title': 'Supernova', 'description': 'Prestige einmal — erreiche Solar-Klasse 1.' },
      'solar_class_5': { 'title': 'Pulsar-Geist', 'description': 'Erreiche Solar-Klasse 5.' },
      'cosmic_forge_max': { 'title': 'Schmiede-Meister', 'description': 'Maxe die Kosmische Schmiede aus.' },
      'big_probe': { 'title': 'Big Iron', 'description': 'Kaufe eine Große Sondenstation.' },
      'all_skins': { 'title': 'Galerie der Sterne', 'description': 'Schalte alle 8 Sonnen-Skins frei.' },
      'mission_first': { 'title': 'Mission erfüllt', 'description': 'Schließe deine erste 3-Minuten-Mission ab.' }
    }
  }
}
