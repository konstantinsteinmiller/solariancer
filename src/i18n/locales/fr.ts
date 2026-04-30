// Global locale messages — see ./en.ts for the canonical key list and
// the lazy-loading rationale.
export default {
  'gameName': 'Solariancer',
  'crazyGamesOnly': 'Ce jeu n\'est disponible que sur',
  'cancel': 'Annuler',
  'stage': 'Étape',
  'battlePass': {
    'battlePass': 'Battle Pass',
    'complete': 'TERMINÉ',
    'max': 'MAX',
    'battlePassComplete': 'Battle Pass terminé — bien joué !',
    'rewardsReady': 'Tu as {n} récompense(s) à récupérer !',
    'xpHint': '+{stage} xp par palier · +{combo} xp par combo de {threshold}+',
    'seasonReset': 'La saison se réinitialise dans {n} jour(s) — récupère tes récompenses !'
  },
  'tutorial': {
    'intro': {
      'meet': {
        'title': 'LE SOLEIL',
        'body': 'Le but : faire cuire des cailloux dans l\'anneau orange du Soleil. Regarde la démo !'
      },
      'falloff': {
        'title': 'TON DOIGT = AIMANT',
        'body': 'Touche l\'écran — un point lumineux suit ton doigt et attire les astéroïdes. Plus près = plus fort.'
      },
      'pullIn': {
        'title': 'TIRE-LE DEDANS',
        'body': 'Appuie près d\'un caillou et glisse-le dans l\'anneau orange autour du Soleil. Ne lâche pas !'
      },
      'steer': {
        'title': 'GARDE-LE EN ORBITE',
        'body': 'Une fois dans l\'anneau, bouge ton doigt en CERCLES autour du caillou. S\'il s\'arrête, le Soleil le mange cru !'
      },
      'feed': {
        'title': 'ATTENDS L\'OR',
        'body': 'Continue jusqu\'à ce que le caillou DEVIENNE DORÉ — il est MÛR. Glisse-le dans le Soleil pour gros points !'
      },
      'finale': { 'title': 'TU ES SUN-CHEF !', 'body': '3+ cailloux en orbite = ×3 points. Va cuire tout le cosmos !' }
    },
    'advanced': {
      'crowd': {
        'title': 'FOULE ×3',
        'body': 'Quand 3+ cailloux orbitent dans l\'Anneau, chaque tick de chaleur est triplé. Empiler paie.'
      },
      'combo': {
        'title': 'COMBOS EN CHAÎNE',
        'body': 'Nourris des cailloux mûrs en moins de 5 s pour monter le COMBO — ×2, puis ×3.'
      },
      'hotEdge': {
        'title': 'BORD CHAUD = CUISSON RAPIDE',
        'body': 'Les cailloux juste contre le Soleil cuisent 30 % PLUS VITE — mais un faux pas et ils tombent. Risqué, payant.'
      },
      'events': {
        'title': 'ÉVÉNEMENTS = RÉCOMPENSES',
        'body': 'Attrape des comètes, survis aux trous noirs, glisse sur les éruptions. Chaque événement = Chaleur ou Matière Stellaire.'
      }
    },
    'canvas': {
      'sun': 'LE SOLEIL',
      'cookRing': 'ANNEAU',
      'hotEdge': 'BORD CHAUD',
      'pullClose': 'PRÈS = FORT',
      'pullFar': 'LOIN = FAIBLE',
      'dragHere': 'TIRER DANS L\'ANNEAU',
      'circleIt': 'TOURNE AUTOUR',
      'feedSun': 'DANS LE SOLEIL !',
      'ripeNow': 'MÛR !',
      'cookFast': 'CUISSON RAPIDE',
      'cookSlow': 'CUISSON LENTE',
      'tapToPlay': 'TOUCHE & TIRE'
    },
    'tap': 'Touche pour continuer',
    'click': 'Clique pour continuer',
    'tapStart': 'Touche pour commencer',
    'clickStart': 'Clique pour commencer',
    'skip': 'PASSER'
  },
  'game': {
    'hud': {
      'stage': 'Étape',
      'heat': 'Chaleur',
      'starMatter': 'Matière Stellaire',
      'inZone': 'Dans l\'anneau',
      'session': 'Session',
      'streak': 'Série',
      'ripe': 'Mûr',
      'combo': 'Combo',
      'mission': 'Mission',
      'puzzle': 'Énigme',
      'solarFlare': 'ÉRUPTION SOLAIRE',
      'flareIncoming': 'ÉRUPTION IMMINENTE',
      'chain': 'chaîne',
      'rank': 'rang',
      'sessionTip': 'Chaleur gagnée cette session (réinitialisée au rechargement)',
      'days': 'jours'
    },
    'starter': {
      'title': 'Cuis dans l\'Anneau',
      'body': 'Glisse les corps dans l\'anneau brillant · Attends qu\'ils DEVIENNENT DORÉS · Lance les mûrs dans le Soleil pour beaucoup de chaleur'
    },
    'modal': {
      'missionComplete': 'Mission Réussie',
      'chooseReward': 'Choisis ta récompense',
      'upgradesTitle': 'Améliorations',
      'replayTutorial': 'Rejouer le tutoriel',
      'achievements': 'Succès',
      'close': 'Fermer',
      'cancel': 'Annuler',
      'confirm': 'Confirmer',
      'max': 'MAX',
      'levelShort': 'niv.'
    },
    'supernovaModal': {
      'newClass': '★ Classe Solaire {n}',
      'reset': 'Réinitialise Chaleur, Étape et toutes Améliorations. Garde Matière Stellaire, Série et déblocages.',
      'newBonusPrefix': 'Nouveau bonus permanent :',
      'newBonusValue': '+{pct}% chaleur totale'
    },
    'mission': {
      'reward': {
        'heat': { 'title': '+1000 Chaleur', 'description': 'Injection de chaleur instantanée.' },
        'matter': { 'title': '+5 ✦ Matière Stellaire', 'description': 'À empiler vers la Forge Cosmique.' },
        'boost': { 'title': '×2 Chaleur 60s', 'description': 'Chaque gain doublé.' },
        'combo': { 'title': '×3 Combo 30s', 'description': 'Saute la chaîne — directement à ×3.' },
        'ripe': { 'title': 'Tout mûrir', 'description': 'Tous les corps dans l\'Anneau sont MÛRS instantanément.' }
      }
    },
    'puzzle': {
      'crowd': { 'title': 'Maître de la Foule', 'description': '5s de Foule ×3 dans l\'anneau' },
      'comet': { 'title': 'Chasseur de Comètes', 'description': 'Attrape 2 comètes' },
      'solo': { 'title': 'Survivant Solo', 'description': 'Survis à un Trou Noir — sans Pull' },
      'flare': { 'title': 'Vague de Chaleur', 'description': 'Gagne 800 chaleur pendant une Éruption Solaire' },
      'chain': { 'title': 'Maître des Chaînes', 'description': 'Atteins ×3 Combo (chaîne 5 mûrs)' },
      'ripe3': { 'title': 'Triple Étoile', 'description': '3 corps mûrs simultanés' },
      'sprint': { 'title': 'Sprint de la Forge', 'description': 'Gagne 1500 chaleur dans la fenêtre' },
      'pristine': { 'title': 'Immaculé', 'description': 'Pas de Pull pendant les 45s entières' },
      'progress': {
        'ripe': 'mûrs',
        'peak': 'pic',
        'survived': 'SURVÉCU — sans toucher !',
        'survivedHit': 'survécu (touché)',
        'inEvent': 'dans l\'événement…',
        'awaitingBH': 'attente TN',
        'broken': 'raté',
        'left': 'restant',
        'flameOn': '🔥',
        'waiting': '(en attente)'
      }
    },
    'upgrade': {
      'noLevels': 'Pas de stations — achète pour activer',
      'singularityCore': { 'title': 'Noyau de Singularité', 'description': 'Augmente la force de ta gravité tactile.' },
      'fusionStabilizer': {
        'title': 'Stabilisateur de Fusion',
        'description': 'Tick de l\'Anneau + bonus de Soleil. ∞ niveaux — ralentit tous les 15 (1× → ¼× → ⅛×).'
      },
      'attractionRadius': { 'title': 'Champ de Résonance', 'description': 'Portée gravitationnelle plus large.' },
      'automationProbe': {
        'title': 'Station-Câble',
        'description': 'Station orbitale lente — capture un astéroïde, le fait orbiter jusqu\'à maturité, puis le lance dans le Soleil.'
      },
      'heatShield': {
        'title': 'Expansion de l\'Anneau',
        'description': 'Élargit l\'anneau autour du Soleil — plus de place pour gérer.'
      },
      'orbitalCapacity': {
        'title': 'Aimant de Masse',
        'description': 'Les astéroïdes se collent à la planète la plus proche au lieu de l\'encombrer.'
      },
      'surfaceTension': {
        'title': 'Tension de Surface',
        'description': 'Les corps rebondissent sur le Soleil avant d\'être consommés — sauve les cuits.'
      },
      'cosmicForge': {
        'title': 'Forge Cosmique ✦',
        'description': 'Niveau cosmique. Payée en Matière Stellaire. Multiplie TOUS les gains de chaleur — empile avec Fusion.'
      },
      'bigProbeStation': {
        'title': 'Grande Station ✦',
        'description': 'Drone-câble haut de gamme. Capture astéroïdes ET planètes moyennes (rocheuse / glace / joyau) et les lance mûres. Max 2.'
      }
    },
    'solar': {
      'class': 'Classe Solaire',
      'rankReady': 'Prêt pour Supernova — le prestige réinitialise pour un multiplicateur permanent.',
      'rankNotReady': 'Atteins {n} de chaleur cumulée pour prestige.',
      'allHeatBonus': '+{pct}% chaleur totale',
      'supernova': 'Supernova',
      'supernovaConfirm': 'Déclencher Supernova ?',
      'supernovaYes': 'Oui, prestige',
      'supernovaNo': 'Annuler',
      'locked': 'VERROUILLÉ'
    },
    'stageType': {
      'gType': 'Type G',
      'kType': 'Type K',
      'mType': 'Type M',
      'redGiant': 'Géante Rouge',
      'blueDwarf': 'Naine Bleue',
      'whiteDwarf': 'Naine Blanche',
      'brownDwarf': 'Naine Brune',
      'neutron': 'Étoile à Neutrons'
    },
    'popup': {
      'wasted': 'GASPILLÉ',
      'bounce': 'REBOND',
      'launched': 'LANCÉ !',
      'comet': 'COMÈTE !',
      'cometCaught': 'COMÈTE ! +{n}',
      'shatter': 'BRISÉ !',
      'stage': 'ÉTAPE {n} !',
      'matterGain': '+✦ matière',
      'bpXp': '+{n} BP XP',
      'comboMult': 'COMBO ×{n} !',
      'blackHole': 'TROU NOIR !',
      'survived': 'SURVÉCU ! +{n}',
      'collapsed': 'EFFONDRÉ',
      'solarFlare': 'ÉRUPTION !',
      'flareIncoming': 'ÉRUPTION IMMINENTE…',
      'puzzleSolved': 'ÉNIGME : {title} !'
    },
    'achievement': {
      'unlockedCount': '{n} / {total} débloqués',
      'tutorial_graduate': { 'title': 'Lumineux Débuts', 'description': 'Termine le tutoriel.' },
      'first_light': { 'title': 'Première Lumière', 'description': 'Nourris ton premier mûr au Soleil.' },
      'stage_5': { 'title': 'Étoilé', 'description': 'Atteins l\'Étape 5.' },
      'stage_10': { 'title': 'Vétéran Stellaire', 'description': 'Atteins l\'Étape 10.' },
      'stage_25': { 'title': 'Conquérant Galactique', 'description': 'Atteins l\'Étape 25.' },
      'heat_1m': { 'title': 'Magnat Stellaire', 'description': 'Gagne 1 000 000 de chaleur cumulée.' },
      'heat_100m': { 'title': 'Magnat Cosmique', 'description': 'Gagne 100 000 000 de chaleur cumulée.' },
      'comet_first': { 'title': 'Chasseur de Comètes', 'description': 'Attrape ta première comète.' },
      'comet_25': { 'title': 'Vétéran des Comètes', 'description': 'Attrape 25 comètes.' },
      'comet_100': { 'title': 'Maître des Comètes', 'description': 'Attrape 100 comètes.' },
      'bh_first': { 'title': 'Survivant du Trou Noir', 'description': 'Survis à ton premier trou noir.' },
      'bh_25': { 'title': 'Maître de l\'Horizon', 'description': 'Survis à 25 trous noirs.' },
      'combo_5': { 'title': 'En Feu', 'description': 'Atteins une chaîne combo de 5.' },
      'combo_10': { 'title': 'Inferno', 'description': 'Atteins une chaîne combo de 10.' },
      'ripe_100': { 'title': 'Murmure du Soleil', 'description': 'Nourris 100 mûrs au Soleil.' },
      'streak_3': { 'title': 'Quotidien', 'description': 'Atteins une série de 3 jours.' },
      'streak_30': { 'title': 'Dévot des Constellations', 'description': 'Atteins une série de 30 jours.' },
      'first_supernova': { 'title': 'Supernova', 'description': 'Prestige une fois — Classe Solaire 1.' },
      'solar_class_5': { 'title': 'Esprit Pulsar', 'description': 'Atteins la Classe Solaire 5.' },
      'cosmic_forge_max': { 'title': 'Maître Forgeron', 'description': 'Maxe la Forge Cosmique.' },
      'big_probe': { 'title': 'Gros Calibre', 'description': 'Achète une Grande Station.' },
      'all_skins': { 'title': 'Galerie des Étoiles', 'description': 'Débloque les 8 skins du Soleil.' },
      'mission_first': { 'title': 'Mission Réussie', 'description': 'Termine ta première Mission de 3 min.' }
    }
  }
}
