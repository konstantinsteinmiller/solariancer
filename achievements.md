# Achievements

A drop-in long-term retention system. Self-evaluating, persistent across sessions and prestige, with a crest-style modal
UI. The pieces here are explicitly written to be **portable** — copy two files into another project, wire up its
persistent state shape, and you're done.

---

## Files

| File                                             | Role                                                                                                                                                           |
|--------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `src/use/useAchievements.ts`                     | Composable: definitions, persistence, evaluation, public API. **Project-specific** — edit the achievement list and `buildState()` to fit your game.            |
| `src/components/organisms/AchievementsModal.vue` | The crest grid modal. **Mostly project-agnostic** — only the `FModal` shell + the achievement props are touched. Reuse as-is in any project that has `FModal`. |

That's it. No external libraries. No watcher boilerplate at the call sites — the composable wires its own
`watch(state, …, { deep: true, immediate: true })` lazily on first invocation.

---

## How the system works

### 1 · Definitions

Each achievement is a plain record:

```ts
interface AchievementDef {
  id: string                                   // stable identifier — used in localStorage
  title: string
  description: string
  glyph: string                                // ≤ 5-char label drawn inside the crest shield
  color: { from: string; to: string; accent: string }
  check: (s: SolAchievementState) => boolean   // pure predicate over a snapshot of game state
}
```

`check` predicates are **pure** and **cheap** — they only read fields off the snapshot built by `buildState()`. No
async, no side-effects.

### 2 · State snapshot

The composable owns one function:

```ts
const buildState = (): SolAchievementState => {
  const sk = useSolKeeper()
  const s = sk.state.value
  return { lifetimeHeat: …, totalRipeFeeds: …, /* etc */ }
}
```

This is the **only** project-specific part the achievements module needs. Map your project's persistent fields into a
flat object that all `check()` functions can read.

### 3 · Evaluation

On first `useAchievements()` call, a deep watch is wired:

```ts
watch(() => sk.state.value, () => evaluateAll(), { deep: true, immediate: true })
```

Every state mutation triggers `evaluateAll()`. For each unmet achievement, `check(buildState())` is run. Newly satisfied
unlocks are timestamped, persisted, and queued in the `unseen` list. The trophy button reads `unseenCount` to pulse
until the player opens the modal.

The deep watch is fine because:

- predicates are O(1)
- there are ~20 achievements
- saved-state mutations are infrequent (player actions, not every frame)

If your state shape is bigger than ~50 fields, narrow the watch to specific slices instead of `deep: true`.

### 4 · Persistence

Two `localStorage` blobs:

- `sol_achievements_unlocked_v1` — `{ [id]: timestamp }`
- `sol_achievements_unseen_v1` — `string[]`

The keys are versioned (`_v1`) so adding/renaming achievements in a breaking way can be coordinated with a new key.

Achievements **persist across prestige** — they're lifetime trophies, not run-scoped progress. This is intentional and a
key reason the system motivates retention: a long-term player keeps accumulating crests no matter how many times they
Supernova.

### 5 · Public API

```ts
const {
  achievements,    // AchievementDef[]
  unlocked,        // computed → { [id]: timestamp }
  isUnlocked,      // (id) => boolean
  unlockedCount,   // computed number
  unseenCount,     // computed number — drives trophy badge pulse
  totalCount,      // achievements.length
  markAllSeen,     // call when modal opens
  evaluate         // manual re-evaluation (rarely needed)
} = useAchievements()
```

### 6 · Trophy button + modal

The button lives in `SolKeeperGame.vue`:

```vue
<button @click="openAchievements"
  :class="{ 'attention-bounce': achievements.unseenCount.value > 0 }">
  …
</button>
```

Clicking opens `AchievementsModal`. The modal's `watch(() => isOpen, open => open && markAllSeen())` clears the `unseen`
queue the moment the player looks.

### 7 · The crest UI

Each card renders an SVG crest with:

- a laurel wreath of leaf ellipses on each side
- a shield body filled by a gradient linked to `color.from → color.to`
- a chevron decoration in `color.accent`
- a glyph (1–5 chars) in the centre
- a ribbon banner across the bottom
- a lock overlay when not yet unlocked

The crest doesn't import any external assets — it's pure SVG generated per achievement from the `color` palette. Locked
crests are CSS-desaturated to greyscale via `filter: saturate(0.25) brightness(0.75)` on the parent `.ach-card`.

---

## Implemented achievements (Solariancer)

| ID                  | Title                 | Glyph | Goal                        |
|---------------------|-----------------------|-------|-----------------------------|
| `tutorial_graduate` | Bright Beginnings     | ★1    | Complete the intro tutorial |
| `first_light`       | First Light           | I     | Feed your first ripe body   |
| `stage_5`           | Star-Tested           | V     | Reach Stage 5               |
| `stage_10`          | Stellar Veteran       | X     | Reach Stage 10              |
| `stage_25`          | Galactic Conqueror    | XXV   | Reach Stage 25              |
| `heat_1m`           | Stellar Tycoon        | 1M    | 1,000,000 lifetime heat     |
| `heat_100m`         | Cosmic Magnate        | 100M  | 100,000,000 lifetime heat   |
| `comet_first`       | Comet Hunter          | ☄     | Catch a comet               |
| `comet_25`          | Comet Veteran         | ☄25   | Catch 25 comets             |
| `comet_100`         | Comet Master          | ☄100  | Catch 100 comets            |
| `bh_first`          | Black-Hole Survivor   | BH    | Survive a black hole        |
| `bh_25`             | Event-Horizon Master  | BH25  | Survive 25 black holes      |
| `combo_5`           | On Fire               | C5    | Reach a combo chain of 5    |
| `combo_10`          | Inferno               | C10   | Reach a combo chain of 10   |
| `ripe_100`          | Sun Whisperer         | 100R  | Feed 100 ripe bodies        |
| `streak_3`          | On The Daily          | 3d    | 3-day feed streak           |
| `streak_30`         | Constellation Devotee | 30d   | 30-day feed streak          |
| `first_supernova`   | Supernova             | ★     | Solar Class ≥ 1             |
| `solar_class_5`     | Pulsar Mind           | ★5    | Solar Class ≥ 5             |
| `cosmic_forge_max`  | Forge Master          | CF5   | Max Cosmic Forge upgrade    |
| `big_probe`         | Big Iron              | BP    | Buy a Big Probe Station     |
| `all_skins`         | Gallery of Stars      | SKIN  | Unlock all 8 sun skins      |
| `mission_first`     | Mission Achieved      | M1    | Complete a 3-min Mission    |

23 in total — covers onboarding, mid-game progression, comet/event mastery, combo skill, lifetime heat, daily-streak
retention, prestige, and completionist cosmetic / upgrade goals.

---

## Required state fields in `useSolKeeper`

The achievements module reads these fields off the keeper state. If you copy the system to a project that doesn't have
them, add equivalents and update `buildState()`.

| Field                               | Source                                             | Why                              |
|-------------------------------------|----------------------------------------------------|----------------------------------|
| `state.totalHeatEarned`             | bumped in `addHeat`                                | lifetime heat (this run)         |
| `state.lifetimeHeatAtReset`         | summed on Supernova                                | lifetime heat (across prestiges) |
| `state.totalRipeFeeds`              | bumped in `registerRipeFeed`                       | ripe-feed count                  |
| `state.totalCometsCaught`           | bumped in `registerCometCaught`                    | comet count                      |
| `state.totalBlackHolesSurvived`     | bumped in `registerBlackHoleSurvived`              | BH survivals                     |
| `state.bestComboChain`              | bumped in `registerRipeFeed` when comboCount grows | best chain ever                  |
| `state.highestStage`                | bumped in `addHeat`'s stage-advance loop           | best stage ever                  |
| `state.solarClass`                  | bumped in `supernova()`                            | prestige rank                    |
| `state.streak.days`                 | tickStreakOnRipeFeed                               | daily streak                     |
| `state.upgrades`                    | bumped in `buyUpgrade`                             | per-upgrade levels               |
| `state.preferences.unlockedSunSkin` | bumped on stage advance                            | sun-skin cap                     |
| `state.preferences.unlockedTrails`  | added on milestone hits                            | trail unlocks                    |
| `state.tutorialSeen`                | flipped in `markTutorialSeen`                      | tutorial completion              |
| `state.totalMissionsCompleted`      | bumped in `registerMissionCompleted`               | mission count                    |

The "lifetime" counters are **never reset**. Only "in-run" counters (`heat`, `stage`, `upgrades`) reset on prestige.

---

## Porting to another project

1. **Copy `useAchievements.ts` and `AchievementsModal.vue`** into your `src/use/` and `src/components/organisms/` (or
   wherever fits).
2. **Replace the `useSolKeeper` import** in `useAchievements.ts` with your project's persistent-state composable.
3. **Rewrite `buildState()`** so it returns a `SolAchievementState` mapped from your project's fields. Rename the
   interface if you want — nothing else depends on the name.
4. **Rewrite `ACHIEVEMENTS`** with your project's goals. Keep ids stable forever — they're storage keys.
5. **Add a button** somewhere that calls `useAchievements().unseenCount.value` for the pulse and opens
   `AchievementsModal`.
6. **Make sure your modal molecule (`FModal`) is in the project**, or replace the `FModal` import in the modal with your
   own modal shell. The modal's tabs/header/footer aren't customised; you only need a basic "show content + close"
   wrapper.
7. **Versioned localStorage keys** — bump `_v1` to `_v2` if you ever rename or remove achievements that players have
   already unlocked, so you can run a one-off migration on load.

That's the whole integration. The rest is content — writing good achievement goals.

---

## Design notes

- **Predicates run on every state mutation.** This is fine because the predicates are pure boolean comparisons. If your
  project's state mutates 60 times per second from a render loop, **don't** put session-only refs into the snapshot —
  only persistent fields. Otherwise the watcher fires too often.
- **The unseen list is queue-based.** A player who unlocks 5 achievements in one session and never opens the modal sees
  a `5` chip on the trophy. Opening it clears all unseen at once via `markAllSeen()`. There's no per-achievement
  notification by design — too noisy.
- **The crest design encodes status in the shield's saturation.** Locked crests use the parent class's CSS filter, not a
  different SVG, which keeps the rendering identical for both states (cheap & predictable).
- **Glyphs should be ≤ 5 chars.** `100M`, `XXV`, `BH25` all fit. Longer strings spill outside the shield.
- **Color palettes should have visual contrast** between `from` (top of gradient), `to` (bottom), and `accent` (border +
  chevron). Pick from a Tailwind palette and step `300 → 800 → 950` for a clean look.
