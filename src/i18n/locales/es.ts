// Global locale messages — see ./en.ts for the canonical key list and
// the lazy-loading rationale.
export default {
  'gameName': 'Solariancer',
  'crazyGamesOnly': 'Este juego solo está disponible en',
  'cancel': 'Cancelar',
  'stage': 'Etapa',
  'battlePass': {
    'battlePass': 'Pase de Batalla',
    'complete': 'COMPLETO',
    'max': 'MÁX',
    'battlePassComplete': '¡Pase de Batalla completado — buen trabajo!',
    'rewardsReady': '¡Tienes {n} recompensa(s) para reclamar!',
    'xpHint': '+{stage} xp por etapa · +{combo} xp por combo de {threshold}+',
    'seasonReset': '¡La temporada se reinicia en {n} día(s) — reclama tus recompensas!'
  },
  'tutorial': {
    'intro': {
      'meet': {
        'title': 'EL SOL',
        'body': 'En el juego cocinas rocas espaciales en el anillo naranja del Sol. ¡Mira la demo!'
      },
      'falloff': {
        'title': 'TU DEDO = IMÁN',
        'body': 'Toca la pantalla — un punto brillante sigue tu dedo y atrae asteroides. Más cerca = más fuerte.'
      },
      'pullIn': {
        'title': 'TÍRALO ADENTRO',
        'body': 'Mantén pulsado cerca de una roca y arrástrala al anillo naranja del Sol. ¡No sueltes!'
      },
      'steer': {
        'title': 'MANTENLO EN ÓRBITA',
        'body': 'Dentro del anillo, mueve el dedo en CÍRCULOS alrededor de la roca. Si se para, ¡el Sol se la traga!'
      },
      'feed': {
        'title': 'ESPERA EL DORADO',
        'body': 'Sigue girando hasta que la roca BRILLE DORADA — está MADURA. ¡Suéltala en el Sol para muchos puntos!'
      },
      'finale': { 'title': '¡ERES UN COCINERO SOLAR!', 'body': '3+ rocas orbitando = ×3 puntos. ¡A cocinar el cosmos!' }
    },
    'advanced': {
      'crowd': {
        'title': 'MULTITUD ×3',
        'body': 'Cuando 3+ rocas orbitan el Anillo a la vez, cada tick de calor se triplica. Apilar paga.'
      },
      'combo': {
        'title': 'COMBOS EN CADENA',
        'body': 'Alimenta rocas maduras en menos de 5 s para subir el medidor COMBO — ×2, luego ×3.'
      },
      'hotEdge': {
        'title': 'BORDE CALIENTE = COCCIÓN RÁPIDA',
        'body': 'Las rocas pegadas al Sol cocinan 30 % MÁS RÁPIDO — pero un descuido y caen dentro. Arriesgado, jugoso.'
      },
      'events': {
        'title': 'EVENTOS = RECOMPENSAS',
        'body': 'Atrapa cometas, sobrevive agujeros negros, surfea fulguraciones. Cada evento da Calor o Materia Estelar extra.'
      }
    },
    'canvas': {
      'sun': 'EL SOL',
      'cookRing': 'ANILLO',
      'hotEdge': 'BORDE CALIENTE',
      'pullClose': 'CERCA = FUERTE',
      'pullFar': 'LEJOS = DÉBIL',
      'dragHere': 'TIRA AL ANILLO',
      'circleIt': 'GIRA ALREDEDOR',
      'feedSun': '¡AL SOL!',
      'ripeNow': '¡MADURA!',
      'cookFast': 'COCCIÓN RÁPIDA',
      'cookSlow': 'COCCIÓN LENTA',
      'tapToPlay': 'TOCA Y ARRASTRA'
    },
    'tap': 'Toca para continuar',
    'click': 'Clic para continuar',
    'tapStart': 'Toca para empezar',
    'clickStart': 'Clic para empezar',
    'skip': 'OMITIR'
  },
  'game': {
    'hud': {
      'stage': 'Etapa',
      'heat': 'Calor',
      'starMatter': 'Materia Estelar',
      'inZone': 'En el Anillo',
      'session': 'Sesión',
      'streak': 'Racha',
      'ripe': 'Maduro',
      'combo': 'Combo',
      'mission': 'Misión',
      'puzzle': 'Acertijo',
      'solarFlare': 'FULGURACIÓN SOLAR',
      'flareIncoming': 'FULGURACIÓN INMINENTE',
      'chain': 'cadena',
      'rank': 'rango',
      'sessionTip': 'Calor ganado esta sesión (se reinicia al recargar)',
      'days': 'días'
    },
    'starter': {
      'title': 'Cocina en el Anillo',
      'body': 'Arrastra cuerpos al anillo brillante · Espera que BRILLEN DORADOS · Suéltalos en el Sol para mucho Calor'
    },
    'modal': {
      'missionComplete': 'Misión Completa',
      'chooseReward': 'Elige tu recompensa',
      'upgradesTitle': 'Mejoras',
      'replayTutorial': 'Repetir tutorial',
      'achievements': 'Logros',
      'close': 'Cerrar',
      'cancel': 'Cancelar',
      'confirm': 'Confirmar',
      'max': 'MÁX',
      'levelShort': 'nv.'
    },
    'supernovaModal': {
      'newClass': '★ Clase Solar {n}',
      'reset': 'Reinicia Calor, Etapa y todas las Mejoras. Conserva Materia Estelar, Racha y desbloqueos.',
      'newBonusPrefix': 'Nuevo bono permanente:',
      'newBonusValue': '+{pct}% calor total'
    },
    'mission': {
      'reward': {
        'heat': { 'title': '+1000 Calor', 'description': 'Inyección de calor instantánea.' },
        'matter': { 'title': '+5 ✦ Materia Estelar', 'description': 'Acumula para Forja Cósmica.' },
        'boost': { 'title': '×2 Calor 60s', 'description': 'Cada pago duplicado.' },
        'combo': { 'title': '×3 Combo 30s', 'description': 'Salta la cadena — directo a ×3.' },
        'ripe': { 'title': 'Madurar Todo', 'description': 'Todo cuerpo en el Anillo es MADURO al instante.' }
      }
    },
    'puzzle': {
      'crowd': { 'title': 'Maestro de Multitud', 'description': '5s de Multitud ×3 en el anillo' },
      'comet': { 'title': 'Cazador de Cometas', 'description': 'Atrapa 2 cometas' },
      'solo': { 'title': 'Sobreviviente Solo', 'description': 'Sobrevive un Agujero Negro — sin Tirón' },
      'flare': { 'title': 'Ola de Calor', 'description': 'Gana 800 calor durante una Fulguración' },
      'chain': { 'title': 'Maestro de Cadenas', 'description': 'Llega a ×3 Combo (5 maduros seguidos)' },
      'ripe3': { 'title': 'Triple Estrella', 'description': '3 maduros vivos a la vez' },
      'sprint': { 'title': 'Sprint de la Forja', 'description': 'Gana 1500 calor en la ventana' },
      'pristine': { 'title': 'Impecable', 'description': 'Sin Tirón durante los 45s completos' },
      'progress': {
        'ripe': 'maduros',
        'peak': 'pico',
        'survived': '¡SOBREVIVIÓ — sin tocar!',
        'survivedHit': 'sobrevivió (tocó)',
        'inEvent': 'en evento…',
        'awaitingBH': 'esperando AN',
        'broken': 'fallido',
        'left': 'restante',
        'flameOn': '🔥',
        'waiting': '(esperando)'
      }
    },
    'upgrade': {
      'noLevels': 'Sin estaciones — compra para activar',
      'singularityCore': {
        'title': 'Núcleo de Singularidad',
        'description': 'Aumenta la fuerza de tu gravedad táctil.'
      },
      'fusionStabilizer': {
        'title': 'Estabilizador de Fusión',
        'description': 'Tick del Anillo + bonus del Sol. ∞ niveles — se ralentiza cada 15 (1× → ¼× → ⅛×).'
      },
      'attractionRadius': { 'title': 'Campo de Resonancia', 'description': 'Mayor alcance gravitatorio.' },
      'automationProbe': {
        'title': 'Estación de Cable',
        'description': 'Estación lenta — atrapa un asteroide, lo orbita hasta madurar, lo lanza al Sol (encadena combos).'
      },
      'heatShield': {
        'title': 'Expansión del Anillo',
        'description': 'Ensancha el anillo alrededor del Sol — más sitio para guiar.'
      },
      'orbitalCapacity': {
        'title': 'Imán de Masa',
        'description': 'Los asteroides se pegan al planeta más cercano en vez de saturar.'
      },
      'surfaceTension': {
        'title': 'Tensión Superficial',
        'description': 'Los cuerpos rebotan en el Sol antes de consumirse — salva planetas cocidos.'
      },
      'cosmicForge': {
        'title': 'Forja Cósmica ✦',
        'description': 'Nivel cósmico. Pagada con Materia Estelar. Multiplica TODOS los ingresos de calor — apila con Fusión.'
      },
      'bigProbeStation': {
        'title': 'Gran Estación ✦',
        'description': 'Dron-cable de gama alta. Atrapa asteroides Y planetas medianos y los lanza maduros. Máx 2.'
      }
    },
    'solar': {
      'class': 'Clase Solar',
      'rankReady': 'Listo para Supernova — el prestigio reinicia tu partida para un multiplicador permanente.',
      'rankNotReady': 'Alcanza {n} de calor de por vida para prestigiar.',
      'allHeatBonus': '+{pct}% calor total',
      'supernova': 'Supernova',
      'supernovaConfirm': '¿Hacer Supernova?',
      'supernovaYes': 'Sí, prestigio',
      'supernovaNo': 'Cancelar',
      'locked': 'BLOQUEADO'
    },
    'stageType': {
      'gType': 'Tipo G',
      'kType': 'Tipo K',
      'mType': 'Tipo M',
      'redGiant': 'Gigante Roja',
      'blueDwarf': 'Enana Azul',
      'whiteDwarf': 'Enana Blanca',
      'brownDwarf': 'Enana Marrón',
      'neutron': 'Estrella de Neutrones'
    },
    'popup': {
      'wasted': 'DESPERDICIADO',
      'bounce': 'REBOTE',
      'launched': '¡LANZADO!',
      'comet': '¡COMETA!',
      'cometCaught': '¡COMETA! +{n}',
      'shatter': '¡ROTO!',
      'stage': '¡ETAPA {n}!',
      'matterGain': '+✦ materia',
      'bpXp': '+{n} BP XP',
      'comboMult': '¡COMBO ×{n}!',
      'blackHole': '¡AGUJERO NEGRO!',
      'survived': '¡SOBREVIVISTE! +{n}',
      'collapsed': 'COLAPSADO',
      'solarFlare': '¡FULGURACIÓN!',
      'flareIncoming': 'FULGURACIÓN INMINENTE…',
      'puzzleSolved': '¡ACERTIJO: {title}!'
    },
    'achievement': {
      'unlockedCount': '{n} / {total} desbloqueados',
      'tutorial_graduate': { 'title': 'Inicio Brillante', 'description': 'Completa el tutorial.' },
      'first_light': { 'title': 'Primera Luz', 'description': 'Alimenta al Sol con tu primer maduro.' },
      'stage_5': { 'title': 'Probado por Estrellas', 'description': 'Alcanza la Etapa 5.' },
      'stage_10': { 'title': 'Veterano Estelar', 'description': 'Alcanza la Etapa 10.' },
      'stage_25': { 'title': 'Conquistador Galáctico', 'description': 'Alcanza la Etapa 25.' },
      'heat_1m': { 'title': 'Magnate Estelar', 'description': 'Gana 1 000 000 de calor de por vida.' },
      'heat_100m': { 'title': 'Magnate Cósmico', 'description': 'Gana 100 000 000 de calor de por vida.' },
      'comet_first': { 'title': 'Cazador de Cometas', 'description': 'Atrapa tu primer cometa.' },
      'comet_25': { 'title': 'Veterano de Cometas', 'description': 'Atrapa 25 cometas.' },
      'comet_100': { 'title': 'Maestro de Cometas', 'description': 'Atrapa 100 cometas.' },
      'bh_first': { 'title': 'Sobreviviente del AN', 'description': 'Sobrevive tu primer agujero negro.' },
      'bh_25': { 'title': 'Maestro del Horizonte', 'description': 'Sobrevive 25 agujeros negros.' },
      'combo_5': { 'title': 'En Llamas', 'description': 'Alcanza una cadena combo de 5.' },
      'combo_10': { 'title': 'Infierno', 'description': 'Alcanza una cadena combo de 10.' },
      'ripe_100': { 'title': 'Susurro del Sol', 'description': 'Alimenta al Sol con 100 maduros.' },
      'streak_3': { 'title': 'Diariamente', 'description': 'Alcanza una racha de 3 días.' },
      'streak_30': { 'title': 'Devoto Constelar', 'description': 'Alcanza una racha de 30 días.' },
      'first_supernova': { 'title': 'Supernova', 'description': 'Prestigio una vez — Clase Solar 1.' },
      'solar_class_5': { 'title': 'Mente Púlsar', 'description': 'Alcanza la Clase Solar 5.' },
      'cosmic_forge_max': { 'title': 'Maestro de la Forja', 'description': 'Maximiza la Forja Cósmica.' },
      'big_probe': { 'title': 'Gran Calibre', 'description': 'Compra una Gran Estación.' },
      'all_skins': { 'title': 'Galería de Estrellas', 'description': 'Desbloquea los 8 skins del Sol.' },
      'mission_first': { 'title': 'Misión Lograda', 'description': 'Completa tu primera Misión de 3 min.' }
    }
  }
}
