import { useEffect, useState } from 'react'
import type { NovelScene } from '../scenario'

const CHAR_MS = 50

/** 背景の上にキャラクターを置き、しゃべっている間だけ上下に動かす */
export default function NovelPart({ scene, onFinish }: { scene: NovelScene; onFinish: () => void }) {
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(0)
  const line = scene.lines[idx]
  const talking = shown < line.text.length

  useEffect(() => {
    setShown(0)
    const t = setInterval(() => {
      setShown((s) => {
        if (s >= line.text.length) {
          clearInterval(t)
          return s
        }
        return s + 1
      })
    }, CHAR_MS)
    return () => clearInterval(t)
  }, [idx, line.text])

  const next = () => {
    if (talking) return setShown(line.text.length)
    if (idx + 1 < scene.lines.length) setIdx(idx + 1)
    else onFinish()
  }

  return (
    <div className="novel" onClick={next}>
      {scene.background ? (
        <img className="novel-bg" src={scene.background} alt="" />
      ) : (
        <div className="novel-bg placeholder">背景画像</div>
      )}
      <div className={`novel-char ${talking ? 'talking' : ''}`}>
        {scene.character ? <img src={scene.character} alt="" /> : <div className="placeholder">🎅</div>}
      </div>
      <div className="novel-window">
        <div className="speaker">{line.speaker}</div>
        <div className="text">{line.text.slice(0, shown)}</div>
        {!talking && <div className="next">▼</div>}
      </div>
    </div>
  )
}
