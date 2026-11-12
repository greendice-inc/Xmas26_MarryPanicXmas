import { useState } from 'react'

const ROOM = `${import.meta.env.BASE_URL}BG/Stage1/st1_子供部屋.png`

/** 部屋画像（1920×1200）の中で、タップすると中央に拡大して見せる場所 */
const SPOTS = [
  { id: 'picture', x: 26, y: 54, fx: 500, fy: 645, scale: 2.4 },
  { id: 'sign', x: 69, y: 64, fx: 1330, fy: 770, scale: 2.8 },
  { id: 'doll', x: 83, y: 78, fx: 1600, fy: 940, scale: 3.4 },
]

type Spot = (typeof SPOTS)[number]

const VIEW_W = 1100
const VIEW_H = 740

/** 特定のあとの子供部屋。決めた場所をタップすると、そのあたりを中央に拡大する */
export default function KidsRoom() {
  const [spot, setSpot] = useState<Spot | null>(null)
  const debug = new URLSearchParams(location.search).get('debug') === 'true'

  return (
    <div className="kids-room">
      <img className="kids-room-bg" src={ROOM} alt="" />
      {SPOTS.map((s) => (
        <button
          key={s.id}
          className={`room-spot${debug ? ' is-debug' : ''}`}
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
          aria-label="拡大する"
          onClick={() => setSpot(s)}
        />
      ))}
      {spot && (
        <div className="room-zoom-back" onClick={() => setSpot(null)}>
          <div className="room-zoom" onClick={(e) => e.stopPropagation()}>
            <div className="room-zoom-view">
              <img
                src={ROOM}
                alt=""
                style={{
                  width: 1920 * spot.scale,
                  height: 1200 * spot.scale,
                  marginLeft: VIEW_W / 2 - spot.fx * spot.scale,
                  marginTop: VIEW_H / 2 - spot.fy * spot.scale,
                }}
              />
            </div>
            <button className="sub" onClick={() => setSpot(null)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}
