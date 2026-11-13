import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import MoodCard from '../components/MoodCard'
import type { SzGuide, SzTab } from '../components/Santazon'
import { useProducts } from '../santazon/useProducts'
import { characterImage, RECORDS, ST2_KIDS, ST2_MOOD, st2GameImage, type Emotion } from '../scenario'
import type { HideProgress, TeamDoc } from '../types'
import {
  areasToCode,
  resetHideAreas,
  ROLE_LABEL,
  saveHideAreas,
  useHideAreas,
  type HideArea,
  type HideRole,
} from './hideAreas'

/** 「みーつけた！」を見せる長さ */
const FOUND_MS = 1800
const CARD_ID = 'st2-card'

/** 案内が求める操作。tap=タップで次へ / shop=注文を開く / tab=リスト追加検索を押す */
type Wait = 'tap' | 'shop' | 'tab'

interface TutorialLine {
  text: string
  emotion?: Emotion
  wait: Wait
  /** card=商品カードを中央に出す / fly=カードを「記録」へ吸い込ませる */
  card?: 'show' | 'fly'
}

/** Santazon のリスト追加検索の使い方。エルフがゲーム画面の上で話す */
const TUTORIAL: TutorialLine[] = [
  { text: 'アミーはマネキンにはできないポーズをしているみたい。', wait: 'tap' },
  { text: 'マネキンについて詳しく調べられるといいんだけど…', emotion: '哀', wait: 'tap' },
  { text: 'そうだ！Santazonのリスト追加機能を使いましょう！', emotion: '楽', wait: 'tap' },
  { text: 'まずはSantazonの画面を開いてね。', wait: 'shop' },
  { text: '次に新しく増えたリスト追加検索を押そう。', wait: 'tab' },
  { text: 'ここに、この画面からリストにマネキンを追加すれば、マネキンのことを調べられるはず！', wait: 'tap' },
  { text: 'ここから追加したアイテムは「検索済みリスト」に追加されるよ。', wait: 'tap' },
  { text: 'マネキンの商品番号は…さっき見たこれだね。', wait: 'tap', card: 'show' },
  { text: 'この画像はいつでも見れるように「記録」の中に入れておきますね。', emotion: '楽', wait: 'tap', card: 'fly' },
]
const SHOP_STEP = TUTORIAL.findIndex((l) => l.wait === 'shop')
const TAB_STEP = TUTORIAL.findIndex((l) => l.wait === 'tab')

/** 見つけられた子の台詞。hint は右下のアイコンから聞き直せる部分 */
const FOUND_TALK: Record<'amy' | 'jimmy' | 'tommy', { lines: string[]; hint: number[]; banner?: string }> = {
  amy: {
    lines: [
      '見つかっちゃった！',
      'じゃあ楽しかったから、ジミーを見つけるためのヒントあげるね！',
      'ジミーはマネキンに着せたセーターと同じ色の服を着てるよ！',
      'それから、セーターの番号は2-3-2-3だよ！',
      'もう一回聞きたかったら右下の僕のアイコンをクリックしてね！',
    ],
    hint: [2, 3],
    banner: 'ジミーを見つけよう。',
  },
  jimmy: {
    lines: [
      '見つかっちゃった！',
      'じゃあ楽しかったから、トミーを見つけるためのヒントあげるね！',
      '僕らが買ったものは「マネキン」「セーター」「オーバーオール」の三つだよ！',
      'オーバーオールの番号は…忘れちゃった！',
      'もう一回聞きたかったら右下の僕のアイコンをクリックしてね！',
    ],
    hint: [2, 3],
    banner: 'リスト追加検索を使ってトミーを見つけよう。',
  },
  tommy: { lines: ['見つかっちゃった！'], hint: [] },
}

/** 見つけた人数 → 次に探す子と、その子が正解になる条件の商品 */
const TARGETS: { role: 'amy' | 'jimmy' | 'tommy'; item: string }[] = [
  { role: 'amy', item: 'マネキン' },
  { role: 'jimmy', item: 'セーター' },
  { role: 'tommy', item: 'オーバーオール' },
]

interface Props {
  doc: TeamDoc
  update: (patch: Partial<TeamDoc>) => void
  shopOpen: boolean
  szTab: SzTab
  /** 案内で目立たせる場所（注文ボタン・Santazon の中） */
  onGuide: (g: { menu: boolean; sz: SzGuide | null }) => void
  /** トミーまで見つけて、最後の台詞を読み終えた */
  onAllFound: () => void
}

/** ステージ2：かくれんぼ。ゲーム画面の隠れ場所をタップして三兄弟を見つける */
export default function HideSeek({ doc, update, shopOpen, szTab, onGuide, onAllFound }: Props) {
  const { products } = useProducts()
  const { areas, saved } = useHideAreas()
  const hide: HideProgress = { tutorialDone: false, found: 0, ...doc.hide }
  const found = Math.min(3, hide.found)
  const debug = new URLSearchParams(location.search).get('debug') === 'true'

  // 検索済みリストに入っている商品の名前
  const searchedNames = new Set(doc.searched.map((id) => products.find((p) => p.id === id)?.name).filter(Boolean))

  // ---------- エルフの案内 ----------
  const [step, setStep] = useState(0)
  // 案内が終わったあと、真ん中に出す「やること」のダイアログ
  const [goal, setGoal] = useState(false)
  const tutorial = !hide.tutorialDone
  const line = tutorial ? TUTORIAL[step] : undefined

  // 画面の外（注文ボタン）まで覆うため、案内などはプレイヤー画面の上に出す
  const [host, setHost] = useState<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    setHost(rootRef.current?.closest<HTMLElement>('.screen.player') ?? null)
  }, [])

  // 操作を待つ台詞は、その操作がされたら次へ
  useEffect(() => {
    if (!line) return
    if (line.wait === 'shop' && shopOpen) setStep(step + 1)
    if (line.wait === 'tab' && shopOpen && szTab === 'search') setStep(step + 1)
  })

  // 途中で Santazon を閉じたら、開くところからやり直す
  useEffect(() => {
    if (!tutorial || step <= SHOP_STEP) return
    if (!shopOpen) setStep(SHOP_STEP)
    else if (step > TAB_STEP && szTab !== 'search') setStep(TAB_STEP)
  }, [tutorial, step, shopOpen, szTab])

  // リスト追加検索のタブは、押すように言うところで出てくる
  useEffect(() => {
    if (tutorial && step >= TAB_STEP && !doc.searchUnlocked) update({ searchUnlocked: true })
  }, [tutorial, step, doc.searchUnlocked, update])

  useEffect(() => {
    onGuide({
      menu: !!line && line.wait === 'shop',
      sz: line?.wait === 'tab' ? 'tab' : line && step > TAB_STEP ? 'talk' : null,
    })
  }, [line, step, onGuide])
  useEffect(() => () => onGuide({ menu: false, sz: null }), [onGuide])

  const tapTutorial = () => {
    if (!line || line.wait !== 'tap') return
    if (line.card === 'fly') {
      const records = doc.records ?? []
      if (!records.includes(CARD_ID)) update({ records: [...records, CARD_ID] })
    }
    if (step + 1 < TUTORIAL.length) setStep(step + 1)
    else {
      update({ hide: { ...hide, tutorialDone: true } })
      setGoal(true)
    }
  }

  // カードが「記録」ボタンへ飛んでいく先（プレイヤー画面の座標）
  const [flyTo, setFlyTo] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    if (line?.card !== 'fly' || !host) return setFlyTo(null)
    const btn = host.querySelector<HTMLElement>('[data-menu="記録"]')
    if (!btn) return setFlyTo(null)
    const r = host.getBoundingClientRect()
    const s = r.width / host.offsetWidth
    const b = btn.getBoundingClientRect()
    setFlyTo({ x: (b.left + b.width / 2 - r.left) / s - host.offsetWidth / 2, y: (b.top + b.height / 2 - r.top) / s - host.offsetHeight / 2 })
  }, [line, host])

  // ---------- 見つける ----------
  const [elfSays, setElfSays] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState<HideArea | null>(null)
  const [talk, setTalk] = useState<{ role: 'amy' | 'jimmy' | 'tommy'; lines: string[]; idx: number; banner?: string } | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [mood, setMood] = useState(false)

  // トミーまで見つけた状態で入り直したら、最後の台詞からやり直す
  useEffect(() => {
    if (found >= 3 && !talk) setTalk({ role: 'tommy', lines: FOUND_TALK.tommy.lines, idx: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 見つけた子の場所は消す
  const foundRoles = new Set<string>(TARGETS.slice(0, found).map((t) => t.role))
  const visibleAreas = areas.filter((a) => !foundRoles.has(a.role))

  const pick = (area: HideArea) => {
    if (tutorial || celebrate || talk || found >= 3) return
    const target = TARGETS[found]
    const ready = searchedNames.has(target.item)
    if (!ready && found > 0) return setElfSays('正解が確実にわかってから選ぼう。')
    if (!ready || area.role !== target.role) return setElfSays('本当にそれで大丈夫…？')
    setCelebrate(area)
    setTimeout(() => {
      setCelebrate(null)
      update({ hide: { ...hide, found: found + 1 } })
      const t = FOUND_TALK[target.role]
      setTalk({ role: target.role, lines: t.lines, idx: 0, banner: t.banner })
    }, FOUND_MS)
  }

  const nextTalk = () => {
    if (!talk) return
    if (talk.idx + 1 < talk.lines.length) return setTalk({ ...talk, idx: talk.idx + 1 })
    setTalk(null)
    if (talk.banner) setBanner(talk.banner)
    if (talk.role === 'tommy') onAllFound()
  }

  // 右下のアイコン：最後に見つけた子（トミーは除く）
  const lastKid = found === 1 ? 'amy' : found === 2 ? 'jimmy' : null
  const replayHint = () => {
    if (!lastKid) return
    const t = FOUND_TALK[lastKid]
    setTalk({ role: lastKid, lines: t.hint.map((i) => t.lines[i]), idx: 0 })
  }

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 3000)
    return () => clearTimeout(t)
  }, [banner])

  // ---------- エリア編集（?debug=true） ----------
  const [editing, setEditing] = useState(false)

  const overlay = (node: ReactNode) => (host ? createPortal(node, host) : null)
  const compact = shopOpen

  return (
    <div className="hide-seek" ref={rootRef}>
      {editing ? (
        <AreaEditor areas={areas} saved={saved} image={st2GameImage(found)} onClose={() => setEditing(false)} />
      ) : (
        <div className="hide-stage">
          <img className="hide-bg" src={st2GameImage(found)} alt="" />
          {visibleAreas.map((a) => (
            <button
              key={a.id}
              className={`hide-area${debug ? ' is-debug' : ''}`}
              style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%` }}
              aria-label={a.label}
              onClick={() => pick(a)}
            >
              {debug && <span>{a.label}（{ROLE_LABEL[a.role]}）</span>}
            </button>
          ))}
          {celebrate && (
            <div
              className="hide-found"
              style={{ left: `${celebrate.x + celebrate.w / 2}%`, top: `${celebrate.y + celebrate.h / 2}%` }}
            >
              <div className="hide-found-ring" />
              <div className="hide-found-text">みーつけた！</div>
            </div>
          )}
        </div>
      )}

      {!editing && !tutorial && (
        <>
          {lastKid && (
            <button className="hide-kid-icon" onClick={replayHint} aria-label={`${ST2_KIDS[lastKid].name}のヒント`}>
              <img src={ST2_KIDS[lastKid].image} alt="" />
            </button>
          )}
          <button className="mood-heart hide-heart" aria-label="三人のキモチ" onClick={() => setMood(true)}>
            <span />
          </button>
        </>
      )}

      {debug && !tutorial && (
        <button className="hide-edit-btn" onClick={() => setEditing((e) => !e)}>
          {editing ? 'ゲームに戻る' : 'エリア編集'}
        </button>
      )}

      {banner && (
        <div className="hide-banner" key={banner} onClick={() => setBanner(null)}>
          {banner}
        </div>
      )}

      {mood && <MoodCard mood={ST2_MOOD} onClose={() => setMood(false)} />}

      {line &&
        overlay(
          <>
            {line.wait === 'tap' && <div className="hide-catch" onClick={tapTutorial} />}
            {line.card && (
              <img
                key={line.card}
                className={`hide-card${line.card === 'fly' ? ' is-fly' : ''}`}
                src={RECORDS[CARD_ID].image}
                alt=""
                style={flyTo ? { ['--fx' as string]: `${flyTo.x}px`, ['--fy' as string]: `${flyTo.y}px` } : undefined}
              />
            )}
            <div className={`hide-elf${compact ? ' is-compact' : ''}${line.wait === 'tap' ? '' : ' is-wait'}`} key={step}>
              <img src={characterImage('Common', line.emotion ?? '真顔')} alt="" />
              <p>
                <span>エルフ</span>
                {line.text}
                {line.wait === 'tap' && <i>▼</i>}
              </p>
            </div>
          </>,
        )}

      {goal &&
        overlay(
          <div className="hide-goal-back">
            <div className="hide-goal">
              <p>マネキンをリストに追加して、アミーを見つけよう！</p>
              <button onClick={() => setGoal(false)}>OK</button>
            </div>
          </div>,
        )}

      {elfSays &&
        overlay(
          <div className="sz-elf-back hide-elf-back" onClick={() => setElfSays(null)}>
            <div className="sz-elf-line">
              <img src={characterImage('Common', '哀')} alt="" />
              <p>
                <span>エルフ</span>
                {elfSays}
              </p>
            </div>
          </div>,
        )}

      {talk &&
        overlay(
          <div className="sz-elf-back hide-elf-back" onClick={nextTalk}>
            <div className="sz-elf-line hide-kid-line" key={`${talk.role}${talk.idx}`}>
              <img src={ST2_KIDS[talk.role].image} alt="" />
              <p>
                <span>{ST2_KIDS[talk.role].name}</span>
                {talk.lines[talk.idx]}
                <i>▼</i>
              </p>
            </div>
          </div>,
        )}
    </div>
  )
}

/** タップできる場所を、ドラッグで動かす・右下の角で大きさを変える */
function AreaEditor({ areas, saved, image, onClose }: { areas: HideArea[]; saved: boolean; image: string; onClose: () => void }) {
  const [draft, setDraft] = useState<HideArea[]>(areas)
  const [selected, setSelected] = useState<string | null>(areas[0]?.id ?? null)
  const [status, setStatus] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; mode: 'move' | 'size'; px: number; py: number; start: HideArea } | null>(null)

  // 保存が他の端末から届いたら、編集前の状態だけ合わせる
  const dirty = JSON.stringify(draft) !== JSON.stringify(areas)
  useEffect(() => {
    if (!dirty) setDraft(areas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas])

  const down = (id: string, mode: 'move' | 'size') => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const start = draft.find((a) => a.id === id)!
    drag.current = { id, mode, px: e.clientX, py: e.clientY, start }
    setSelected(id)
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    const el = stageRef.current
    if (!d || !el) return
    const r = el.getBoundingClientRect()
    const dx = ((e.clientX - d.px) / r.width) * 100
    const dy = ((e.clientY - d.py) / r.height) * 100
    const s = d.start
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
    const next =
      d.mode === 'move'
        ? { ...s, x: clamp(s.x + dx, 0, 100 - s.w), y: clamp(s.y + dy, 0, 100 - s.h) }
        : { ...s, w: clamp(s.w + dx, 2, 100 - s.x), h: clamp(s.h + dy, 2, 100 - s.y) }
    setDraft((all) => all.map((a) => (a.id === d.id ? next : a)))
  }
  const up = () => {
    drag.current = null
  }

  const edit = (id: string, patch: Partial<HideArea>) => setDraft((all) => all.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const sel = draft.find((a) => a.id === selected)

  const save = async () => {
    setStatus('保存中…')
    try {
      await saveHideAreas(draft)
      setStatus('保存しました（全端末に反映されます）')
    } catch {
      setStatus('保存できませんでした。Firestore のルール（config）を確認してください')
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(areasToCode(draft))
      setStatus('コードをコピーしました（hideAreas.ts の DEFAULT_HIDE_AREAS に貼れます）')
    } catch {
      setStatus('コピーできませんでした')
    }
  }
  const reset = async () => {
    try {
      await resetHideAreas()
      setStatus('保存を消して、初期値に戻しました')
    } catch {
      setStatus('戻せませんでした')
    }
  }

  return (
    <div className="area-editor" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="hide-stage" ref={stageRef}>
        <img className="hide-bg" src={image} alt="" />
        {draft.map((a) => (
          <div
            key={a.id}
            className={`area-box role-${a.role}${a.id === selected ? ' is-on' : ''}`}
            style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%` }}
            onPointerDown={down(a.id, 'move')}
          >
            <span>{a.label}（{ROLE_LABEL[a.role]}）</span>
            <i onPointerDown={down(a.id, 'size')} />
          </div>
        ))}
      </div>
      <div className="area-panel">
        <h3>タップエリアの調整</h3>
        <p>枠をドラッグで移動、右下の■で大きさを変えます。{saved ? '（保存済みの位置を表示中）' : '（初期値を表示中）'}</p>
        {sel && (
          <div className="area-fields">
            <label>
              名前
              <input value={sel.label} onChange={(e) => edit(sel.id, { label: e.target.value })} />
            </label>
            <label>
              隠れている子
              <select value={sel.role} onChange={(e) => edit(sel.id, { role: e.target.value as HideRole })}>
                {(Object.keys(ROLE_LABEL) as HideRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </label>
            <small>
              x {sel.x.toFixed(1)}% / y {sel.y.toFixed(1)}% / 幅 {sel.w.toFixed(1)}% / 高さ {sel.h.toFixed(1)}%
            </small>
          </div>
        )}
        <div className="area-actions">
          <button onClick={save} disabled={!dirty && saved}>保存</button>
          <button onClick={() => setDraft(areas)} disabled={!dirty}>編集を取り消す</button>
          <button onClick={copy}>コードをコピー</button>
          <button onClick={reset} disabled={!saved}>初期値に戻す</button>
          <button onClick={onClose}>閉じる</button>
        </div>
        {status && <div className="area-status">{status}</div>}
      </div>
    </div>
  )
}
