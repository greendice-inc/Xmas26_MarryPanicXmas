import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import AreaEditor from '../components/AreaEditor'
import MoodCard from '../components/MoodCard'
import type { SzGuide, SzTab } from '../components/Santazon'
import { useProducts } from '../santazon/useProducts'
import { characterImage, MANNEQUIN_IMAGE, RECORDS, ST2_KIDS, ST2_MOOD, st2GameImage, type Emotion } from '../scenario'
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
/** ダミーに引っかかった演出の長さ */
const TRICK_MS = 2800

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
      'それから、セーターの番号は2-0-5-4だよ！',
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
  tommy: { lines: ['あ！ひっかかった！'], hint: [] },
}

/** 見つけた人数 → 次に探す子と、その子が正解になる条件の商品 */
/** 最後の正解はトミーではなくダミー（引っかかる）。そのあとトミーが出てくる */
const TARGETS: { role: 'amy' | 'jimmy' | 'dummy'; item: string }[] = [
  { role: 'amy', item: 'マネキン' },
  { role: 'jimmy', item: 'セーター' },
  { role: 'dummy', item: 'オーバーオール' },
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
  // ダミーに引っかかったときの演出
  const [trick, setTrick] = useState(false)
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
  if (found >= 3) foundRoles.add('tommy')
  const visibleAreas = areas.filter((a) => !foundRoles.has(a.role))

  const pick = (area: HideArea) => {
    if (tutorial || celebrate || trick || talk || found >= 3) return
    const target = TARGETS[found]
    const ready = searchedNames.has(target.item)
    if (!ready && found > 0) return setElfSays('正解が確実にわかってから選ぼう。')
    if (!ready || area.role !== target.role) return setElfSays('本当にそれで大丈夫…？')
    if (target.role === 'dummy') {
      // マネキンの画像を真ん中に出して「ひっかかった！」。そのあとトミーが出てくる
      setTrick(true)
      setTimeout(() => {
        setTrick(false)
        update({ hide: { ...hide, found: found + 1 } })
        setTalk({ role: 'tommy', lines: FOUND_TALK.tommy.lines, idx: 0 })
      }, TRICK_MS)
      return
    }
    const role = target.role
    setCelebrate(area)
    setTimeout(() => {
      setCelebrate(null)
      update({ hide: { ...hide, found: found + 1 } })
      const t = FOUND_TALK[role]
      setTalk({ role, lines: t.lines, idx: 0, banner: t.banner })
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
        <AreaEditor
          areas={areas}
          saved={saved}
          image={st2GameImage(found)}
          aspect="1980 / 1200"
          boxLabel={(a) => `${a.label}（${ROLE_LABEL[a.role]}）`}
          boxClass={(a) => `role-${a.role}`}
          fields={(sel, edit) => (
            <label>
              隠れている子
              <select value={sel.role} onChange={(e) => edit({ role: e.target.value as HideRole })}>
                {(Object.keys(ROLE_LABEL) as HideRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </label>
          )}
          onSave={saveHideAreas}
          onReset={resetHideAreas}
          toCode={areasToCode}
          codeHint="hideAreas.ts の DEFAULT_HIDE_AREAS に貼れます"
          onClose={() => setEditing(false)}
        />
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

      {trick && (
        <div className="hide-trick">
          <img src={MANNEQUIN_IMAGE} alt="" />
          <div className="hide-trick-text">ひっかかった！</div>
        </div>
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
