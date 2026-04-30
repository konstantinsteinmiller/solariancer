# Solariancer — Game Design

## 1. Concept

**Solariancer** is a one-touch arcade idle game about *herding* celestial bodies into the corona of a hungry Sun. The
Sun is both the player's primary engine of progress and their constant antagonist — it pulls everything in, but only *
*ripe** bodies that have soaked enough heat in orbit pay out when they hit the surface.

The fantasy is a one-finger god of gravity. You drop a singularity at any point on the screen; everything nearby curves
toward it. You use that to round off orbits, drag stragglers into the Heat Zone, and yank cooked planets out of danger
before the Sun consumes them prematurely.

## 2. Core mechanic

```
                 spawn ────► drift ────► HEAT ZONE ────► ripe ────► sun ────► HEAT
                                          │  ▲             │
                                          │  └────────────┘
                                          ▼  player keeps it parked
                                        too close
                                          │
                                          ▼
                                       sun consume (raw = WASTED)
```

The whole game is a **risk/reward loop around a single ring** drawn around the Sun. Bodies want to fall into the Sun (
gravity). The player wants them to **stay in the ring** long enough to ripen, then **drop them in only when ripe**. The
Singularity is the only tool for both jobs — pulling bodies *into* the ring AND yanking them *out* of the Sun's embrace
before they're ready.

### 2.1 The Heat Zone

Two concentric annuli around the Sun. Bodies inside either accumulate **cooked seconds**.

| Zone             | Inner edge          | Outer edge                      | Warm-up | Cook bonus |
|------------------|---------------------|---------------------------------|---------|------------|
| **Close-to-Sun** | `SUN_RADIUS + 4px`  | `SUN_RADIUS + 24px`             | **2s**  | **×1.3**   |
| **Heat Zone**    | `SUN_RADIUS + 24px` | inner + `90px × Zone Expansion` | 3s      | ×1.0       |

The Close-to-Sun band is narrow and high-stakes: orbital speeds there are huge (sun gravity is strong), bodies crash
easily, but the cooking factor is multiplied by 1.3 and earnings begin a full second earlier. A confident player
threading a fast flyby through the close band ripens a body in ~3 seconds; a slow body parked in the regular zone barely
cooks.

Bodies outside both zones shed cooked seconds at 1.5× decay — a stray slingshot quickly resets a body's progress.

### 2.2 The 3-second warm-up

> A planet or asteroid must stay in the Sun's orbit for **at least 3 seconds** before it generates any heat.

This eliminates "drive-by" looting. Pulling a body through the ring on the way to nowhere produces zero output. You have
to **commit** an orbit. After 3 cooked seconds, the body begins paying out heat ticks.

### 2.3 Cooking and ripeness — speed-weighted

Cooked seconds accumulate while in the zone, but **proportional to the body's speed**. The whole point of the game is
*orbiting*, not parking — so the rate is:

```
cookFactor = clamp(speed / RIPEN_REF_SPEED, 0.05, 2.5)        // RIPEN_REF_SPEED = 120 px/s
cookedSeconds += dt × cookFactor
```

A body **held still by the singularity** has speed ≈ 0 → factor 0.05 → essentially never ripens. A body **whipped into a
fast orbit** has speed ≥ 200 px/s → factor 1.6+ → ripens faster than wall-clock time. This kills the "park-and-wait"
exploit and rewards the player for the actual skill of the game: setting up smooth orbits.

Two ripeness thresholds matter:

| Cooked seconds | State          | Behavior                                                    |
|----------------|----------------|-------------------------------------------------------------|
| 0 – 3s         | **Warming up** | No heat earned yet. Body glows cool blue.                   |
| 3 – 10s        | **Cooking**    | Earns heat per second (see 2.4). Glow shifts blue → orange. |
| 10s+           | **Ripe** 🔥    | Pulses amber. Now eligible for the big sun-feed payoff.     |

A body that crosses the 10s threshold gets a **RIPE!** popup and an amber halo ring.

### 2.4 Heat ticks (zone earnings)

Every `0.5s`, every body that is inside the zone AND past warm-up earns:

```
heat = body.yieldRate × 6 × ZONE_TICK_SECONDS × fusionMultiplier × crowdMultiplier
```

The base scaling (×6) means a single rocky planet (`yieldRate = 1.6`) ticks roughly **4.8 heat/sec** at no upgrades.

### 2.5 The ×3 crowd multiplier

If **3 or more** non-grabbed bodies are simultaneously inside the ring, **all** zone heat ticks are tripled for that
frame. The ring visibly brightens and the HUD's `In Zone` badge flips to amber with a `×3` chip. This is the headline
scoring move — getting three rocky planets parked in the ring at the same time is a flow-state moment.

### 2.6 Sun ingestion

When a body's centre touches the Sun:

| Body state                 | Heat awarded                | Visual / popup                                                    |
|----------------------------|-----------------------------|-------------------------------------------------------------------|
| **Ripe** (cooked ≥ 10s)    | `sunFeedBonus × fusion × 8` | Big amber `+xxx` popup, full explosion, 30% chance of star matter |
| **Raw** (cooked < 10s)     | **0 heat**                  | Red `WASTED` popup, smaller explosion                             |
| **Surface Tension** active | (no consumption)            | Body bounces; blue shield flickers; `bouncesLeft -= 1`            |

Raw bodies hitting the Sun are pure loss — the Sun is the antagonist, not the goal. The intended optimal play is always:
cook → yank out before consume → cook → ripe → only *then* feed.

### 2.7 Singularity

A finger touch creates a singularity at the touched point with a 200 px base range (× Resonance Field bonus). It is *
*purely attractive** — a real point gravity well.

- **Pull formula:** `9000 × Singularity Core × (1 − distance/range)² / mass`. Quadratic falloff means
  distant-but-in-range bodies feel only a fraction of the pull; the player has to commit to a placement.
- **No tangential boost.** Pure radial attraction. Place the singularity ahead of a body's motion to accelerate it,
  behind to decelerate it, perpendicular to curve it. Real gravity, predictable feel — no hidden energy injection.
- **No-go safe-zone (creation only):** the singularity can't be **created** or **dragged** within `body.radius × 2.5` of
  any non-comet body. Each Singularity Core level tightens the multiplier (min 1.3) so endgame players get fine control
  over big planets.
- **Force taper inside the safe-zone:** a body that drifts INTO an active singularity (because it has momentum) is NOT
  destroyed and the singularity is NOT collapsed. Instead, the attractive force ramps linearly to zero as `distance → 0`
  inside the body's no-go radius. Result: bodies coast through the singularity and curve away — they can't amass at the
  centre, and the singularity isn't a fragile bauble.
- **Comets are exempt** from the safe-zone — placing the singularity directly on a comet catches it.

## 3. Bodies

Mass is the difficulty knob. The early game is balanced around small bodies (asteroid, rocky); big planets (gas, ice,
jewel) are *visually* tantalizing but functionally locked behind **Singularity Core** levels — without the upgraded pull
they barely respond to a finger drag.

| Kind     | Mass | Radius | yieldRate | sunFeedBonus | Notes                                                                                            |
|----------|------|--------|-----------|--------------|--------------------------------------------------------------------------------------------------|
| Asteroid | 6    | 4–9    | 0.8       | 4            | Beginner fuel. Fast, light, easy to whip. With Mass Magnet they auto-merge into planets.         |
| Rocky    | 36   | 12–18  | 1.6       | 14           | Beginner's "pet planet". Heavy enough to feel meaningful; ripe rocky = first big payout.         |
| Ice      | 48   | 14–22  | 2.4       | 22           | Mid-game. Decent value, requires Singularity Core 2+ for confident handling.                     |
| Gas      | 110  | 22–32  | 4.8       | 50           | End-game. Almost immovable at base singularity strength — a gas giant in stable orbit is a flex. |
| Jewel    | 26   | 10–14  | 6.0       | 80           | Rare, dense, very rewarding. Hard to grab, easy to lose.                                         |

Spawn rate is constant (`SPAWN_INTERVAL = 1.3s`). The kind weighting is asteroid-heavy unless **Mass Magnet** is
purchased (which tilts the distribution further toward asteroids since they're cheap fodder for the magnet).

Body-body collisions are deliberately biased toward "big body wins" — a small body can never destroy a much larger one,
only ricochet off it.

| Mass ratio (large/small)                                            | Closing speed  | Outcome                                                                                                                                 |
|---------------------------------------------------------------------|----------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| **≥ 2.5** (asteroid into anything bigger, gas giant vs jewel, etc.) | any            | **Elastic bounce.** Small body kicked away, large body barely moves (mass-weighted position correction). No destruction on either side. |
| **< 2.5** (similar masses)                                          | **≥ 320 px/s** | Both shatter — `SHATTER!` popup, magnitude-1.7 explosion. Real ram-job only.                                                            |
| **< 2.5**                                                           | moderate       | Smaller body breaks, larger absorbs a fraction of mass + momentum.                                                                      |

Special cases:

- **Asteroid + asteroid:** elastic bounce (restitution 0.7) regardless of speed.
- **Asteroid + planet with Mass Magnet:** silent merge — host gains mass and a slim radius bump.

## 4. Upgrades

Six purchasable upgrades, all bought with heat. Costs grow geometrically.

| Upgrade               | Effect                                                                                                             | Visual                                    |
|-----------------------|--------------------------------------------------------------------------------------------------------------------|-------------------------------------------|
| **Singularity Core**  | +20% pull strength per level (max 12)                                                                              | (none — felt in pull)                     |
| **Fusion Stabilizer** | +10% Heat per level on every tick and feed (max 15)                                                                | More heat from same play                  |
| **Resonance Field**   | +18% singularity radius per level (max 10)                                                                         | Larger pull aura                          |
| **Zone Expansion**    | +20% Heat Zone width per level (max 10)                                                                            | Glowing ring around Sun physically widens |
| **Mass Magnet**       | +25px range, +1× pull/level (max 6)                                                                                | Asteroids snap-merge into nearest planet  |
| **Surface Tension**   | +1 bounce/level on Sun contact (max 4)                                                                             | Blue shield flickers when a body bounces  |
| **Cosmic Forge ✦**    | Cosmic tier (paid in Star Matter). +25% global heat earnings per level (max 5). Multiplies INTO Fusion Stabilizer. | Violet rhombus icon on the buy button     |

## 5. Resources

- **Heat** — primary currency. Earned from zone ticks (capped at 1/body/tick) and ripe sun-feeds (the real reward).
  Spent on the standard tier of upgrades.
- **Star Matter ✦** — meta currency. Earned by:
    - Ripe sun-feed (30% chance per consume)
    - Comet catch (1)
    - Surviving a Black Hole event (2)
    - **Feeding bodies to the Black Hole's event horizon** (1 per body — sacrifice mechanic for getting rid of nuisance
      unripe bodies)
      Spent on the **Cosmic** upgrade tier. Currently powers Cosmic Forge; future Cosmic-tier upgrades and Supernova
      prestige will share this currency.

## 6. Tutorial (10 seconds, scripted)

First-time players see a 10-second auto-demonstration on first session. State persists in `tutorialSeen` (localStorage).
A **Replay Tutorial** `?` button (next to Settings) re-runs it on demand. A SKIP button is always available during play.

The demo uses a **small asteroid** — the simplest body, exactly what new players should master first.

| Time       | Stage | Card                                      | Demo action                                                    |
|------------|-------|-------------------------------------------|----------------------------------------------------------------|
| 0.0 – 2.0s | 0     | "PULL INTO THE RING"                      | Singularity drags the spawned asteroid from edge into the ring |
| 2.0 – 6.0s | 1     | "COOK IN ORBIT — 3s warm-up · 10s = RIPE" | Body held in ring; cooked seconds fast-forwarded to ~10s       |
| 6.0 – 8.0s | 2     | "FEED RIPE TO THE SUN!"                   | Singularity drags ripe body into the Sun                       |
| 8.0 –10.0s | 3     | "YOU GOT THIS! Stack 3+ for ×3"           | Explosion + finale card                                        |

While the tutorial is active:

- Player pointer input is gated.
- Spawning is suspended (`tutorialMode = true`).
- The tutorial body's `cookedSeconds` is mutated directly to compress 10s of cooking into 4s.
- Existing world is cleared at start; normal play is reseeded after the tutorial ends.

## 7. HUD

- **Top left:** Heat (with splash gainer animation), Star Matter (only if > 0).
- **Top right:** `In Zone` count (turns amber with `×3` chip during crowd bonus), `Ripe` count (only when > 0),
  `Session` total.
- **Bottom right:** Settings, Upgrades buttons (Upgrades bounces when affordable upgrades exist).
- **Bottom left:** Mute button.

## 8. Visual feedback rules

Every gameplay event has a visual:

- **Singularity range:** dashed violet ring around the touch point shows the upgraded reach of Resonance Field. The ring
  grows visibly as the upgrade is bought.
- **Singularity tethers:** *every* body inside the singularity range gets a tether — the closer the body, the brighter
  and crackliest the line. Player can immediately see what they're affecting.
- **Body in zone, warming up:** cool-blue glow ramping with `cookedSeconds`.
- **Body cooking:** glow hue shifts blue → orange between 3s and 10s.
- **Body ripe:** pulsing amber halo ring.
- **Crowd bonus active:** Heat Zone ring brightens, dashes spin faster, HUD chip flips to amber `×3`.
- **Surface Tension bounce:** blue shield ring flicker on the Sun, `BOUNCE` popup on body.
- **Mass Magnet pull:** body fxFlash glow as it accelerates toward host.
- **Magnet merge:** silent absorb, `+merge` popup, host slightly larger.
- **Ripe consume:** large amber `+xxx` popup, magnitude-1.4 explosion, screen flash.
- **Raw consume:** red `WASTED` popup, magnitude-0.6 explosion.

## 9. Files map

| Concern                                            | File                                              |
|----------------------------------------------------|---------------------------------------------------|
| Physics, heat zone, cooking, sun feed, mass magnet | `src/use/useGravityPhysics.ts`                    |
| Player state, upgrades, persistence                | `src/use/useSolariancer.ts`                       |
| Renderer (canvas 2D)                               | `src/use/useSolariancerRenderer.ts`               |
| Tutorial driver                                    | `src/use/useSolTutorial.ts`                       |
| Game view + input                                  | `src/views/SolariancerGame.vue`                   |
| HUD                                                | `src/components/organisms/SolHud.vue`             |
| Upgrade modal                                      | `src/components/organisms/SolUpgradeModal.vue`    |
| Tutorial overlay                                   | `src/components/organisms/SolTutorialOverlay.vue` |
| Types                                              | `src/types/Solariancer.ts`                        |

## 10. Tunable constants

All tuning lives at the top of `src/use/useGravityPhysics.ts`:

```ts
G = 1700                      // gravitational constant
SUN_BASE_RADIUS = 64
SUN_MASS = 5000
HEAT_ZONE_INNER_GAP = 24
HEAT_ZONE_BASE_WIDTH = 90
COOK_TIME = 10                // ripeness threshold (cooked seconds)
ZONE_WARMUP = 3               // no heat before this many cooked seconds
ZONE_BASE_HEAT_PER_SEC = 6
RIPE_FEED_MULT = 8
RAW_FEED_MULT = 0             // raw bodies hitting the sun = WASTED
CROWD_BONUS_THRESHOLD = 3
CROWD_MULT = 3
RIPEN_REF_SPEED = 120         // px/s — speed at which ripening rate = 1.0
RIPEN_MIN_FACTOR = 0.05       // floor ripening rate (held-still bodies)
RIPEN_MAX_FACTOR = 2.5        // cap ripening rate (whip orbits)
SINGULARITY_RANGE = 200       // base range; multiplied by Resonance Field (max ~600 at lvl 10)
SINGULARITY_BASE_FORCE = 9000 // base force; multiplied by Singularity Core
SINGULARITY_FALLOFF_EXPONENT = 2  // quadratic falloff — far-in-range bodies feel a fraction of the close pull
BOUNCE_RESTITUTION = 0.65
PROBE_RANGE = 200             // probe lock-on range
PROBE_K_RADIAL = 1.6          // 1/s — radial damping rate
PROBE_K_TANGENT = 0.9         // 1/s — tangent-speed correction rate
MAGNET_BASE_RANGE = 60
MAGNET_PER_LEVEL_RANGE = 25
MAGNET_PULL_PER_LEVEL = 1800
SPAWN_INTERVAL = 1.3
MAX_BODIES = 24
```
