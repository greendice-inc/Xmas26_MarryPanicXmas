import { useEffect, useRef, useState } from 'react'
import { KV_IMAGE } from '../config'
import { characterImage } from '../scenario'
import type { GameProps } from './index'

/** ステージ1：マークの点数当て。点数は 0〜9 の一桁 */
const MARKS = [
  { id: 'heart', label: 'ハート', symbol: '❤️', answer: 1 },
  { id: 'note', label: '音符', symbol: '🎵', answer: 2 },
  { id: 'diamond', label: '菱形', symbol: '◆', answer: 3 },
  { id: 'star', label: '星', symbol: '⭐', answer: 0 },
] as const

type MarkId = (typeof MARKS)[number]['id']

/** テンキー：数字は横一列、その右に「消す」「確定」 */
const DIGIT_KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const ACTION_KEYS = ['DEL', 'OK'] as const
const KEYS = [...DIGIT_KEYS, ...ACTION_KEYS] as const
/** 入力できる最大桁数 */
const MAX_DIGITS = 9

/** 案内役のエルフの台詞。画面下のテキストボックスに出す */
const GUIDE = {
  start: 'マークを選んで得点を入力しよう。',
  picking: 'マークを選んで得点を入力しよう。',
  wrong: 'うーん、ちがうみたい。もう一度考えてみて！',
  right: 'その調子！',
  done: 'すべて分かったね！すごい！',
} as const

export default function MarkGame({ onClear }: GameProps) {
  const [solved, setSolved] = useState<Partial<Record<MarkId, number>>>({})
  const [selected, setSelected] = useState<MarkId | null>(null)
  const [input, setInput] = useState('')
  const [guide, setGuide] = useState<keyof typeof GUIDE>('start')
  const cleared = useRef(false)
  const onClearRef = useRef(onClear)
  onClearRef.current = onClear

  const allSolved = MARKS.every((m) => solved[m.id] !== undefined)

  useEffect(() => {
    if (!allSolved) return
    setGuide('done')
    const t = setTimeout(() => {
      if (cleared.current) return
      cleared.current = true
      onClearRef.current()
    }, 1500)
    return () => clearTimeout(t)
  }, [allSolved])

  const pick = (id: MarkId) => {
    if (solved[id] !== undefined) return
    setSelected(id)
    setInput('')
    setGuide('picking')
  }

  const press = (key: (typeof KEYS)[number]) => {
    if (!selected) return
    if (key === 'DEL') setInput((v) => v.slice(0, -1))
    else if (key === 'OK') confirm()
    else setInput((v) => (v.length < MAX_DIGITS ? v + key : v))
  }

  const confirm = () => {
    if (!selected || input === '') return
    const mark = MARKS.find((m) => m.id === selected)!
    if (Number(input) === mark.answer) {
      setSolved((s) => ({ ...s, [selected]: mark.answer }))
      setSelected(null)
      setInput('')
      setGuide('right')
    } else {
      setInput('')
      setGuide('wrong')
    }
  }

  const elfEmotion = guide === 'wrong' ? '哀' : guide === 'right' || guide === 'done' ? '喜' : '真顔'

  return (
    <div className="game mark-game">
      <img className="mark-bg" src={KV_IMAGE} alt="" />
      <div className="mark-body">
        <div className="mark-grid">
          {MARKS.map((m) => {
            const answer = solved[m.id]
            return (
              <div key={m.id} className="mark-slot">
                <span className="mark-score">{answer !== undefined ? answer : ''}</span>
                <button
                  className={`mark-btn${selected === m.id ? ' is-selected' : ''}${answer !== undefined ? ' is-solved' : ''}`}
                  aria-label={m.label}
                  disabled={answer !== undefined}
                  onClick={() => pick(m.id)}
                >
                  <span className="mark-symbol" aria-hidden>{m.symbol}</span>
                </button>
              </div>
            )
          })}
        </div>
        <div className="mark-pad">
          <div className="mark-input" aria-live="polite">{input || ' '}</div>
          <div className="mark-keypad">
            <div className="key-row digits">
              {DIGIT_KEYS.map((k) => (
                <button key={k} className="key-btn" onClick={() => press(k)}>{k}</button>
              ))}
            </div>
            <div className="key-row actions">
              <button className="key-btn is-del" onClick={() => press('DEL')}>消す</button>
              <button className="key-btn is-ok" disabled={!selected || input === ''} onClick={() => press('OK')}>確定</button>
            </div>
          </div>
        </div>
      </div>
      <div className="mark-speak">
        <img className="mark-speak-icon" src={characterImage('Common', elfEmotion)} alt="" />
        <div className="mark-speak-box" key={guide}>{GUIDE[guide]}</div>
      </div>
    </div>
  )
}
