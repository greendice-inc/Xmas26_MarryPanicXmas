import { useCallback, useEffect, useState } from 'react'
import { HEARTBEAT_MS, PRESENCE_TIMEOUT_MS, TEAM_COUNT } from '../config'
import { DEFAULT_TEAM, presenceKey, type Identity, type PresenceDoc, type TeamDoc } from '../types'
import { getBackend } from './index'

/** 自分の接続状況を定期的に書き込む */
export function usePresence(identity: Identity) {
  useEffect(() => {
    const b = getBackend()
    const key = presenceKey(identity)
    const beat = () => b.set('presence', key, { lastSeen: Date.now() }).catch(() => {})
    beat()
    const t = setInterval(beat, HEARTBEAT_MS)
    return () => {
      clearInterval(t)
      // 役割選択に戻ったとき「起動中」が残らないよう、すぐに切断扱いにする
      b.set('presence', key, { lastSeen: 0 }).catch(() => {})
    }
  }, [identity.role, identity.id])
}

/** 現在時刻（接続判定の再評価用） */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function usePresenceAll(): Record<string, PresenceDoc> {
  const [all, setAll] = useState<Record<string, PresenceDoc>>({})
  useEffect(() => getBackend().watchCol<PresenceDoc>('presence', setAll), [])
  return all
}

export function isOnline(p: PresenceDoc | undefined, now: number): boolean {
  return !!p && now - p.lastSeen < PRESENCE_TIMEOUT_MS
}

export function useTeamsAll(): Record<string, TeamDoc> {
  const [all, setAll] = useState<Record<string, TeamDoc>>({})
  useEffect(() => {
    const b = getBackend()
    // チーム番号の文書だけを見る。商品データは同じコレクションに置いてある
    const unsubs = Array.from({ length: TEAM_COUNT }, (_, i) => {
      const id = String(i + 1)
      return b.watchDoc<TeamDoc>('teams', id, (d) => {
        setAll((prev) => ({ ...prev, [id]: d ?? DEFAULT_TEAM }))
      })
    })
    return () => unsubs.forEach((u) => u())
  }, [])
  return all
}

export function useTeam(team: number): [TeamDoc, (patch: Partial<TeamDoc>) => void, boolean] {
  const [doc, setDoc] = useState<TeamDoc | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(
    () =>
      getBackend().watchDoc<TeamDoc>('teams', String(team), (d) => {
        setDoc(d)
        setLoaded(true)
      }),
    [team],
  )
  const update = useCallback(
    (patch: Partial<TeamDoc>) => {
      getBackend()
        .set('teams', String(team), { ...patch, updatedAt: Date.now() })
        .catch(() => {})
    },
    [team],
  )
  return [{ ...DEFAULT_TEAM, ...(doc ?? {}) }, update, loaded]
}
