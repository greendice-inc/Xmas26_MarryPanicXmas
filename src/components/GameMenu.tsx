/** ゲーム画面の下に並べる3つのボタン */
const ITEMS = ['注文', 'やるべきこと', '記録'] as const

export default function GameMenu({
  shopOpen,
  onOrder,
  onTask,
  locked,
}: {
  shopOpen: boolean
  onOrder: () => void
  onTask?: () => void
  /** 会話中はテキスト送り以外を受け付けない */
  locked?: boolean
}) {
  const action = (label: (typeof ITEMS)[number]) =>
    label === '注文' ? onOrder : label === 'やるべきこと' ? onTask : undefined

  return (
    <nav className={`game-menu${locked ? ' is-locked' : ''}`}>
      {ITEMS.map((label) => {
        const onClick = action(label)
        return (
          <button
            key={label}
            className={`sub${label === '注文' && shopOpen ? ' on' : ''}`}
            disabled={!!locked || !onClick}
            onClick={onClick}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}
