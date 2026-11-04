import ConnDot from '../components/ConnDot'
import Header from '../components/Header'
import { KEYBOX_COUNT, TEAM_COUNT } from '../config'
import { isOnline, useNow, usePresenceAll } from '../net/hooks'

export default function MasterScreen() {
  const all = usePresenceAll()
  const now = useNow()
  const row = (key: string, label: string) => (
    <div className="conn-item" key={key}>
      <ConnDot on={isOnline(all[key], now)} />
      {label}
    </div>
  )
  return (
    <div className="screen master">
      <Header title="マスター" />
      <section className="card">
        <h2 className="section-title">スタッフ</h2>
        <div className="conn-grid">{row('staff', 'スタッフ')}</div>
      </section>
      <section className="card">
        <h2 className="section-title">プレイヤー</h2>
        <div className="conn-grid">
          {Array.from({ length: TEAM_COUNT }, (_, i) => row(`player-${i + 1}`, `チーム ${i + 1}`))}
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
