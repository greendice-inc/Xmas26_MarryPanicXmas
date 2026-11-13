/** ゲーム画面の下に並べる3つのボタン */
const ITEMS = ['注文', 'やるべきこと', '記録'] as const

export default function GameMenu({
  shopOpen,
  onOrder,
  onTask,
  onRecord,
  guide,
  guided,
  locked,
}: {
  shopOpen: boolean
  onOrder?: () => void
  onTask?: () => void
  onRecord?: () => void
  /** 案内で目立たせるボタン */
  guide?: (typeof ITEMS)[number] | null
  /** 説明中。目立たせたボタン以外は触れない */
  guided?: boolean
  /** 会話中はテキスト送り以外を受け付けない */
  locked?: boolean
}) {
  const action = (label: (typeof ITEMS)[number]) =>
    label === '注文' ? onOrder : label === 'やるべきこと' ? onTask : onRecord

  return (
    <nav className={`game-menu${locked ? ' is-locked' : ''}${guided ? ' is-guided' : ''}`}>
      {ITEMS.map((label) => {
        const onClick = action(label)
        return (
          <button
            key={label}
            data-menu={label}
            className={`sub${label === '注文' && shopOpen ? ' on' : ''}${guide === label ? ' is-guide' : ''}`}
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
