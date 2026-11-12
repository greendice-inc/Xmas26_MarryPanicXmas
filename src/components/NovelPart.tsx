import { useEffect, useState } from 'react'
import { backgroundImage, characterImage, type Emotion, type NovelLine, type NovelScene } from '../scenario'

const CHAR_MS = 50
/** 登場演出（キャラが下からせり上がる → パネルが出る）の長さ。この後に台詞が出始める */
const INTRO_MS = 1500

/** 「{強調}」の部分を黄色にするため、文字列を分割する */
function parse(text: string): { t: string; hl: boolean }[] {
  return text
    .split(/(\{[^}]*\})/)
    .filter(Boolean)
    .map((s) => (s.startsWith('{') ? { t: s.slice(1, -1), hl: true } : { t: s, hl: false }))
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg className={`novel-sparkle ${className}`} viewBox="-20 -20 40 40" aria-hidden>
      <path d="M0 -18 Q2 -2 18 0 Q2 2 0 18 Q-2 2 -18 0 Q-2 -2 0 -18Z" fill="#ffe14d" stroke="#e6a800" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/** 画面に出すキャラクター1人分。話している間は上下に揺れる */
function CharSlot({
  pos,
  folder,
  emotion,
  speaking,
  talking,
  happy,
}: {
  pos: 'left' | 'right' | 'center'
  folder?: string
  emotion?: Emotion
  speaking: boolean
  talking: boolean
  happy?: boolean
}) {
  return (
    <div className={`novel-char pos-${pos}${speaking ? '' : ' is-silent'}`}>
      <div className={`novel-char-body ${speaking && talking ? 'talking' : ''}`}>
        {folder ? <img src={characterImage(folder, emotion)} alt="" /> : <div className="placeholder">🎅</div>}
        {speaking && happy && (
          <>
            <Sparkle className="sp1" />
            <Sparkle className="sp2" />
          </>
        )}
      </div>
    </div>
  )
}

/** 背景の上にキャラクターを置き、パネルに台詞を1文字ずつ出す */
export default function NovelPart({
  scene,
  onFinish,
  lead,
  endButton,
  onLine,
}: {
  scene: NovelScene
  onFinish: () => void
  /** 登場演出を始めるまでの間（何もない背景を見せる時間 ms）。省略時は短い間 */
  lead?: number
  /** 最後の台詞のあとに出すボタン（押すと次へ進む） */
  endButton?: { label: string; onClick: () => void }
  /** 表示中の台詞が変わったとき */
  onLine?: (line: NovelLine) => void
}) {
  const [leadMs] = useState(lead ?? 500)
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(0)
  const [ready, setReady] = useState(false) // 登場演出が終わったか
  const [skip, setSkip] = useState(false)

  const line = scene.lines[idx]
  const character = line.character ?? scene.character

  useEffect(() => {
    onLine?.(line)
  }, [idx])
  const segs = parse(line.text)
  const total = segs.reduce((n, s) => n + s.t.length, 0)
  const talking = ready && shown < total
  const isLast = idx === scene.lines.length - 1

  useEffect(() => {
    const t = setTimeout(() => setReady(true), leadMs + INTRO_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setShown(0)
    if (!ready) return
    const t = setInterval(() => {
      setShown((s) => {
        if (s >= total) {
          clearInterval(t)
          return s
        }
        return s + 1
      })
    }, CHAR_MS)
    return () => clearInterval(t)
  }, [idx, ready, total])

  const next = () => {
    if (!ready) {
      // 登場演出をスキップ
      setSkip(true)
      setReady(true)
      return
    }
    if (talking) return setShown(total)
    if (isLast && endButton) return // ボタンで進む
    if (idx + 1 < scene.lines.length) {
      // 同じ操作で文字数も0に戻す（別々だと、次の台詞の全文が一瞬出てしまう）
      setShown(0)
      setIdx(idx + 1)
    } else {
      onFinish()
    }
  }

  // 文字数分だけ表示する（強調の色は保つ）
  let left = shown
  const typed = segs.map((s, i) => {
    const part = s.t.slice(0, Math.max(0, left))
    left -= s.t.length
    return part ? (
      <span key={i} className={s.hl ? 'hl' : undefined}>
        {part}
      </span>
    ) : null
  })

  const happy = line.emotion === '喜' || line.emotion === '楽'

  return (
    <div className={`novel${skip ? ' skip' : ''}`} style={{ ['--lead' as string]: `${leadMs}ms` }} onClick={next}>
      {scene.background ? (
        <img className="novel-bg" src={backgroundImage(scene.background)} alt="" />
      ) : (
        <div className="novel-bg placeholder">背景画像</div>
      )}

      {line.banner ? (
        <div className="points-banner">
          【{line.banner}】
          {ready && <div className="next">▼</div>}
        </div>
      ) : (
      <CharSlot
        pos="center"
        folder={character}
        emotion={line.emotion}
        speaking
        talking={talking}
        happy={happy}
      />
      )}

      {!line.banner && <div className="novel-panel">
        <div className="novel-speaker">{line.speaker}</div>
        <div className={`novel-text size-${line.size ?? 'md'}`}>
          {line.image && <img className="novel-panel-img" src={line.image} alt="" />}
          <div className="text">{typed}</div>
        </div>
        {ready && !talking && isLast && endButton ? (
          <button
            className="novel-next-btn"
            onClick={(e) => {
              e.stopPropagation()
              endButton.onClick()
            }}
          >
            {endButton.label}
          </button>
        ) : (
          ready && !talking && <div className="next">▼</div>
        )}
      </div>}
    </div>
  )
}
