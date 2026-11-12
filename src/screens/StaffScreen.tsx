import { useEffect, useState } from 'react'
import ConnDot from '../components/ConnDot'
import Header from '../components/Header'
import TwoTapButton from '../components/TwoTapButton'
import { TEAM_COUNT } from '../config'
import { getBackend } from '../net'
import { isOnline, useNow, usePresenceAll, useTeamsAll } from '../net/hooks'
import { productById } from '../santazon/products'
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

  const teamDoc = (n: number) => ({ ...DEFAULT_TEAM, ...(teams[String(n)] ?? {}) })
  const teamNos = Array.from({ length: TEAM_COUNT }, (_, i) => i + 1)
  const allLocked = teamNos.every((n) => teamDoc(n).locked)
  const allOpen = teamNos.every((n) => !teamDoc(n).locked)

  /** 全チームのフタを一括で切り替える */
  const setAllLocked = (locked: boolean) =>
    Promise.all(
      teamNos.map((n) => getBackend().set('teams', String(n), { locked, updatedAt: Date.now() })),
    ).catch(() => {})

  /** 注文の準備ができた：プレイヤー端末に問題を出す */
  const markReady = (n: number) => {
    const order = teamDoc(n).order
    if (!order) return
    getBackend()
      .set('teams', String(n), { order: { ...order, status: 'delivered' }, updatedAt: Date.now() })
      .catch(() => {})
  }

  return (
    <div className="screen staff">
      <Header
        title="スタッフ"
        right={
          <div className="bulk-bar">
            <TwoTapButton disabled={allLocked} armedLabel="もう一度押すとロック" onConfirm={() => setAllLocked(true)}>
              一括ロック
            </TwoTapButton>
            <TwoTapButton
              className="dark"
              disabled={allOpen}
              armedLabel="もう一度押すと解除"
              onConfirm={() => setAllLocked(false)}
            >
              一括ロック解除
            </TwoTapButton>
          </div>
        }
      />
      <div className="staff-list">
        {teamNos.map((n) => {
          const t = teamDoc(n)
          return (
            <div className={`staff-row ${t.locked ? 'is-locked' : 'is-open'}`} key={n}>
              <div className="staff-row-main">
                <ConnDot on={isOnline(presence[`player-${n}`], now)} />
                <div className="team-no">チーム {n}</div>
                <div className="room">{t.room ? `部屋 ${t.room}` : '—'}</div>
                <div className="progress">{progressLabel(t)}</div>
                <div className={`lock-state ${t.locked ? 'locked' : 'open'}`}>{t.locked ? 'ロック中' : '解除中'}</div>
              </div>
              <div className="staff-order">
                {t.order ? (
                  <>
                    <span className={`order-status ${t.order.status}`}>
                      {t.order.status === 'ordered' ? '注文あり' : t.order.status === 'delivered' ? '解答中' : '正解！'}
                    </span>
                    <span className="order-items">
                      {t.order.items.map((i) => `${productById(i.id)?.name ?? i.id}×${i.qty}`).join('、')}
                    </span>
                    {t.order.status === 'ordered' && (
                      <button className="order-ready" onClick={() => markReady(n)}>準備完了</button>
                    )}
                  </>
                ) : (
                  <span className="order-none">注文なし</span>
                )}
              </div>
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
