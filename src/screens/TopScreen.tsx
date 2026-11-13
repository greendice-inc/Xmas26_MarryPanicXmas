import { TEAM_COUNT } from '../config'
import { isOnline, useNow, usePresenceAll } from '../net/hooks'
import { presenceKey, type Identity } from '../types'

export default function TopScreen({
  onSelect,
  onOpenCatalog,
  onOpenScript,
}: {
  onSelect: (i: Identity) => void
  onOpenCatalog?: () => void
  /** セリフ編集（?debug=true のときだけ） */
  onOpenScript?: () => void
}) {
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
        <div className="top-lead">
          <div className="top-legend"><span className="tile-live">起動中</span> は、すでに別の端末で使われています</div>
          <div className="top-updated">更新 {__UPDATED_AT__}</div>
        </div>
        <div className="top-debug-links">
          {onOpenScript && <button className="catalog-link script-link" onClick={onOpenScript}>セリフ編集</button>}
          {onOpenCatalog && <button className="catalog-link" onClick={onOpenCatalog}>商品を登録</button>}
        </div>
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
