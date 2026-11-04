import { useEffect, useState } from 'react'
import ConnDot from '../components/ConnDot'
import Header from '../components/Header'
import { TEAM_COUNT } from '../config'
import { getBackend } from '../net'
import { isOnline, useNow, usePresenceAll, useTeamsAll } from '../net/hooks'
import { DEFAULT_TEAM, progressLabel } from '../types'

export default function StaffScreen() {
  const teams = useTeamsAll()
  const presence = usePresenceAll()
  const now = useNow()
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const teamNos = Array.from({ length: TEAM_COUNT }, (_, i) => i + 1)
  const teamDoc = (n: number) => ({ ...DEFAULT_TEAM, ...(teams[String(n)] ?? {}) })
  const allLocked = teamNos.every((n) => teamDoc(n).locked)
  const allOpen = teamNos.every((n) => !teamDoc(n).locked)

  /** 全チームのフタを一括で切り替える */
  const setAllLocked = (locked: boolean) =>
    Promise.all(
      teamNos.map((n) => getBackend().set('teams', String(n), { locked, updatedAt: Date.now() })),
    ).catch(() => {})

  return (
    <div className="screen staff">
      <Header
        title="スタッフ"
        right={
          <div className="bulk-bar">
            <button disabled={allLocked} onClick={() => setAllLocked(true)}>一括ロック</button>
            <button className="dark" disabled={allOpen} onClick={() => setAllLocked(false)}>一括ロック解除</button>
          </div>
        }
      />
      <div className="staff-list">
        {teamNos.map((n) => {
          const t = teamDoc(n)
          return (
            <div className={`staff-row ${t.locked ? 'is-locked' : 'is-open'}`} key={n}>
              <ConnDot on={isOnline(presence[`player-${n}`], now)} />
              <div className="team-no">チーム {n}</div>
              <div className="room">{t.room ? `部屋 ${t.room}` : '—'}</div>
              <div className="progress">{progressLabel(t)}</div>
              <div className={`lock-state ${t.locked ? 'locked' : 'open'}`}>{t.locked ? 'ロック中' : '解除中'}</div>
            </div>
          )
        })}
      </div>
      <div className="status-bar">
        <span><ConnDot on={online} /> ネットワーク: {online ? 'オンライン' : 'オフライン'}</span>
        <span>データ通信: {getBackend().kind === 'firestore' ? 'Firestore' : 'ローカル（テスト）'}</span>
        <span>スタッフ接続: <ConnDot on={isOnline(presence['staff'], now)} /></span>
      </div>
    </div>
  )
}
