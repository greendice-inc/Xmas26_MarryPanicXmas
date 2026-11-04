import { useState } from 'react'

const HANDS = [
  { label: 'グー', emoji: '✊' },
  { label: 'チョキ', emoji: '✌️' },
  { label: 'パー', emoji: '🖐️' },
]

/** 仮のゲームパート。勝てばクリア。 */
export default function Janken({ stage, onClear }: { stage: number; onClear: () => void }) {
  const [result, setResult] = useState<{ me: number; cpu: number; n: number } | null>(null)

  const play = (me: number) => {
    const cpu = Math.floor(Math.random() * 3)
    setResult((r) => ({ me, cpu, n: (r?.n ?? 0) + 1 }))
    if ((me - cpu + 3) % 3 === 2) setTimeout(onClear, 1200)
  }

  const verdict = result
    ? result.me === result.cpu
      ? 'あいこ！もう一回'
      : (result.me - result.cpu + 3) % 3 === 2
        ? '勝ち！クリア！'
        : '負け…もう一回'
    : 'じゃんけん…！'

  return (
    <div className="game janken">
      <h2 className="game-title"><span>GAME {stage}</span>じゃんけん</h2>
      <div className="verdict" key={`v${result?.n ?? 0}`}>{verdict}</div>
      {result && (
        <div className="hands" key={`h${result.n}`}>
          <span className="hand">{HANDS[result.me].emoji}</span>
          <span className="vs">VS</span>
          <span className="hand">{HANDS[result.cpu].emoji}</span>
        </div>
      )}
      <div className="hand-buttons">
        {HANDS.map((h, i) => (
          <button key={h.label} className="card-btn" onClick={() => play(i)}>
            <span className="emoji">{h.emoji}</span>
            {h.label}
          </button>
        ))}
      </div>
    </div>
  )
}
