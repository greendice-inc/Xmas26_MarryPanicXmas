import { useEffect, useState } from 'react'
import ConnDot from '../components/ConnDot'
import Header from '../components/Header'
import TwoTapButton from '../components/TwoTapButton'
import { TEAM_COUNT } from '../config'
import { getBackend } from '../net'
import { isOnline, useNow, usePresenceAll, useTeamsAll } from '../net/hooks'
import { isGame1LoseCart } from '../santazon/products'
import { useProducts } from '../santazon/useProducts'
import { DEFAULT_TEAM, progressLabel } from '../types'

/** 進捗の見た目。ステージが揃うまでは、全チーム同じ飾り */
const PROGRESS_NODES = ['lg', 'sm', 'sm', 'lg'] as const

function ProgressOrnament() {
  return (
    <div className="progress-track" aria-hidden>
      {PROGRESS_NODES.map((size, i) => (
        <span key={i} className="progress-step">
          <i className={`progress-node is-${size}`} />
          <i className="progress-bar" />
        </span>
      ))}
    </div>
  )
}

export default function StaffScreen() {
  const { products } = useProducts()
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
          const order = t.order
          const holding = !!order?.stayed
          const canHold =
            t.stage === 1 &&
            t.phase === 'game' &&
            !!order &&
            order.status === 'solved' &&
            isGame1LoseCart(order.items)
          const remain =
            canHold && order.proceedAt != null
              ? Math.max(0, Math.ceil((order.proceedAt - now) / 1000))
              : null
          return (
            <div className={`staff-row ${t.locked ? 'is-locked' : 'is-open'}`} key={n}>
              <div className="staff-row-body">
                <div className="staff-row-main">
                  <ConnDot on={isOnline(presence[`player-${n}`], now)} />
                  <div className="team-no">チーム {n}</div>
                  <div className="progress">{progressLabel(t)}</div>
                  {t.order ? (
                    <>
                      <span className={`order-status ${t.order.status}`}>
                        {t.order.status === 'delivered' ? '解答中' : t.order.status === 'solved' ? '正解！' : '注文あり'}
                      </span>
                      <span className="order-items">
                        {t.order.items.map((i) => `${products.find((p) => p.id === i.id)?.name ?? i.id}×${i.qty}`).join('、')}
                      </span>
                    </>
                  ) : (
                    <span className="order-none">注文なし</span>
                  )}
                </div>
                <ProgressOrnament />
              </div>
              <div className="staff-row-side">
                <div className={`lock-state ${t.locked ? 'locked' : 'open'}`}>{t.locked ? 'ロック中' : '解除中'}</div>
                <div className="stay-row">
                {remain != null && <div className={`stay-count${holding ? ' is-held' : ''}`}>{remain}秒</div>}
                <button
                  className="order-ready"
                  disabled={!canHold}
                  onClick={() => {
                    if (!order) return
                    getBackend()
                      .set('teams', String(n), {
                        order: { ...order, stayed: !holding },
                        updatedAt: Date.now(),
                      })
                      .catch(() => {})
                  }}
                >
                  {holding ? '再開' : 'ステイ'}
                </button>
                </div>
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
