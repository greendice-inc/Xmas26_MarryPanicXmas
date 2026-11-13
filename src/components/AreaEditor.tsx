import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Area } from '../games/configAreas'

interface Props<T extends Area> {
  areas: T[]
  /** Firestore に保存済みの位置を表示しているか */
  saved: boolean
  image: string
  /** 画像の縦横比（例: '1980 / 1200'） */
  aspect: string
  /** 枠に書く名前 */
  boxLabel: (a: T) => string
  /** 枠につけるクラス（色分けなど） */
  boxClass?: (a: T) => string
  /** true = 丸い枠 */
  round?: boolean
  /** 選んだ枠の項目（名前の他に変えられるもの） */
  fields?: (sel: T, edit: (patch: Partial<T>) => void) => ReactNode
  onSave: (areas: T[]) => Promise<void>
  onReset: () => Promise<void>
  toCode: (areas: T[]) => string
  /** 「コードをコピー」のあとに出す、貼り付け先の説明 */
  codeHint: string
  onClose: () => void
}

/** タップできる場所を、ドラッグで動かす・右下の角で大きさを変える（?debug=true） */
export default function AreaEditor<T extends Area>({
  areas,
  saved,
  image,
  aspect,
  boxLabel,
  boxClass,
  round,
  fields,
  onSave,
  onReset,
  toCode,
  codeHint,
  onClose,
}: Props<T>) {
  const [draft, setDraft] = useState<T[]>(areas)
  const [selected, setSelected] = useState<string | null>(areas[0]?.id ?? null)
  const [status, setStatus] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; mode: 'move' | 'size'; px: number; py: number; start: T } | null>(null)

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

  const edit = (id: string, patch: Partial<T>) => setDraft((all) => all.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const sel = draft.find((a) => a.id === selected)

  const save = async () => {
    setStatus('保存中…')
    try {
      await onSave(draft)
      setStatus('保存しました（全端末に反映されます）')
    } catch {
      setStatus('保存できませんでした。Firestore のルール（config）を確認してください')
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toCode(draft))
      setStatus(`コードをコピーしました（${codeHint}）`)
    } catch {
      setStatus('コピーできませんでした')
    }
  }
  const reset = async () => {
    try {
      await onReset()
      setStatus('保存を消して、初期値に戻しました')
    } catch {
      setStatus('戻せませんでした')
    }
  }

  return (
    <div className="area-editor" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="hide-stage" ref={stageRef} style={{ aspectRatio: aspect }}>
        <img className="hide-bg" src={image} alt="" />
        {draft.map((a) => (
          <div
            key={a.id}
            className={`area-box ${boxClass?.(a) ?? ''}${round ? ' is-round' : ''}${a.id === selected ? ' is-on' : ''}`}
            style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%` }}
            onPointerDown={down(a.id, 'move')}
          >
            <span>{boxLabel(a)}</span>
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
              <input value={sel.label} onChange={(e) => edit(sel.id, { label: e.target.value } as Partial<T>)} />
            </label>
            {fields?.(sel, (patch) => edit(sel.id, patch))}
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
