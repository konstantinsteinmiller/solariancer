// jsdom 28 in this project ships with a stub `localStorage` that's a plain
// empty object — `.getItem`, `.setItem`, `.removeItem`, `.clear` are all
// undefined. The save code under test treats `localStorage` as a Web
// Storage implementation, so we swap in a minimal in-memory polyfill for
// the duration of the save tests.

import { beforeEach } from 'vitest'

class MemoryStorage implements Storage {
  private map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value))
  }
}

// Replace the jsdom stub up-front and before every test so that patching
// done by `SaveManager` doesn't leak across tests.
const install = (): void => {
  const storage = new MemoryStorage()
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true
  })
}

install()
beforeEach(install)

// jsdom doesn't ship indexedDB. useUserDb opens 'user_db' on import,
// which crashes any test that transitively pulls in useUser. Stub a
// minimal no-op IDBOpenDBRequest so the open call returns something
// truthy and the user code can just keep waiting forever for a state
// it never needs in physics tests.
// jsdom doesn't implement HTMLCanvasElement.getContext('2d') — it returns
// null. The physics module bakes a per-body sprite via createRadialGradient
// inside buildBodyPattern() at spawn time. Stub a context with no-op
// drawing methods so spawnBody doesn't crash; we only care about the
// physics simulation, not the rendered look.
const _origGetContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function(type: string): any {
  if (type !== '2d') return _origGetContext.call(this, type as any) as any
  const noop = () => undefined
  const gradient = { addColorStop: noop }
  const ctx: any = {
    canvas: this,
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    save: noop, restore: noop,
    translate: noop, rotate: noop, scale: noop, transform: noop, setTransform: noop, resetTransform: noop,
    beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, ellipse: noop, rect: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    fill: noop, stroke: noop, clip: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    fillText: noop, strokeText: noop,
    drawImage: noop,
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    createPattern: () => null,
    setLineDash: noop, getLineDash: () => [],
    measureText: () => ({ width: 0 })
  }
  return ctx
}

if (!('indexedDB' in window)) {
  const noopRequest = () => {
    const req = {
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
      result: null,
      addEventListener: () => {
      },
      removeEventListener: () => {
      }
    }
    return req
  }
  Object.defineProperty(window, 'indexedDB', {
    value: { open: () => noopRequest() },
    configurable: true,
    writable: true
  })
}
