import Logo from '../components/Logo'
import { TEAM_COUNT } from '../config'
import { isOnline, useNow, usePresenceAll } from '../net/hooks'
import { presenceKey, type Identity } from '../types'

export default function TopScreen({ onSelect, onOpenCatalog }: { onSelect: (i: Identity) => void; onOpenCatalog?: () => void }) {
  // すでに別の端末で起動している役割には「起動中」の目印を出す
  const presence = usePresenceAll()
  const now = useNow()
  const live = (i: Identity) => isOnline(presence[presenceKey(i)], now)

  const tile = (i: Identity, className: string, children: React.ReactNode) => {
    const on = live(i)
    return (
      <button key={`${i.role}-${i.id}`} className={`${className}${on ? ' is-online' : ''}`} onClick={() => onSelect(i)}>
        {children}
        {on && <span className="tile-live">起動中</span>}
      </button>
    )
  }

  return (
    <div className="screen top">
      <header className="top-header">
        <Logo size="lg" />
        <div className="top-lead">
          <div>はじめに、この端末の役割をえらんでください</div>
          <div className="top-legend"><span className="tile-live">起動中</span> は、すでに別の端末で使われています</div>
          <div className="top-updated">更新 {__UPDATED_AT__}</div>
        </div>
        {onOpenCatalog && <button className="ghost catalog-link" onClick={onOpenCatalog}>商品を登録</button>}
      </header>

      <div className="top-cards">
        <section className="card">
          <h2 className="section-title">管理</h2>
          <div className="tile-row">
            {tile({ role: 'master', id: 0 }, 'tile tile-wide', 'マスター')}
            {tile({ role: 'staff', id: 0 }, 'tile tile-wide', 'スタッフ')}
          </div>
        </section>
      </div>

      <section className="card card-teams">
        <h2 className="section-title">プレイヤー（チーム番号）</h2>
        <div className="grid-team">
          {Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).map((n) =>
            tile(
              { role: 'player', id: n },
              'tile tile-team',
              <>
                <span className="tile-cap">TEAM</span>
                <span className="tile-num">{n}</span>
              </>,
            ),
          )}
        </div>
      </section>
    </div>
  )
}
