import type { LocalStorageAccessor, SaveStrategy, HydrateState, HydrateNotice, HydrateNoticeListener } from './types'

// ─── GameDistribution save strategy ──────────────────────────────────────
//
// GameDistribution does NOT expose a cloud-save API as of 2026-04. Their
// platform docs only describe the GameAPI for ads / analytics; save state
// is the game's responsibility. localStorage is therefore authoritative
// for GD builds.
//
// We still implement a Strategy class (as opposed to falling through to
// the generic `LocalStorageStrategy`) so that:
//
//   1. The boot pipeline branches uniformly — "platform X picks its
//      strategy" — instead of having a special "no strategy needed" arm.
//   2. If GD ever ships a save API we already have a place to wire it.
//   3. We can fire a `success-empty` notice on hydrate so the UI knows the
//      bulletproof state machine landed cleanly (vs `'pending'` forever).

export class GameDistributionStrategy implements SaveStrategy {
  readonly name = 'gameDistribution'

  hydrateState: HydrateState = 'pending'

  private listeners = new Set<HydrateNoticeListener>()

  async hydrate(_local: LocalStorageAccessor): Promise<void> {
    // No cloud — the browser already loaded localStorage for us.
    this.transition('success-empty', 'GD has no cloud save API')
  }

  onHydrateNotice(listener: HydrateNoticeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onLocalSet(_key: string, _value: string): void {
    // No remote backend.
  }

  onLocalRemove(_key: string): void {
    // No remote backend.
  }

  private transition(state: HydrateState, reason?: string): void {
    this.hydrateState = state
    const notice: HydrateNotice = { state }
    if (reason) notice.reason = reason
    for (const fn of this.listeners) {
      try {
        fn(notice)
      } catch (e) {
        console.warn('[save/gd] notice listener threw', e)
      }
    }
  }
}
