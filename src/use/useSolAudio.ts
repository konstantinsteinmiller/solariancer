import { ref } from 'vue'
import { getAudioContext } from '@/use/useAssets'
import useSolKeeper from '@/use/useSolKeeper'
import useSolEvents from '@/use/useSolEvents'
import useSolTutorial from '@/use/useSolTutorial'
import useUser from '@/use/useUser'

// ─── Synthesised dynamic layers ─────────────────────────────────────────────
//
// We avoid shipping new audio files by synthesising the heat-hum and
// black-hole rumble with Web Audio oscillators. Both stay alive for the life
// of the page once started; gain envelopes scrub them silent when inactive,
// and the tick() function nudges their parameters from game state every
// frame.
//
// Design notes:
//   - Heat hum: triangle wave around A2 (110 Hz). Gain and pitch ride
//     `comboMultiplier × flareMultiplier`. Silent at 1.0×, ~1 octave up at
//     12× (the practical max stack: combo ×3 + flare ×4 = 12).
//   - Black-hole rumble: sawtooth at 36 Hz with a slow LFO. Faded in over
//     0.4s on event start, faded out over 0.6s on end.
//   - Tutorial click: a one-shot 1800Hz sine ping with a fast attack +
//     exponential decay envelope. Fired on each stage transition.

const TUTORIAL_TICK_HZ = 1800
const TUTORIAL_TICK_DURATION = 0.13

const HUM_BASE_FREQ = 110         // Hz, A2
const HUM_MAX_FREQ_MULT = 2.0     // 1 octave up at the cap stack
const HUM_MAX_GAIN = 0.045        // raw gain at cap stack, before user volume
const HUM_TIME_CONST = 0.18       // s, smoothing for setTargetAtTime

const RUMBLE_FREQ = 36
const RUMBLE_LFO_FREQ = 0.7       // slow wobble
const RUMBLE_LFO_DEPTH = 8        // ± Hz around base
const RUMBLE_GAIN = 0.06
const RUMBLE_FADE_IN = 0.4
const RUMBLE_FADE_OUT = 0.7

interface AudioState {
  ctx: AudioContext
  humOsc: OscillatorNode
  humGain: GainNode
  rumbleOsc: OscillatorNode
  rumbleLfo: OscillatorNode
  rumbleLfoGain: GainNode
  rumbleGain: GainNode
}

let state: AudioState | null = null
const started = ref(false)
let lastTutorialStage = -1
let tutorialWasActive = false
let lastBlackHoleActive = false

const ensureStarted = (): boolean => {
  if (state) return true
  const ctx = getAudioContext()
  if (!ctx) return false

  // Heat hum chain
  const humOsc = ctx.createOscillator()
  humOsc.type = 'triangle'
  humOsc.frequency.value = HUM_BASE_FREQ
  const humGain = ctx.createGain()
  humGain.gain.value = 0
  humOsc.connect(humGain).connect(ctx.destination)
  humOsc.start()

  // Black-hole rumble chain — base oscillator + LFO modulating its frequency
  const rumbleOsc = ctx.createOscillator()
  rumbleOsc.type = 'sawtooth'
  rumbleOsc.frequency.value = RUMBLE_FREQ
  const rumbleLfo = ctx.createOscillator()
  rumbleLfo.type = 'sine'
  rumbleLfo.frequency.value = RUMBLE_LFO_FREQ
  const rumbleLfoGain = ctx.createGain()
  rumbleLfoGain.gain.value = RUMBLE_LFO_DEPTH
  rumbleLfo.connect(rumbleLfoGain).connect(rumbleOsc.frequency)
  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0
  rumbleOsc.connect(rumbleGain).connect(ctx.destination)
  rumbleOsc.start()
  rumbleLfo.start()

  state = { ctx, humOsc, humGain, rumbleOsc, rumbleLfo, rumbleLfoGain, rumbleGain }
  started.value = true
  return true
}

const playTutorialTick = () => {
  if (!ensureStarted() || !state) return
  const { ctx } = state
  const { userSoundVolume } = useUser()
  const userVol = userSoundVolume.value ?? 0.7
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = TUTORIAL_TICK_HZ
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.06 * userVol, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + TUTORIAL_TICK_DURATION)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + TUTORIAL_TICK_DURATION + 0.02)
}

const tick = (_dt: number) => {
  if (!ensureStarted() || !state) return
  const { ctx, humGain, humOsc, rumbleGain } = state

  const sk = useSolKeeper()
  const events = useSolEvents()
  const tutorial = useSolTutorial()
  const { userSoundVolume } = useUser()
  const userVol = Math.max(0, Math.min(1, userSoundVolume.value ?? 0.7))

  // ── Heat hum ─────────────────────────────────────────────────────────────
  // Stack: 1.0 = base (silent), up to ~12× at full combo×flare.
  const stack = sk.comboMultiplier.value * events.flareMultiplier.value
  const stackAbove1 = Math.max(0, stack - 1)
  // Logarithmic ramp so each multiplier-step feels equally meaningful
  const norm = Math.min(1, Math.log2(Math.max(1, stack)) / Math.log2(12))
  const targetGain = HUM_MAX_GAIN * Math.min(1, stackAbove1 * 0.18) * userVol
  const targetFreq = HUM_BASE_FREQ * (1 + (HUM_MAX_FREQ_MULT - 1) * norm)
  const now = ctx.currentTime
  humGain.gain.setTargetAtTime(targetGain, now, HUM_TIME_CONST)
  humOsc.frequency.setTargetAtTime(targetFreq, now, HUM_TIME_CONST)

  // ── Black-hole rumble ────────────────────────────────────────────────────
  const bhActive = events.blackHoleActive.value
  if (bhActive !== lastBlackHoleActive) {
    if (bhActive) {
      // Cancel any in-flight fade and ramp up.
      rumbleGain.gain.cancelScheduledValues(now)
      rumbleGain.gain.setValueAtTime(rumbleGain.gain.value, now)
      rumbleGain.gain.linearRampToValueAtTime(RUMBLE_GAIN * userVol, now + RUMBLE_FADE_IN)
    } else {
      rumbleGain.gain.cancelScheduledValues(now)
      rumbleGain.gain.setValueAtTime(rumbleGain.gain.value, now)
      rumbleGain.gain.linearRampToValueAtTime(0, now + RUMBLE_FADE_OUT)
    }
    lastBlackHoleActive = bhActive
  }

  // ── Tutorial click track ─────────────────────────────────────────────────
  if (tutorial.active.value) {
    if (!tutorialWasActive || tutorial.stage.value !== lastTutorialStage) {
      // Fire on entry and on each stage flip
      lastTutorialStage = tutorial.stage.value
      tutorialWasActive = true
      playTutorialTick()
    }
  } else if (tutorialWasActive) {
    tutorialWasActive = false
    lastTutorialStage = -1
  }
}

const stop = () => {
  if (!state) return
  const { ctx, humOsc, humGain, rumbleOsc, rumbleLfo, rumbleLfoGain, rumbleGain } = state
  // Hard-zero both gains immediately — important for the black-hole rumble:
  // a slow fade-out is fine during play, but on unmount we want silence NOW.
  try {
    const t = ctx.currentTime
    humGain.gain.cancelScheduledValues(t)
    humGain.gain.setValueAtTime(0, t)
    rumbleGain.gain.cancelScheduledValues(t)
    rumbleGain.gain.setValueAtTime(0, t)
  } catch { /* context may already be closed */
  }
  // Stop all source oscillators
  try {
    humOsc.stop()
  } catch { /* already stopped */
  }
  try {
    rumbleOsc.stop()
  } catch { /* already stopped */
  }
  try {
    rumbleLfo.stop()
  } catch { /* already stopped */
  }
  // Disconnect everything from the graph so HMR / unmount can't leave dangling
  // nodes feeding the destination on the shared AudioContext.
  try {
    humOsc.disconnect()
    humGain.disconnect()
    rumbleOsc.disconnect()
    rumbleLfo.disconnect()
    rumbleLfoGain.disconnect()
    rumbleGain.disconnect()
  } catch { /* already disconnected */
  }
  state = null
  started.value = false
  lastTutorialStage = -1
  tutorialWasActive = false
  lastBlackHoleActive = false
}

// HMR safety net — when this module is hot-replaced during dev, tear down
// the audio nodes the OLD module created. Without this, every save would
// stack a fresh black-hole rumble on top of the previous one.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stop()
  })
}

export default function useSolAudio() {
  return { tick, stop, started }
}
