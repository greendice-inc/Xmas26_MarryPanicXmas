import { useEffect, useRef, useState } from 'react'
import { GAME_COUNT, SECRET_TAP_COUNT, SECRET_TAP_WINDOW_MS, STAGE_W } from '../config'
import type { Phase } from '../types'

/** 隠しメニューの判定エリア（画面左上の一辺 px） */
const SECRET_ZONE = 220

interface Props {
  onReset: () => void
  onReconnect: () => void
  /** 指定時のみ「ロックを外す」ボタンを表示（プレイヤー用） */
  onUnlock?: () => void
  /** 指定時のみ「シーンジャンプ」ボタンを表示（プレイヤー用） */
  onJump?: (stage: number, phase: Phase) => void
  /** false のときは「ロックを外す」を出さない（ロックされていないとき） */
  locked?: boolean
  /** true のときフルスクリーン切り替えボタンを表示 */
  fullscreenToggle?: boolean
  /** 正解直後の30秒待ちのときだけ。押すとその待ちを飛ばす */
  onSkipWait?: () => void
}

/** 画面左上を連続タップするとメニューが出る（トップ画面以外で配置する） */
export default function HiddenMenu({ onReset, onReconnect, onUnlock, onJump, locked, fullscreenToggle, onSkipWait }: Props) {
  const taps = useRef<number[]>([])
  const [open, setOpen] = useState(false)
  const [jumping, setJumping] = useState(false)

  const [isFull, setIsFull] = useState(!!document.fullscreenElement)
  useEffect(() => {
    const on = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const tap = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < SECRET_TAP_WINDOW_MS), now]
    if (taps.current.length >= SECRET_TAP_COUNT) {
      taps.current = []
      setOpen(true)
    }
  }

  // 左上の領域は透明な板で塞がず、画面全体のタップを監視して数える
  // （板があると、その下にあるボタン（Santazon の家マークなど）が押せなくなるため）
  const tapRef = useRef(tap)
  tapRef.current = tap
  useEffect(() => {
    const on = (e: PointerEvent) => {
      const stage = document.querySelector('.stage')
      if (!stage) return
      const r = stage.getBoundingClientRect()
      const scale = r.width / STAGE_W
      const x = (e.clientX - r.left) / scale
      const y = (e.clientY - r.top) / scale
      if (x >= 0 && y >= 0 && x < SECRET_ZONE && y < SECRET_ZONE) tapRef.current()
    }
    window.addEventListener('pointerdown', on, true)
    return () => window.removeEventListener('pointerdown', on, true)
  }, [])

  const jump = (stage: number, phase: Phase) => {
    setOpen(false)
    setJumping(false)
    onJump?.(stage, phase)
  }

  return (
    <>
      {open && (
        <div className="modal-back">
          {jumping && onJump ? (
            <div className="modal">
              <h2>シーンジャンプ</h2>
              <div className="jump-grid">
                {Array.from({ length: GAME_COUNT }, (_, i) => i + 1).map((stage) => (
                  <div className="jump-row" key={stage}>
                    <span>{`ステージ${stage}`}</span>
                    <button onClick={() => jump(stage, 'novel')}>会話</button>
                    <button onClick={() => jump(stage, 'game')}>ゲーム</button>
                  </div>
                ))}
                <div className="jump-row">
                  <span>エンディング</span>
                  <button onClick={() => jump(GAME_COUNT, 'end')}>会話</button>
                </div>
              </div>
              <button onClick={() => setJumping(false)}>戻る</button>
            </div>
          ) : (
          <div className="modal">
            <h2>メニュー</h2>
            <button onClick={onReset}>トップへ戻る</button>
            {onUnlock && locked !== false && (
              <button
                onClick={() => {
                  setOpen(false)
                  onUnlock()
                }}
              >
                ロックを外す
              </button>
            )}
            {onJump && <button onClick={() => setJumping(true)}>シーンジャンプ</button>}
            {onSkipWait && (
              <button
                onClick={() => {
                  setOpen(false)
                  onSkipWait()
                }}
              >
                30秒をスキップ
              </button>
            )}
            {fullscreenToggle && (
              <button onClick={toggleFullscreen}>{isFull ? 'フルスクリーン解除' : 'フルスクリーンにする'}</button>
            )}
            <button
              onClick={() => {
                setOpen(false)
                onReconnect()
              }}
            >
              再接続
            </button>
            <button onClick={() => setOpen(false)}>閉じる</button>
          </div>
          )}
        </div>
      )}
    </>
  )
}
