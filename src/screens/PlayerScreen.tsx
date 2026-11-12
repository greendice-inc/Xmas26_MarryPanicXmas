import { useEffect, useRef, useState } from 'react'
import Dots from '../components/Dots'
import GameMenu from '../components/GameMenu'
import KidsRoom from '../components/KidsRoom'
import Logo from '../components/Logo'
import NovelPart from '../components/NovelPart'
import ProblemDialog from '../components/ProblemDialog'
import Santazon from '../components/Santazon'
import { GAME_COUNT, KV_IMAGE, ROOM_BY_TEAM } from '../config'
import { GAMES } from '../games'
import { useTeam } from '../net/hooks'
import { isGame1LoseCart } from '../santazon/products'
import { characterImage, CLEAR, ENDING, NOVEL } from '../scenario'
import type { OrderItem } from '../types'

/** 正しい3点を注文してから、届いたポップアップが出るまで */
const DELIVER_MS = 3000
/** 「大人部屋に向かおう」のあと、次のゲームへ自動で進むまで */
const NEXT_MS = 20000
const STAGE1_TASK = '失格にならないように、1点を下回って勝負に負ける。'

/** 暗転からのフェードインの長さ（styles.css の .fade-black と合わせる） */
const FADE_MS = 2500

const hideImg = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none'
}

export default function PlayerScreen({ team }: { team: number }) {
  const [doc, update, loaded] = useTeam(team)
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
      setAdultGo(false)
      setTaskOpen(false)
      setHotOrder(false)
      advancing.current = false
    }
    seenReset.current = { v: doc.resetAt }
  }, [doc.resetAt, loaded])

  // シーンジャンプしたら、待機画面にいても中に入る（注文・カート・検索済みはそのまま残す）
  const seenEnter = useRef<{ v: number | undefined } | null>(null)
  useEffect(() => {
    if (!loaded) return
    if (seenEnter.current && doc.enterAt !== seenEnter.current.v) {
      setEntered(true)
      setFading(false)
    }
    seenEnter.current = { v: doc.enterAt }
  }, [doc.enterAt, loaded])

  // Santazon（注文画面）
  const [shopOpen, setShopOpen] = useState(false)
  const [cart, setCart] = useState<OrderItem[]>([])
  const [hotOrder, setHotOrder] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [adultGo, setAdultGo] = useState(false)
  const advancing = useRef(false)
  const stageRef = useRef(doc.stage)
  stageRef.current = doc.stage

  const onSolved = () => {
    if (!doc.order) return
    update({ order: { ...doc.order, status: 'solved' } })
    if (isGame1LoseCart(doc.order.items)) {
      advancing.current = false
      setAdultGo(true)
    }
  }

  const goNext = () => {
    if (advancing.current) return
    advancing.current = true
    setAdultGo(false)
    const stage = stageRef.current
    if (stage >= GAME_COUNT) update({ phase: 'end' })
    else update({ stage: stage + 1, phase: 'novel' })
  }

  // 王冠・タンバリン・フラフープだけが注文されたら、数秒後に自動で届ける
  useEffect(() => {
    const order = doc.order
    if (!order || order.status !== 'ordered' || !isGame1LoseCart(order.items)) return
    const t = setTimeout(() => {
      update({ order: { items: order.items, status: 'delivered', at: order.at } })
      setShopOpen(false)
    }, DELIVER_MS)
    return () => clearTimeout(t)
  }, [doc.order, update])

  useEffect(() => {
    if (!adultGo) return
    const t = setTimeout(goNext, NEXT_MS)
    return () => clearTimeout(t)
  }, [adultGo])

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
    })
    setCart([])
    setShopOpen(false)
    setAdultGo(false)
    setTaskOpen(false)
    setHotOrder(false)
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
          scene={NOVEL[doc.stage - 1]}
          // フェードインが終わって、何もない背景を少し見せてからキャラを出す
          lead={fading ? FADE_MS + 800 : undefined}
          onFinish={() => update({ phase: 'game' })}
        />
      </>
    )
  } else if (doc.phase === 'game') {
    if (doc.stage === 1 && doc.markCleared) {
      body = <KidsRoom />
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
        scene={CLEAR[doc.stage - 1]}
        onLine={(line) => setHotOrder(line.highlight === 'order')}
        onFinish={() => {
          if (doc.stage === 1) update({ phase: 'game', markCleared: true })
        }}
        endButton={
          doc.stage === 1
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
    body = <NovelPart key="end" scene={ENDING} onFinish={() => {}} />
  }

  // 会話・ゲーム画面は枠で囲み、下にメニューボタンを並べる
  // 会話中とマーク当ては外側の枠を外し、背景を画面いっぱいに広げる
  const framed = loaded && entered
  const talking = doc.phase === 'novel' || doc.phase === 'clear' || doc.phase === 'end'
  const openFrame = framed && (talking || (doc.phase === 'game' && doc.stage === 1))
  return (
    <div className="screen player">
      {framed ? (
        <>
          <div className={`play-frame${openFrame ? ' is-open' : ''}`}>
            {body}
            {shopOpen && (
              <Santazon
                doc={doc}
                update={update}
                cart={cart}
                setCart={(f) => setCart(f)}
                onClose={() => setShopOpen(false)}
              />
            )}
          </div>
          <GameMenu
            shopOpen={shopOpen}
            onOrder={() => setShopOpen((o) => !o)}
            onTask={doc.stage === 1 && (doc.phase === 'clear' || doc.markCleared) ? () => setTaskOpen(true) : undefined}
            highlightOrder={doc.phase === 'clear' && doc.stage === 1 && hotOrder}
          />
          {doc.order?.status === 'wrong' && (
            <div className="order-hint">
              <img src={characterImage('Common', '真顔')} alt="" />
              <p>注文するものをもう一度考えた方がよさそうだね…</p>
            </div>
          )}
          {doc.order && doc.order.status === 'delivered' && (
            <ProblemDialog order={doc.order} onSolved={onSolved} />
          )}
          {adultGo && (
            <div className="sz-dialog-back sz-top">
              <div className="sz-dialog">
                <h2>宅配ソックスのある大人部屋に向かおう。</h2>
                <button onClick={goNext}>次のゲームに進む</button>
              </div>
            </div>
          )}
          {taskOpen && (
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
      {fading && <div className="fade-black" onAnimationEnd={() => setFading(false)} />}
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
