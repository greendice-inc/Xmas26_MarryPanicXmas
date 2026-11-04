import type { Backend, Unsubscribe } from './backend'

/** localStorage + BroadcastChannel。同一PC内の複数タブで動作確認するためのもの */
export function createLocalBackend(): Backend {
  const prefix = 'mpx:'
  const channel = new BroadcastChannel('mpx')
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())
  channel.onmessage = notify
  window.addEventListener('storage', notify)

  const read = (col: string): Record<string, any> => {
    try {
      return JSON.parse(localStorage.getItem(prefix + col) ?? '{}')
    } catch {
      return {}
    }
  }

  const sub = (fn: () => void): Unsubscribe => {
    listeners.add(fn)
    fn()
    return () => listeners.delete(fn)
  }

  return {
    kind: 'local',
    async set(col, id, data) {
      const all = read(col)
      all[id] = { ...(all[id] ?? {}), ...data }
      localStorage.setItem(prefix + col, JSON.stringify(all))
      channel.postMessage(1)
      notify()
    },
    watchDoc(col, id, cb) {
      return sub(() => cb((read(col)[id] as any) ?? null))
    },
    watchCol(col, cb) {
      return sub(() => cb(read(col)))
    },
  }
}
