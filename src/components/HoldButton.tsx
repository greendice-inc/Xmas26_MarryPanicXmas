import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** この時間押し続けると実行 */
  holdMs?: number
  /** 完了後に表示するメッセージ */
  doneLabel?: ReactNode
  /** 完了メッセージを表示する時間 */
  doneMs?: number
  onComplete: () => void
}

/** 長押しで実行するボタン。押している間ゲージが溜まり、離すと減っていく */
export default function HoldButton({ children, holdMs = 3000, doneLabel, doneMs = 2500, onComplete }: Props) {
  const [progress, setProgress] = useState(0)
  const holding = useRef(false)
  const value = useRef(0)
  const raf = useRef(0)
  const last = useRef(0)
  const done = useRef(false)
  const [showDone, setShowDone] = useState(false)
  const doneTimer = useRef(0)

  const tick = (now: number) => {
    const dt = now - last.current
    last.current = now
    if (holding.current) value.current = Math.min(1, value.current + dt / holdMs)
    else value.current = Math.max(0, value.current - (dt / holdMs) * 2)
    setProgress(value.current)
    if (value.current >= 1 && !done.current) {
      // 最大までチャージ：ゲージを空に戻して実行し、完了メッセージを出す
      done.current = true
      holding.current = false
      value.current = 0
      setProgress(0)
      raf.current = 0
      onComplete()
      if (doneLabel) {
        setShowDone(true)
        doneTimer.current = window.setTimeout(() => setShowDone(false), doneMs)
      }
      return
    }
    if (value.current <= 0 && !holding.current) {
      raf.current = 0
      return
    }
    raf.current = requestAnimationFrame(tick)
  }

  const start = () => {
    if (showDone) return
    done.current = false
    holding.current = true
    if (!raf.current) {
      last.current = performance.now()
      raf.current = requestAnimationFrame(tick)
    }
  }
  const stop = () => {
    holding.current = false
  }

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      clearTimeout(doneTimer.current)
    },
    [],
  )

  return (
    <button
      className="hold-btn"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-fill" style={{ transform: `scaleX(${progress})` }} />
      <span className="hold-label">{showDone ? doneLabel : children}</span>
    </button>
  )
}
