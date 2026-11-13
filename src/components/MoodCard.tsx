import type { Mood } from '../scenario'

/** ハートを押したときに出る「キモチ」のダイアログ */
export default function MoodCard({ mood, onClose }: { mood: Mood; onClose: () => void }) {
  const many = mood.lines.length > 1
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal mood${many ? ' is-many' : ''}`} onClick={(e) => e.stopPropagation()}>
        <img src={mood.icon} alt="" />
        <h2>{mood.name}</h2>
        {mood.lines.map((l, i) => (
          <p key={i}>
            {l.who && <small>{l.who}</small>}
            {many ? `「${l.text}」` : l.text}
          </p>
        ))}
        <button onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}
