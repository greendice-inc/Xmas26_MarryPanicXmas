/** ゲーム画面の下に並べる3つのボタン */
const ITEMS = ['注文', 'やるべきこと', '記録'] as const

export default function GameMenu({ shopOpen, onOrder }: { shopOpen: boolean; onOrder: () => void }) {
  return (
    <nav className="game-menu">
      {ITEMS.map((label) => (
        <button
          key={label}
          className={`sub${label === '注文' && shopOpen ? ' on' : ''}`}
          onClick={label === '注文' ? onOrder : undefined}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
