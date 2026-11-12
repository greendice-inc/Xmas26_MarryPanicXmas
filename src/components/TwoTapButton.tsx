import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: ReactNode
  /** 1回目を押したあとに表示するラベル */
  armedLabel?: ReactNode
  /** 1回目から何ms以内に2回目を押す必要があるか */
  timeoutMs?: number
  onConfirm: () => void
}

/** 2回押すと実行されるボタン。1回目で「もう一度押してください」状態になり、時間が過ぎると戻る */
export default function TwoTapButton({
  children,
  armedLabel = 'もう一度押す',
  timeoutMs = 3000,
  onConfirm,
  className,
  ...rest
}: Props) {
  const [armed, setArmed] = useState(false)
  const timer = useRef(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  const press = () => {
    if (armed) {
      clearTimeout(timer.current)
      setArmed(false)
      onConfirm()
    } else {
      setArmed(true)
      timer.current = window.setTimeout(() => setArmed(false), timeoutMs)
    }
  }

  return (
    <button {...rest} className={`${className ?? ''}${armed ? ' armed' : ''}`} onClick={press}>
      {armed ? armedLabel : children}
    </button>
  )
}
