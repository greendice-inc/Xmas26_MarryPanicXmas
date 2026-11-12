import ConnDot from '../components/ConnDot'
import Header from '../components/Header'
import HoldButton from '../components/HoldButton'
import { KEYBOX_COUNT, ROOM_BY_TEAM, TEAM_COUNT } from '../config'
import { getBackend } from '../net'
import { DEFAULT_TEAM, progressLabel } from '../types'
import { isOnline, useNow, usePresenceAll, useTeamsAll } from '../net/hooks'

export default function MasterScreen() {
  const all = usePresenceAll()
  const teams = useTeamsAll()
  const now = useNow()
  const row = (key: string, label: string, extra?: React.ReactNode) => (
    <div className="conn-item" key={key}>
      <ConnDot on={isOnline(all[key], now)} />
      {label}
      {extra}
    </div>
  )
  const teamRow = (n: number) => {
    const t = { ...DEFAULT_TEAM, ...(teams[String(n)] ?? {}) }
    return row(
      `player-${n}`,
      `チーム ${n}`,
      <span className="conn-progress">
        {progressLabel(t)}
        {t.started && <span className={t.locked ? 'locked' : 'open'}>{t.locked ? '🔒' : ''}</span>}
      </span>,
    )
  }
  /** 全チームを「はじめから」を押した直後の状態に戻す（ステージ0・フタあり） */
  const resetAll = () => {
    const now = Date.now()
    Promise.all(
      Array.from({ length: TEAM_COUNT }, (_, i) =>
        getBackend().set('teams', String(i + 1), {
          ...DEFAULT_TEAM,
          // 「はじめから」を押した直後の状態（フタがかかって待機）
          started: true,
          room: ROOM_BY_TEAM[i + 1] ?? i + 1,
          resetAt: now,
          updatedAt: now,
        }),
      ),
    ).catch(() => {})
  }

  return (
    <div className="screen master">
      <Header
        title="マスター"
        right={<HoldButton onComplete={resetAll} doneLabel="リセットが完了しました">すべての端末をリセット（長押し）</HoldButton>}
      />
      <section className="card">
        <h2 className="section-title">スタッフ</h2>
        <div className="conn-grid">{row('staff', 'スタッフ')}</div>
      </section>
      <section className="card">
        <h2 className="section-title">プレイヤー</h2>
        <div className="conn-grid">
          {Array.from({ length: TEAM_COUNT }, (_, i) => teamRow(i + 1))}
        </div>
      </section>
      <section className="card">
        <h2 className="section-title">キーボックス</h2>
        <div className="conn-grid">
          {Array.from({ length: KEYBOX_COUNT }, (_, i) => row(`keybox-${i + 1}`, `キーボックス ${i + 1}`))}
        </div>
      </section>
    </div>
  )
}
