import { useRef, useState } from 'react'
import { SECRET_TAP_COUNT, SECRET_TAP_WINDOW_MS } from '../config'

interface Props {
  onReset: () => void
  onReconnect: () => void
}

/** 画面左上を連続タップするとメニューが出る（トップ画面以外で配置する） */
export default function HiddenMenu({ onReset, onReconnect }: Props) {
  const taps = useRef<number[]>([])
  const [open, setOpen] = useState(false)

  const tap = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < SECRET_TAP_WINDOW_MS), now]
    if (taps.current.length >= SECRET_TAP_COUNT) {
      taps.current = []
      setOpen(true)
    }
  }

  return (
    <>
      <div className="secret-zone" onPointerDown={tap} />
      {open && (
        <div className="modal-back">
          <div className="modal">
            <h2>メニュー</h2>
            <button onClick={onReset}>リセット（トップへ戻る）</button>
            <button
              className="dark"
              onClick={() => {
                setOpen(false)
                onReconnect()
              }}
            >
              再接続
            </button>
            <button className="ghost" onClick={() => setOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}
