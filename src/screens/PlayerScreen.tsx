import { useState } from 'react'
import Dots from '../components/Dots'
import Logo from '../components/Logo'
import NovelPart from '../components/NovelPart'
import { GAME_COUNT, KV_IMAGE, ROOM_BY_TEAM } from '../config'
import { GAMES } from '../games'
import { useTeam } from '../net/hooks'
import { ENDING, NOVEL } from '../scenario'

const hideImg = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none'
}

export default function PlayerScreen({ team }: { team: number }) {
  const [doc, update, loaded] = useTeam(team)
  // 「はじめから／つづきから」を選んだか（再接続・リセット後は再び選ばせる）
  const [entered, setEntered] = useState(false)

  const startNew = () => {
    update({ started: true, room: ROOM_BY_TEAM[team] ?? team, stage: 1, phase: 'novel' })
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
  } else if (doc.phase === 'novel') {
    body = (
      <>
        <div className="room-badge"><span>ROOM</span>{doc.room}</div>
        <NovelPart
          key={`n${doc.stage}`}
          scene={NOVEL[doc.stage - 1]}
          onFinish={() => update({ phase: 'game' })}
        />
      </>
    )
  } else if (doc.phase === 'game') {
    const Game = GAMES[doc.stage - 1]
    body = (
      <>
        <div className="room-badge"><span>ROOM</span>{doc.room}</div>
        <Game
          key={`g${doc.stage}`}
          stage={doc.stage}
          onClear={() =>
            doc.stage >= GAME_COUNT ? update({ phase: 'end' }) : update({ stage: doc.stage + 1, phase: 'novel' })
          }
        />
      </>
    )
  } else {
    body = <NovelPart key="end" scene={ENDING} onFinish={() => {}} />
  }

  return (
    <div className="screen player">
      {body}
      {/* メインビジュアル（KV）のフタ。スタッフがロックを解除するまで操作不可 */}
      {doc.locked && (
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
