import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import AreaEditor from '../components/AreaEditor'
import MoodCard from '../components/MoodCard'
import { characterImage, ST3_MOOD, ST3_NAME, st3GameImage, type Emotion } from '../scenario'
import { DEFAULT_WORD, type TeamDoc, type WordProgress } from '../types'
import { resetWordAreas, saveWordAreas, useWordAreas, wordAreasToCode, type WordArea } from './wordAreas'

/** 「クリア！」を見せる長さ */
const CLEAR_MS = 2600
/** 「せいかい！」「最初から！」を見せる長さ */
const FLASH_MS = 1300

interface Line {
  who: 'elf' | 'kaimei'
  text: string
  emotion?: Emotion
}
const elf = (text: string, emotion?: Emotion): Line => ({ who: 'elf', text, emotion })
const km = (text: string, emotion?: Emotion): Line => ({ who: 'kaimei', text, emotion })

/** ゲーム画面に入ってすぐの、エルフのルール説明 */
const RULE: Line[] = [
  elf('このゲームのルールを説明するよ。'),
  elf('まず、画面に指で押さえる4文字のワードが表示されます。'),
  elf('一人2本ずつ押さえましょう。'),
  elf('次に、現在のワードから一文字変えたワードが表示されます。'),
  elf('そうしたら、変化した単語を指で押さえます。'),
  elf('このとき、変わっていない文字を押さえている指は画面から離してはいけません。'),
  elf('五回連続で成功できたらクリアです。', '楽'),
  elf('説明を見たかったら、後ろにあるラミネートをもらってね。'),
  elf('それでは、1ゲーム目を始めていきましょう。', '楽'),
]
const AFTER_G1: Line[] = [km('すごい！2ゲーム目はもっと難しいよ！', '喜')]
const AFTER_G2: Line[] = [
  km('すごいすごい！', '喜'),
  km('じゃあ次は、実際に部屋でアシでやってみよう！', '楽'),
  km('問題はこれだよ！今回は難しいから、お題は一個だけ！', '楽'),
]
/** 正しい注文を確定した瞬間に止めに入る */
const CHAIR: Line[] = [
  km('さっき部屋で押さえてワードをして遊んでたら、エルフに', '哀'),
  km('椅子に上るのは危ないから今後禁止！', '怒'),
  km('って怒られちゃったんだ。', '哀'),
  km('今注文したものだけでクリアできる予定だったんだけど、どうしよう…', '哀'),
]
const ROOM_GOAL = 'クリアする方法が分かったら部屋に向かってね！'
const CHAIR_GOAL = 'この状況でクリアする方法が分かったら、もう一度注文をして部屋に向かおう。'
const CHAIR_DIALOGS = ['画面に表示されている青い丸は椅子だったようだ。', CHAIR_GOAL]
/** 部屋でやるお題 */
const THEME = 'クリスマスツリー'

interface WordSet {
  /** 最初に押さえるワード（そのまま見せる） */
  start: string
  /** [問題文, 答え]。答えは前のワードから一文字だけ変えたもの */
  steps: [string, string][]
}

const WORD_GAMES: WordSet[] = [
  {
    start: 'ブレンド',
    steps: [
      ['算数で使うもの', 'ブンドキ'],
      ['入れもの', 'ドンブリ'],
      ['きのみ', 'ドングリ'],
      ['部屋のひとつ', 'リビング'],
      ['音が鳴るもの', 'ヨビリン'],
    ],
  },
  {
    start: 'ロッカー',
    steps: [
      ['スポーツの名前', 'サッカー'],
      ['イベントの名前', 'サーカス'],
      ['身に着けるもの', 'スカート'],
      // トーストは「ト」の丸に指が2本乗る
      ['食べ物', 'トースト'],
      ['冬の遊び', 'スケート'],
    ],
  },
]
/** 画像の縦横比（public/BG/Stage3 の画像に合わせる） */
const ASPECT: Record<1 | 2 | 3, string> = { 1: '740 / 505', 2: '746 / 505', 3: '742 / 466' }

/** 文字ごとの数（並び順は問わない） */
function bag(word: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const ch of Array.from(word)) m.set(ch, (m.get(ch) ?? 0) + 1)
  return m
}
function sameBag(a: Map<string, number>, b: Map<string, number>) {
  if (a.size !== b.size) return false
  for (const [k, n] of a) if (b.get(k) !== n) return false
  return true
}

interface Props {
  doc: TeamDoc
  update: (patch: Partial<TeamDoc>) => void
  shopOpen: boolean
  /** 正しい注文が止められた。カイ・メイの話と椅子のダイアログを出す */
  chair: boolean
  onChairDone: () => void
}

/** ステージ3：押さえてワード。4本の指で丸を押さえ、一文字ずつ変えていく */
export default function WordGame({ doc, update, shopOpen, chair, onChairDone }: Props) {
  const word: WordProgress = { ...DEFAULT_WORD, ...doc.word }
  const wordRef = useRef(word)
  wordRef.current = word
  const setStep = (step: WordProgress['step']) => update({ word: { ...wordRef.current, step } })
  const debug = new URLSearchParams(location.search).get('debug') === 'true'

  const game = word.step === 'g2' ? 1 : 0
  const playing = word.step === 'g1' || word.step === 'g2'
  const { areas, saved } = useWordAreas(game)

  // 画面の外（注文ボタン）まで覆うため、会話などはプレイヤー画面の上に出す
  const [host, setHost] = useState<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    setHost(rootRef.current?.closest<HTMLElement>('.screen.player') ?? null)
  }, [])
  const overlay = (node: ReactNode) => (host ? createPortal(node, host) : null)

  // ---------- 会話とダイアログ ----------
  const [talk, setTalk] = useState<{ lines: Line[]; idx: number; then?: () => void } | null>(null)
  const [dialog, setDialog] = useState<{ texts: string[]; idx: number; then?: () => void } | null>(null)
  const [mood, setMood] = useState(false)
  const [clearFx, setClearFx] = useState(false)

  // ルール説明（入り直したときも、説明が済んでいなければ最初から）
  useEffect(() => {
    if (word.step === 'rule') setTalk({ lines: RULE, idx: 0, then: () => setStep('g1') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.step === 'rule'])

  // 正しい注文を止めに入る
  useEffect(() => {
    if (!chair) return
    setTalk({
      lines: CHAIR,
      idx: 0,
      then: () => setDialog({ texts: CHAIR_DIALOGS, idx: 0, then: onChairDone }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chair])

  const nextTalk = () => {
    if (!talk) return
    if (talk.idx + 1 < talk.lines.length) return setTalk({ ...talk, idx: talk.idx + 1 })
    setTalk(null)
    talk.then?.()
  }
  const nextDialog = () => {
    if (!dialog) return
    if (dialog.idx + 1 < dialog.texts.length) return setDialog({ ...dialog, idx: dialog.idx + 1 })
    setDialog(null)
    dialog.then?.()
  }

  const onClear = () => {
    const second = wordRef.current.step === 'g2'
    setClearFx(true)
    setTimeout(() => {
      setClearFx(false)
      if (second)
        setTalk({
          lines: AFTER_G2,
          idx: 0,
          then: () => {
            setStep('room')
            setDialog({ texts: [ROOM_GOAL], idx: 0 })
          },
        })
      else setTalk({ lines: AFTER_G1, idx: 0, then: () => setStep('g2') })
    }, CLEAR_MS)
  }

  // ---------- エリア編集（?debug=true） ----------
  const [editing, setEditing] = useState(false)

  const line = talk?.lines[talk.idx]
  const busy = !!talk || !!dialog || clearFx || mood

  let view: ReactNode
  if (editing && playing) {
    view = (
      <AreaEditor
        areas={areas}
        saved={saved}
        image={st3GameImage(game === 1 ? 2 : 1)}
        aspect={ASPECT[game === 1 ? 2 : 1]}
        round
        boxLabel={(a) => a.label}
        onSave={(next) => saveWordAreas(game, next)}
        onReset={() => resetWordAreas(game)}
        toCode={(next) => wordAreasToCode(game, next)}
        codeHint={`wordAreas.ts の DEFAULT_WORD_AREAS_${game + 1} に貼れます`}
        onClose={() => setEditing(false)}
      />
    )
  } else if (playing) {
    view = (
      <WordBoard
        key={game}
        label={`${game + 1}ゲーム目`}
        set={WORD_GAMES[game]}
        areas={areas}
        image={st3GameImage(game === 1 ? 2 : 1)}
        aspect={ASPECT[game === 1 ? 2 : 1]}
        debug={debug}
        paused={busy}
        onClear={onClear}
      />
    )
  } else if (word.step === 'room') {
    view = (
      <div className="word-room">
        <div className="word-head">
          <div className="word-theme">
            お題<b>{THEME}</b>
          </div>
          <div className="word-sub">{word.chairTold ? CHAIR_GOAL : ROOM_GOAL}</div>
        </div>
        <div className="word-field">
          <div className="word-stage" style={{ aspectRatio: ASPECT[3] }}>
            <img className="hide-bg" src={st3GameImage(3)} alt="" />
          </div>
        </div>
      </div>
    )
  } else {
    // ルール説明中は1ゲーム目の画面を見せておく（触れない）
    view = (
      <div className="word-room">
        <div className="word-field">
          <div className="word-stage" style={{ aspectRatio: ASPECT[1] }}>
            <img className="hide-bg" src={st3GameImage(1)} alt="" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="word-game" ref={rootRef}>
      {view}

      {!editing && word.step !== 'rule' && (
        <button className="mood-heart word-heart" aria-label="カイ・メイのキモチ" onClick={() => setMood(true)}>
          <span />
        </button>
      )}

      {debug && playing && !busy && (
        <button className="hide-edit-btn" onClick={() => setEditing((e) => !e)}>
          {editing ? 'ゲームに戻る' : 'エリア編集'}
        </button>
      )}

      {clearFx && (
        <div className="word-clear">
          <div className="word-clear-ring" />
          <div className="word-clear-ring is-late" />
          <div className="word-clear-text">クリア！</div>
        </div>
      )}

      {mood && <MoodCard mood={ST3_MOOD} onClose={() => setMood(false)} />}

      {line &&
        overlay(
          <>
            <div className="hide-catch" onClick={nextTalk} />
            <div className={`hide-elf${shopOpen ? ' is-compact' : ''}`} key={`${talk?.lines[0]?.text}${talk?.idx}`}>
              <img
                src={line.who === 'elf' ? characterImage('Common', line.emotion ?? '真顔') : characterImage('Stage3', line.emotion ?? '真顔')}
                alt=""
              />
              <p>
                <span>{line.who === 'elf' ? 'エルフ' : ST3_NAME}</span>
                {line.text}
                <i>▼</i>
              </p>
            </div>
          </>,
        )}

      {dialog &&
        overlay(
          <div className="hide-goal-back">
            <div className="hide-goal word-goal" key={dialog.idx}>
              <p>{dialog.texts[dialog.idx]}</p>
              <button onClick={nextDialog}>OK</button>
            </div>
          </div>,
        )}
    </div>
  )
}

interface BoardProps {
  label: string
  set: WordSet
  areas: WordArea[]
  image: string
  aspect: string
  debug: boolean
  /** 会話などが出ている間は、触っても判定しない */
  paused: boolean
  onClear: () => void
}

/**
 * 押さえてワードの盤面。指（ポインター）がどの丸に乗っているかを数えて判定する。
 * ・最初のワードを4本で押さえるとスタート
 * ・次のワードと同じ文字の組み合わせになったら成功。5回成功でクリア
 * ・変わらない文字の指が離れたら、最初のワードからやり直し
 * ?debug=true のときは、マウスのクリックで指を置く・外すを切り替えられる（Shift+クリックで同じ丸に2本目）
 */
function WordBoard({ label, set, areas, image, aspect, debug, paused, onClear }: BoardProps) {
  const words = useMemo(() => [set.start, ...set.steps.map((s) => s[1])], [set])
  const stageRef = useRef<HTMLDivElement>(null)
  // ポインター → 乗っている丸の id（丸の外なら null）
  const fingers = useRef(new Map<string, string | null>())
  const [held, setHeld] = useState<string[]>([])
  // 次に押さえるワードの番号（0=最初のワード）
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  const [flash, setFlash] = useState<{ kind: 'start' | 'ok' | 'miss'; n: number } | null>(null)
  const done = useRef(false)
  const areasRef = useRef(areas)
  areasRef.current = areas
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), FLASH_MS)
    return () => clearTimeout(t)
  }, [flash])

  const go = (i: number) => {
    idxRef.current = i
    setIdx(i)
  }

  const hit = (clientX: number, clientY: number): string | null => {
    const el = stageRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * 100
    const py = ((clientY - r.top) / r.height) * 100
    // 丸（楕円）の中か
    const a = areasRef.current.find((a) => {
      const dx = (px - (a.x + a.w / 2)) / (a.w / 2)
      const dy = (py - (a.y + a.h / 2)) / (a.h / 2)
      return dx * dx + dy * dy <= 1
    })
    return a?.id ?? null
  }

  const evaluate = () => {
    setHeld([...fingers.current.values()].filter((v): v is string => !!v))
    if (done.current || pausedRef.current) return
    const letterOf = new Map(areasRef.current.map((a) => [a.id, a.label]))
    const counts = new Map<string, number>()
    for (const id of fingers.current.values()) {
      const l = id ? letterOf.get(id) : undefined
      if (l) counts.set(l, (counts.get(l) ?? 0) + 1)
    }
    const i = idxRef.current
    const target = bag(words[i])
    if (sameBag(counts, target)) {
      if (i === words.length - 1) {
        done.current = true
        go(i + 1)
        onClear()
        return
      }
      go(i + 1)
      setFlash({ kind: i === 0 ? 'start' : 'ok', n: Date.now() })
      return
    }
    if (i === 0) return
    // 変わらない文字は、押さえたままでないといけない
    const cur = bag(words[i - 1])
    for (const [l, n] of cur) {
      const keep = Math.min(n, target.get(l) ?? 0)
      if ((counts.get(l) ?? 0) < keep) {
        go(0)
        setFlash({ kind: 'miss', n: Date.now() })
        return
      }
    }
  }

  const down = (e: React.PointerEvent) => {
    e.preventDefault()
    if (debug && e.pointerType === 'mouse') {
      // クリックで置く・外す。Shift+クリックは同じ丸にもう1本置く（トーストの「ト」用）
      const id = hit(e.clientX, e.clientY)
      if (!id) return
      const mine = [...fingers.current.keys()].filter((k) => k.startsWith(`m${id}:`))
      if (mine.length && !e.shiftKey) fingers.current.delete(mine[mine.length - 1])
      else fingers.current.set(`m${id}:${Date.now()}`, id)
      evaluate()
      return
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 取れなくても判定はできる */
    }
    fingers.current.set(`p${e.pointerId}`, hit(e.clientX, e.clientY))
    evaluate()
  }
  const move = (e: React.PointerEvent) => {
    const k = `p${e.pointerId}`
    if (!fingers.current.has(k)) return
    const id = hit(e.clientX, e.clientY)
    if (fingers.current.get(k) === id) return
    fingers.current.set(k, id)
    evaluate()
  }
  const up = (e: React.PointerEvent) => {
    if (fingers.current.delete(`p${e.pointerId}`)) evaluate()
  }

  const cleared = idx >= words.length
  const step = Math.min(idx, words.length - 1)
  const success = Math.max(0, Math.min(idx, words.length) - 1)
  const heldSet = new Set(held)

  return (
    <div className="word-room">
      <div className="word-head">
        <div className="word-label">{label}</div>
        {idx === 0 ? (
          <div className="word-prompt">
            <small>押さえるワード</small>
            <b>{set.start}</b>
          </div>
        ) : (
          <div className="word-prompt">
            {!cleared && <small>問題</small>}
            <b>{cleared ? 'クリア！' : set.steps[step - 1][0]}</b>
          </div>
        )}
        <div className="word-progress" aria-label={`${success}回成功`}>
          {set.steps.map((_, i) => (
            <i key={i} className={i < success ? 'is-on' : ''} />
          ))}
        </div>
      </div>
      <div className="word-sub">
        {idx === 0
          ? '一人2本ずつ、4本の指で押さえよう'
          : cleared
            ? ''
            : `いまのワード「${words[step - 1]}」から一文字だけ変えて押さえよう。変わらない文字の指は離さないでね`}
      </div>
      <div className="word-field">
        <div
          className="word-stage is-play"
          ref={stageRef}
          style={{ aspectRatio: aspect }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={(e) => e.preventDefault()}
        >
          <img className="hide-bg" src={image} alt="" draggable={false} />
          {areas.map((a) => (
            <div
              key={a.id}
              className={`word-spot${heldSet.has(a.id) ? ' is-held' : ''}${debug ? ' is-debug' : ''}`}
              style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%` }}
            >
              {debug && <span>{a.label}</span>}
            </div>
          ))}
        </div>
      </div>
      {flash && (
        <div className={`word-flash is-${flash.kind}`} key={flash.n}>
          {flash.kind === 'start' ? 'スタート！' : flash.kind === 'ok' ? 'せいかい！' : '指が離れちゃった！最初からやり直し'}
        </div>
      )}
    </div>
  )
}
