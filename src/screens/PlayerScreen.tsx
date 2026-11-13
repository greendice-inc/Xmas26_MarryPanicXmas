import { useCallback, useEffect, useRef, useState } from 'react'
import Dots from '../components/Dots'
import GameMenu from '../components/GameMenu'
import KidsRoom from '../components/KidsRoom'
import Logo from '../components/Logo'
import NovelPart from '../components/NovelPart'
import ProblemDialog from '../components/ProblemDialog'
import Santazon, { type SzGuide, type SzTab } from '../components/Santazon'
import HideSeek from '../games/HideSeek'
import WordGame from '../games/WordGame'
import { GAME_COUNT, KV_IMAGE, ROOM_BY_TEAM } from '../config'
import { GAMES } from '../games'
import { useTeam } from '../net/hooks'
import { isCorrectCart, isGame1LoseCart, ORDER_STAGES, PROBLEMS } from '../santazon/products'
import { useProducts } from '../santazon/useProducts'
import { useScriptScene } from '../script/scriptData'
import { CLEAR, ENDING, NOVEL, RECORDS, characterImage } from '../scenario'
import { adultWaitMs, setAdultSkip } from '../adultWait'
import { DEFAULT_WORD, type OrderItem } from '../types'

/** 正しい3点を注文してから、届いたポップアップが出るまで */
const DELIVER_MS = 3000
const STAGE1_TASK = '失格にならないように、1点を下回って勝負に負ける。'

/** 暗転からのフェードインの長さ（styles.css の .fade-black と合わせる） */
const FADE_MS = 2500
/** 場面転換で暗くなるまで（styles.css の .fade-to-black と合わせる） */
const BLACKOUT_MS = 600
/** かくれんぼのステージ */
const HIDE_STAGE = 2
/** 押さえてワードのステージ */
const WORD_STAGE = 3

const hideImg = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none'
}

export default function PlayerScreen({ team }: { team: number }) {
  const { products } = useProducts()
  const [doc, update, loaded] = useTeam(team)
  // セリフ編集で保存したセリフ（無ければコードのまま）
  const edited = useScriptScene(doc.stage, doc.phase)
  // 「はじめから／つづきから」を選んだか（再接続・リセット後は再び選ばせる）
  const [entered, setEntered] = useState(false)

  // フタが外れた瞬間に、暗転 → フェードインで会話を始める
  const [fading, setFading] = useState(false)
  // （会話パートが作られる前に fading を true にしたいので、描画中に判定する）
  const [prevLocked, setPrevLocked] = useState(doc.locked)
  if (prevLocked !== doc.locked) {
    setPrevLocked(doc.locked)
    if (entered && prevLocked && !doc.locked) setFading(true)
  }

  // マスターが全端末リセットしたら、「はじめから」を押した直後の状態（フタ待機）に戻る
  const seenReset = useRef<{ v: number | undefined } | null>(null)
  useEffect(() => {
    if (!loaded) return
    if (seenReset.current && doc.resetAt !== seenReset.current.v) {
      setEntered(true)
      setFading(false)
      setShopOpen(false)
      setCart([])
      setLocalProceedAt(null)
      setTaskOpen(false)
      setRecordsOpen(false)
      setClearNext(null)
      setChair(false)
      advancing.current = false
    }
    seenReset.current = { v: doc.resetAt }
  }, [doc.resetAt, loaded])

  // シーンジャンプしたら、手元の注文操作も消して、飛んだシーンから入る
  const seenEnter = useRef<{ v: number | undefined } | null>(null)
  useEffect(() => {
    if (!loaded) return
    if (seenEnter.current && doc.enterAt !== seenEnter.current.v) {
      setEntered(true)
      setFading(false)
      setShopOpen(false)
      setCart([])
      setLocalProceedAt(null)
      setTaskOpen(false)
      setClosedDeliveryAt(null)
      setRecordsOpen(false)
      setClearNext(null)
      setChair(false)
      advancing.current = false
    }
    seenEnter.current = { v: doc.enterAt }
  }, [doc.enterAt, loaded])

  // Santazon（注文画面）
  const [shopOpen, setShopOpen] = useState(false)
  const [szTab, setSzTab] = useState<SzTab>('list')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [recordsOpen, setRecordsOpen] = useState(false)
  // ステージ2の案内で目立たせる場所
  const [guide, setGuide] = useState<{ menu: boolean; sz: SzGuide | null }>({ menu: false, sz: null })
  const onGuide = useCallback(
    (g: { menu: boolean; sz: SzGuide | null }) => setGuide((p) => (p.menu === g.menu && p.sz === g.sz ? p : g)),
    [],
  )
  // クリアの会話を読み終えて「タップで次のステージ」を出しているステージ
  const [clearNext, setClearNext] = useState<number | null>(null)
  // ステージ3：正しい注文が止められて、カイ・メイが椅子の話をしている
  const [chair, setChair] = useState(false)
  // 場面転換：暗くしてから切り替え、フェードインで戻す
  const [blackout, setBlackout] = useState(false)
  const [fadeQuick, setFadeQuick] = useState(false)
  const blackoutThen = useRef<(() => void) | null>(null)
  const fadeThen = (fn: () => void) => {
    if (blackoutThen.current) return
    blackoutThen.current = fn
    setBlackout(true)
  }
  useEffect(() => {
    if (!blackout) return
    const t = setTimeout(() => {
      blackoutThen.current?.()
      blackoutThen.current = null
      setBlackout(false)
      setFadeQuick(true)
      setFading(true)
    }, BLACKOUT_MS)
    return () => clearTimeout(t)
  }, [blackout])
  const [taskOpen, setTaskOpen] = useState(false)
  const [closedDeliveryAt, setClosedDeliveryAt] = useState<number | null>(null)
  // 正解直後、Firestore の反映を待たずにエルフを出すための時刻
  const [localProceedAt, setLocalProceedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const advancing = useRef(false)
  const stageRef = useRef(doc.stage)
  stageRef.current = doc.stage
  const orderRef = useRef(doc.order)
  orderRef.current = doc.order
  const updateRef = useRef(update)
  updateRef.current = update

  const sockCode = (() => {
    const order = doc.order
    if (!order) return undefined
    const first = products.find((p) => p.id === order.items[0]?.id)
    if (first) return PROBLEMS[first.category].code
    if (isGame1LoseCart(order.items)) return PROBLEMS.game1.code
    return undefined
  })()
  const proceedAt = localProceedAt ?? doc.order?.proceedAt
  const stayed = !!doc.order?.stayed
  const showGuide =
    loaded &&
    doc.phase === 'game' &&
    ORDER_STAGES.includes(doc.stage) &&
    !!doc.order &&
    isCorrectCart(doc.stage, doc.order.items) &&
    (doc.order.status === 'solved' || localProceedAt != null)
  const counting = showGuide && proceedAt != null && proceedAt > now
  const adultWait = counting || (showGuide && stayed)
  const adultReady = showGuide && !adultWait

  const onSolved = () => {
    if (!doc.order) return
    const nextProceedAt =
      ORDER_STAGES.includes(doc.stage) && isCorrectCart(doc.stage, doc.order.items) ? Date.now() + adultWaitMs(doc.stage) : undefined
    if (nextProceedAt != null) {
      advancing.current = false
      setLocalProceedAt(nextProceedAt)
    }
    update({ order: { ...doc.order, status: 'solved', proceedAt: nextProceedAt, stayed: false } })
  }

  const goNext = () => {
    if (advancing.current) return
    advancing.current = true
    setLocalProceedAt(null)
    const stage = stageRef.current
    if (stage >= GAME_COUNT) update({ phase: 'end' })
    else update({ stage: stage + 1, phase: 'novel' })
  }

  // 正しい注文（ステージ1は王冠・タンバリン・フラフープ、ステージ3はペンギン・ダチョウ）は、数秒後に自動で届ける
  useEffect(() => {
    const order = doc.order
    if (!order || order.status !== 'ordered' || !isCorrectCart(doc.stage, order.items)) return
    const t = setTimeout(() => {
      update({ order: { items: order.items, status: 'delivered', at: order.at } })
    }, DELIVER_MS)
    return () => clearTimeout(t)
  }, [doc.order, doc.stage, update])

  useEffect(() => {
    if (!adultWait || proceedAt == null) return
    const t = setTimeout(() => setNow(Date.now()), Math.max(0, proceedAt - Date.now()))
    return () => clearTimeout(t)
  }, [adultWait, proceedAt])

  // スタッフのステイで proceedAt が未来に戻ったら、手元の時刻も合わせる
  useEffect(() => {
    const remote = doc.order?.proceedAt
    if (remote == null || remote <= Date.now()) return
    setLocalProceedAt((local) => (local != null && local >= remote ? local : remote))
  }, [doc.order?.proceedAt])

  useEffect(() => {
    if (!adultWait) {
      setAdultSkip(null)
      return
    }
    setAdultSkip(() => {
      const at = Date.now()
      setLocalProceedAt(at)
      setNow(at)
      const order = orderRef.current
      if (order) updateRef.current({ order: { ...order, proceedAt: at, stayed: false } })
    })
    return () => setAdultSkip(null)
  }, [adultWait])

  const startNew = () => {
    update({
      started: true,
      room: ROOM_BY_TEAM[team] ?? team,
      stage: 1,
      phase: 'novel',
      locked: true,
      order: null,
      orderedQty: [],
      searched: [],
      markCleared: false,
      searchUnlocked: false,
      records: [],
      hide: { tutorialDone: false, found: 0 },
      word: DEFAULT_WORD,
    })
    setCart([])
    setRecordsOpen(false)
    setClearNext(null)
    setShopOpen(false)
    setLocalProceedAt(null)
    setTaskOpen(false)
    advancing.current = false
    setEntered(true)
  }

  let body
  if (!loaded) {
    body = (
      <div className="center-msg">
        <Dots />
        <div>接続中</div>
      </div>
    )
  } else if (!entered) {
    body = (
      <div className="start-menu">
        <Logo size="lg" />
        <div className="team-label">チーム {team}</div>
        <div className="start-buttons">
          <button className="big" onClick={startNew}>はじめから</button>
          <button className="big sub" disabled={!doc.started} onClick={() => setEntered(true)}>つづきから</button>
        </div>
      </div>
    )
  } else if (doc.phase === 'novel' && doc.locked) {
    // フタが外れるまで会話は始めない
    body = null
  } else if (doc.phase === 'novel') {
    body = (
      <>
        <NovelPart
          key={`n${doc.stage}`}
          scene={edited ?? NOVEL[doc.stage - 1]}
          // フェードインが終わって、何もない背景を少し見せてからキャラを出す
          lead={fading ? FADE_MS + 800 : undefined}
          onFinish={() => (doc.stage === HIDE_STAGE || doc.stage === WORD_STAGE ? fadeThen(() => update({ phase: 'game' })) : update({ phase: 'game' }))}
        />
      </>
    )
  } else if (doc.phase === 'game') {
    if (doc.stage === 1 && doc.markCleared) {
      body = <KidsRoom />
    } else if (doc.stage === HIDE_STAGE) {
      body = (
        <HideSeek
          key={`g${doc.stage}`}
          doc={doc}
          update={update}
          shopOpen={shopOpen}
          szTab={szTab}
          onGuide={onGuide}
          onAllFound={() => fadeThen(() => update({ phase: 'clear' }))}
        />
      )
    } else if (doc.stage === WORD_STAGE) {
      body = (
        <WordGame
          key={`g${doc.stage}-${doc.enterAt ?? 0}`}
          doc={doc}
          update={update}
          shopOpen={shopOpen}
          chair={chair}
          onChairDone={() => setChair(false)}
        />
      )
    } else {
      const Game = GAMES[doc.stage - 1]
      body = (
        <Game
          key={`g${doc.stage}`}
          stage={doc.stage}
          onClear={() => update({ phase: 'clear' })}
        />
      )
    }
  } else if (doc.phase === 'clear') {
    body = (
      <NovelPart
        key={`c${doc.stage}`}
        scene={edited ?? CLEAR[doc.stage - 1]}
        onFinish={() => {
          if (doc.stage === 1) update({ phase: 'game', markCleared: true })
          if (doc.stage === HIDE_STAGE) setClearNext(doc.stage)
        }}
        endButton={
          doc.stage === 1 || doc.stage === HIDE_STAGE
            ? undefined
            : {
                label: '次に進む',
                onClick: () =>
                  doc.stage >= GAME_COUNT ? update({ phase: 'end' }) : update({ stage: doc.stage + 1, phase: 'novel' }),
              }
        }
      />
    )
  } else {
    body = <NovelPart key="end" scene={edited ?? ENDING} onFinish={() => {}} />
  }

  // 会話・ゲーム画面は枠で囲み、下にメニューボタンを並べる
  // 会話中とステージ1の子供部屋は外側の枠を外し、背景を画面いっぱいに広げる
  const framed = loaded && entered
  const talking = doc.phase === 'novel' || doc.phase === 'clear' || doc.phase === 'end'
  const openFrame = framed && (talking || (doc.phase === 'game' && doc.stage === 1))
  // マークの得点当てでは、まだ注文できない
  // ステージ3は、押さえてワードを2つ終えて部屋のお題が出てから
  const markQuiz =
    (doc.stage === 1 && doc.phase === 'game' && !doc.markCleared) ||
    (doc.stage === WORD_STAGE && doc.phase === 'game' && (doc.word?.step ?? 'rule') !== 'room')
  const records = (doc.records ?? []).filter((id) => RECORDS[id])
  // 会話中に開いたままの画面は閉じる。テキストを送る以外の操作を残さない
  useEffect(() => {
    if (!talking && !markQuiz) return
    setShopOpen(false)
    if (talking) {
      setTaskOpen(false)
      setRecordsOpen(false)
    }
  }, [talking, markQuiz])
  return (
    <div className="screen player">
      {framed ? (
        <>
          <div className={`play-frame${openFrame ? ' is-open' : ''}`}>
            {body}
            {!talking && shopOpen && (
              <Santazon
                doc={doc}
                update={update}
                cart={cart}
                setCart={(f) => setCart(f)}
                onClose={() => setShopOpen(false)}
                tab={szTab}
                onTab={setSzTab}
                searchUnlocked={!!doc.searchUnlocked || doc.stage > HIDE_STAGE}
                guide={doc.phase === 'game' && doc.stage === HIDE_STAGE ? guide.sz : null}
                onBeforeOrder={() => {
                  // ステージ3：はじめて正しい注文をしたときは、カイ・メイが止めに入る
                  if (doc.stage !== WORD_STAGE || doc.word?.chairTold) return false
                  setChair(true)
                  update({ word: { ...DEFAULT_WORD, ...doc.word, chairTold: true } })
                  return true
                }}
              />
            )}
          </div>
          <GameMenu
            shopOpen={shopOpen}
            locked={talking}
            onOrder={
              markQuiz
                ? undefined
                : () => {
                    if (!shopOpen) setSzTab('list')
                    setShopOpen(!shopOpen)
                  }
            }
            onTask={doc.stage === 1 && (doc.phase === 'clear' || doc.markCleared) ? () => setTaskOpen(true) : undefined}
            onRecord={records.length ? () => setRecordsOpen(true) : undefined}
            guide={doc.phase === 'game' && doc.stage === HIDE_STAGE && guide.menu ? '注文' : null}
            guided={doc.phase === 'game' && doc.stage === HIDE_STAGE && (guide.menu || !!guide.sz)}
          />
          {!talking && doc.order?.status === 'delivered' && closedDeliveryAt !== doc.order.at && (
            <ProblemDialog order={doc.order} onSolved={onSolved} onClose={() => setClosedDeliveryAt(doc.order?.at ?? null)} />
          )}
          {!talking && doc.order?.status === 'delivered' && closedDeliveryAt === doc.order.at && (
            <button className={`sock-btn${(doc.stage === 1 && doc.markCleared) || doc.stage === WORD_STAGE ? ' is-shifted' : ''}`} onClick={() => setClosedDeliveryAt(null)}>
              <svg viewBox="0 0 64 80" aria-hidden>
                <path fill="currentColor" d="M16 24h30v24c0 1 1 4 6 6 7 3 10 8 7 14-3 6-12 8-20 5L22 65c-8-4-12-11-10-18l4-8V24z" />
                <rect x="12" y="6" width="38" height="20" rx="6" fill="#fff" stroke="currentColor" strokeWidth="4" />
              </svg>
              <span>宅配ソックスナゾの再表示</span>
            </button>
          )}
          {!talking && adultWait && (
            <div className="sz-elf-back is-static">
              <div className="sz-elf-line">
                <img src={characterImage('Common', '真顔')} alt="" />
                <p className="is-three">
                  <span>エルフ</span>
                  <em>【<b>行動シート</b>】に記入して、大人部屋に向かいましょう。</em>
                  <em>宅配ソックスの番号は「<b>{sockCode}</b>」です。</em>
                </p>
              </div>
            </div>
          )}
          {!talking && adultReady && (
            <div className="stage-next" onClick={goNext}>
              <div className="stage-next-row">
                <i>▼</i>
                <span>タップで次のステージに進む</span>
                <i>▼</i>
              </div>
            </div>
          )}
          {doc.phase === 'clear' && clearNext === doc.stage && (
            <div className="stage-next" onClick={goNext}>
              <div className="stage-next-row">
                <i>▼</i>
                <span>タップで次のステージに進む</span>
                <i>▼</i>
              </div>
            </div>
          )}
          {!talking && recordsOpen && (
            <div className="modal-back" onClick={() => setRecordsOpen(false)}>
              <div className="modal records" onClick={(e) => e.stopPropagation()}>
                <h2>記録</h2>
                <div className="records-list">
                  {records.map((id) => (
                    <figure key={id}>
                      <img src={RECORDS[id].image} alt="" />
                      <figcaption>{RECORDS[id].title}</figcaption>
                    </figure>
                  ))}
                </div>
                <button onClick={() => setRecordsOpen(false)}>閉じる</button>
              </div>
            </div>
          )}
          {!talking && taskOpen && (
            <div className="modal-back" onClick={() => setTaskOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>やるべきこと</h2>
                <p className="task-text">{STAGE1_TASK}</p>
                <button onClick={() => setTaskOpen(false)}>閉じる</button>
              </div>
            </div>
          )}
        </>
      ) : (
        body
      )}
      {blackout && <div className="fade-to-black" />}
      {fading && <div className={`fade-black${fadeQuick ? ' is-quick' : ''}`} onAnimationEnd={() => { setFading(false); setFadeQuick(false) }} />}
      {/* メインビジュアル（KV）のフタ。スタッフがロックを解除するまで操作不可 */}
      {entered && doc.locked && (
        <div className="cover">
          {/* 画像が読み込めなかったときの代替表示（画像の下に隠れている） */}
          <Logo size="lg" />
          <Dots />
          <div className="cover-sub">しばらくお待ちください</div>
          <img className="cover-kv-bg" src={KV_IMAGE} alt="" onError={hideImg} />
          <img className="cover-kv" src={KV_IMAGE} alt="" onError={hideImg} />
        </div>
      )}
    </div>
  )
}
