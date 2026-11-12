/** ゲーム画面の下に並べる3つのボタン */
const ITEMS = ['注文', 'やるべきこと', '記録'] as const

export default function GameMenu({
  shopOpen,
  onOrder,
  onTask,
  highlightOrder,
}: {
  shopOpen: boolean
  onOrder: () => void
  onTask?: () => void
  highlightOrder?: boolean
}) {
  return (
    <nav className="game-menu">
      {ITEMS.map((label) => (
        <button
          key={label}
          className={`sub${label === '注文' && shopOpen ? ' on' : ''}${label === '注文' && highlightOrder ? ' is-hot' : ''}`}
          onClick={label === '注文' ? onOrder : label === 'やるべきこと' ? onTask : undefined}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
