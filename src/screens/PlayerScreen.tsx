import { useEffect, useRef, useState } from 'react'
import Dots from '../components/Dots'
import GameMenu from '../components/GameMenu'
import Logo from '../components/Logo'
import NovelPart from '../components/NovelPart'
import ProblemDialog from '../components/ProblemDialog'
import Santazon from '../components/Santazon'
import { GAME_COUNT, KV_IMAGE, ROOM_BY_TEAM } from '../config'
import { GAMES } from '../games'
import { useTeam } from '../net/hooks'
import { CLEAR, ENDING, NOVEL } from '../scenario'
import type { OrderItem } from '../types'

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
      setSolvedMsg(false)
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
  const [solvedMsg, setSolvedMsg] = useState(false)
  const onSolved = () => {
    if (!doc.order) return
    update({ order: { ...doc.order, status: 'solved' } })
    setSolvedMsg(true)
    setTimeout(() => setSolvedMsg(false), 1800)
  }

  const startNew = () => {
    update({ started: true, room: ROOM_BY_TEAM[team] ?? team, stage: 1, phase: 'novel', locked: true, order: null, orderedQty: [], searched: [] })
    setCart([])
    setShopOpen(false)
    setSolvedMsg(false)
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
    const Game = GAMES[doc.stage - 1]
    body = (
      <>
        <Game
          key={`g${doc.stage}`}
          stage={doc.stage}
          onClear={() => update({ phase: 'clear' })}
        />
      </>
    )
  } else if (doc.phase === 'clear') {
    // クリアのお礼 → 「次に進む」ボタンで次の話へ
    body = (
      <NovelPart
        key={`c${doc.stage}`}
        scene={CLEAR[doc.stage - 1]}
        onFinish={() => {}}
        endButton={{
          label: '次に進む',
          onClick: () =>
            doc.stage >= GAME_COUNT ? update({ phase: 'end' }) : update({ stage: doc.stage + 1, phase: 'novel' }),
        }}
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
          <GameMenu shopOpen={shopOpen} onOrder={() => setShopOpen((o) => !o)} />
          {/* 商品が届いたときの問題。画面全体を覆うモーダルで、解くまで他の操作はできない */}
          {doc.order && (doc.order.status === 'delivered' || solvedMsg) && (
            <ProblemDialog order={doc.order} onSolved={onSolved} />
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
