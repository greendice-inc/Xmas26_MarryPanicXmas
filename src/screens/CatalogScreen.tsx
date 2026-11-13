import { useEffect, useMemo, useRef, useState } from 'react'
import Santazon from '../components/Santazon'
import Stage from '../components/Stage'
import { GAME_COUNT } from '../config'
import { CATEGORIES, type CategoryKey, type Product } from '../santazon/products'
import { useProducts, type ProductInput } from '../santazon/useProducts'
import { DEFAULT_TEAM, type OrderItem, type TeamDoc } from '../types'

function explain(e: unknown): string {
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
  if (code.includes('permission-denied')) return '保存できませんでした。Firestore の権限を確認してください'
  return e instanceof Error ? e.message : '保存に失敗しました'
}

/** 長辺 720px の JPEG にして、Firestore に入れられる大きさにする */
function fileToImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const max = 720
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      let quality = 0.82
      let data = canvas.toDataURL('image/jpeg', quality)
      while (data.length > 700_000 && quality > 0.4) {
        quality -= 0.12
        data = canvas.toDataURL('image/jpeg', quality)
      }
      if (data.length > 900_000) reject(new Error('画像が大きすぎます。別の画像にしてください'))
      else resolve(data)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像を読み込めませんでした'))
    }
    img.src = url
  })
}

/** 表の1行。入力中の値は文字列のまま持ち、保存するときに確かめる */
interface Row {
  category: CategoryKey
  name: string
  code: string
  available: string
  stock: string
  listed: boolean
  description: string
  image: string
  note: string
}

const EMPTY_ROW: Row = {
  category: 'game1',
  name: '',
  code: '',
  available: '1',
  stock: '1',
  listed: true,
  description: '',
  image: '',
  note: '',
}

function toRow(p: Product): Row {
  return {
    category: p.category,
    name: p.name,
    code: p.code,
    available: String(p.available),
    stock: String(p.stock),
    listed: p.listed,
    description: p.description,
    image: p.image ?? '',
    note: p.note ?? '',
  }
}

/** 保存できない理由。問題なければ null */
function problemOf(r: Row): { field: keyof Row; message: string } | null {
  if (!r.name.trim()) return { field: 'name', message: '商品名を入力してください' }
  if (!/^\d{4}$/.test(r.code)) return { field: 'code', message: '商品番号は4桁の数字です' }
  if (!/^\d+$/.test(r.available)) return { field: 'available', message: '在庫（今ある数）は0以上の整数です' }
  if (!/^\d+$/.test(r.stock)) return { field: 'stock', message: '在庫（全体）は0以上の整数です' }
  return null
}

function toInput(r: Row): ProductInput {
  return {
    category: r.category,
    name: r.name,
    code: r.code,
    available: Number(r.available),
    stock: Number(r.stock),
    listed: r.listed,
    description: r.description,
    image: r.image,
    note: r.note,
  }
}

const same = (a: Row, b: Row) => (Object.keys(a) as (keyof Row)[]).every((k) => a[k] === b[k])

/** 列。Enter・矢印キーで上下に移動できるのは、文字を打つ列だけ */
const COLUMNS = [
  { key: 'category', label: 'ゲーム' },
  { key: 'name', label: '商品名' },
  { key: 'code', label: '商品番号' },
  { key: 'available', label: '在庫（今）' },
  { key: 'stock', label: '在庫（全体）' },
  { key: 'listed', label: 'リスト掲載' },
  { key: 'description', label: 'アイテムの詳細説明' },
  { key: 'image', label: '画像' },
  { key: 'note', label: '備考' },
] as const

/** Excel から貼り付けるときの列の並び（表と同じ。画像は除く） */
const PASTE_HELP = 'ゲーム（1〜5 / final）・商品名・商品番号・在庫（今）・在庫（全体）・掲載（あり/なし）・詳細説明・備考'

function parseCategory(v: string): CategoryKey | null {
  const s = v.trim()
  const hit = CATEGORIES.find((c) => c.key === s || c.label === s)
  if (hit) return hit.key
  if (/^[1-5]$/.test(s)) return `game${s}` as CategoryKey
  if (/^(f|final|ファイナル)/i.test(s)) return 'final'
  return null
}

/** タブ区切り（Excel からのコピー）を商品に直す。1行目が見出しなら飛ばす */
function parsePaste(text: string): { rows: ProductInput[]; errors: string[] } {
  const rows: ProductInput[] = []
  const errors: string[] = []
  text
    .replace(/\r/g, '')
    .split('\n')
    .forEach((line, i) => {
      if (!line.trim()) return
      const cells = line.split('\t')
      const category = parseCategory(cells[0] ?? '')
      if (!category) {
        if (i > 0) errors.push(`${i + 1}行目：ゲームがわかりません（${cells[0]}）`)
        return
      }
      const row: Row = {
        category,
        name: (cells[1] ?? '').trim(),
        code: (cells[2] ?? '').replace(/\D/g, ''),
        available: (cells[3] ?? '').trim(),
        stock: (cells[4] ?? '').trim(),
        listed: !/^(なし|無|no|false|0|×)$/i.test((cells[5] ?? '').trim()),
        description: (cells[6] ?? '').trim(),
        image: '',
        note: (cells[7] ?? '').trim(),
      }
      const problem = problemOf(row)
      if (problem) errors.push(`${i + 1}行目：${problem.message}`)
      else rows.push(toInput(row))
    })
  return { rows, errors }
}

/** 商品を Firestore に登録する画面。Excel のように、1商品1行の表で直接書き換える */
export default function CatalogScreen({ onBack }: { onBack: () => void }) {
  const { stored, loaded, source, save, remove, importSeed, importMany } = useProducts()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<CategoryKey | 'all'>('all')
  const [query, setQuery] = useState('')
  const [shop, setShop] = useState(false)
  const [preview, setPreview] = useState<TeamDoc>(DEFAULT_TEAM)
  const [cart, setCart] = useState<OrderItem[]>([])
  const [paste, setPaste] = useState<string | null>(null)
  const imported = useRef(false)

  // まだ1件も無ければ、ファイルに入っている商品を Firestore へ入れる
  useEffect(() => {
    if (!loaded || source === 'cloud' || imported.current) return
    imported.current = true
    setBusy(true)
    importSeed()
      .then(() => setMessage('初期の商品を登録しました'))
      .catch((e) => setError(explain(e)))
      .finally(() => setBusy(false))
  }, [loaded, source, importSeed])

  // 書き換えたあとに並び替わると、入力中の行が動いてしまう。最初に見た順を保つ
  const order = useRef<string[]>([])
  const ids = stored.map((p) => p.id)
  order.current = [...order.current.filter((id) => ids.includes(id)), ...ids.filter((id) => !order.current.includes(id))]
  const byId = useMemo(() => new Map(stored.map((p) => [p.id, p])), [stored])
  const q = query.trim()
  const visible = order.current
    .map((id) => byId.get(id)!)
    .filter((p) => (filter === 'all' || p.category === filter) && (!q || p.name.includes(q) || p.code.includes(q) || (p.note ?? '').includes(q)))

  const openShop = () => {
    setPreview({ ...DEFAULT_TEAM, started: true, locked: false, stage: GAME_COUNT, searchUnlocked: true })
    setCart([])
    setShop(true)
  }

  const runPaste = async () => {
    if (paste == null) return
    const { rows, errors } = parsePaste(paste)
    if (!rows.length) return setError(errors[0] ?? '貼り付ける行がありません')
    setBusy(true)
    setError('')
    try {
      const r = await importMany(rows)
      setMessage(`貼り付けました（追加 ${r.added} 件・更新 ${r.updated} 件）${errors.length ? `。読めなかった行：${errors.join(' / ')}` : ''}`)
      setPaste(null)
    } catch (e) {
      setError(explain(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="catalog-page">
        <header className="catalog-header">
          <div>
            <h1>商品登録</h1>
            <p>セルを直接書き換えると、セルを離れたときに保存されます。Enter・↑↓で上下のセルへ移動します。</p>
          </div>
          <div className="catalog-header-actions">
            <button onClick={() => setPaste('')}>Excelから貼り付け</button>
            <button className="catalog-shop-open" onClick={openShop}>Santazonを開く</button>
            <button className="catalog-back" onClick={onBack}>ゲームに戻る</button>
          </div>
        </header>

        <div className="sheet-wrap">
          <div className="sheet-toolbar">
            <select value={filter} onChange={(e) => setFilter(e.target.value as CategoryKey | 'all')}>
              <option value="all">すべてのゲーム</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <input className="sheet-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="商品名・番号・備考で絞り込み" />
            <span className="sheet-count">{loaded ? `${visible.length} / ${stored.length} 件` : '読み込み中…'}</span>
            {busy && <span className="sheet-count">処理中…</span>}
            {error && <span className="catalog-error">{error}</span>}
            {message && !error && <span className="catalog-ok">{message}</span>}
          </div>

          <div className="sheet-scroll">
            <table className="sheet">
              <thead>
                <tr>
                  <th className="sheet-no">#</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={`col-${c.key}`}>{c.label}</th>
                  ))}
                  <th className="col-actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((p, i) => (
                  <SheetRow
                    key={p.id}
                    index={i}
                    initial={toRow(p)}
                    onSave={(r) => save(p.id, toInput(r))}
                    onDelete={() => remove(p.id)}
                    onError={(m) => setError(m)}
                  />
                ))}
                <SheetRow
                  key={`new-${stored.length}`}
                  index={visible.length}
                  isNew
                  initial={{ ...EMPTY_ROW, category: filter === 'all' ? 'game1' : filter }}
                  onSave={async (r) => {
                    await save(null, toInput(r))
                    setMessage(`「${r.name}」を追加しました`)
                  }}
                  onError={(m) => setError(m)}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {paste != null && (
        <div className="catalog-modal-back" onClick={() => setPaste(null)}>
          <div className="catalog-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Excelから貼り付け</h2>
            <p>
              Excel やスプレッドシートで範囲をコピーして、下に貼り付けてください。列の並びは
              <br />
              <b>{PASTE_HELP}</b>
              <br />
              同じゲームで同じ商品番号の商品があれば上書き、無ければ追加します。1行目が見出しなら読み飛ばします。
            </p>
            <textarea autoFocus rows={10} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'1\t王冠\t1913\t1\t1\tあり\t\t'} />
            {paste.trim() && <small>{parsePaste(paste).rows.length} 件を読み取りました</small>}
            <div className="catalog-actions">
              <button className="catalog-submit" disabled={busy || !paste.trim()} onClick={runPaste}>取り込む</button>
              <button onClick={() => setPaste(null)}>やめる</button>
            </div>
          </div>
        </div>
      )}

      {shop && (
        <div className="catalog-shop">
          <Stage>
            <Santazon
              doc={preview}
              update={(patch) => setPreview((d) => ({ ...d, ...patch }))}
              cart={cart}
              setCart={setCart}
              onClose={() => setShop(false)}
            />
          </Stage>
        </div>
      )}
    </>
  )
}

/** Enter・↑↓で、同じ列の上下のセルへ移る */
function moveFocus(e: React.KeyboardEvent<HTMLElement>, col: string, row: number) {
  const down = e.key === 'Enter' || e.key === 'ArrowDown'
  const up = e.key === 'ArrowUp'
  if (!down && !up) return
  const target = document.querySelector<HTMLElement>(`[data-cell="${col}:${row + (down ? 1 : -1)}"]`)
  if (!target) return
  e.preventDefault()
  target.focus()
  if (target instanceof HTMLInputElement) target.select()
}

function SheetRow({
  index,
  initial,
  isNew,
  onSave,
  onDelete,
  onError,
}: {
  index: number
  initial: Row
  isNew?: boolean
  onSave: (r: Row) => Promise<void>
  onDelete?: () => Promise<void>
  onError: (message: string) => void
}) {
  const [row, setRow] = useState<Row>(initial)
  const [saved, setSaved] = useState<Row>(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [problem, setProblem] = useState<keyof Row | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const rowRef = useRef(row)
  rowRef.current = row

  // 他の端末で書き換えられたら、触っていない行だけ合わせる
  const initialKey = JSON.stringify(initial)
  useEffect(() => {
    if (isNew) return
    setSaved(initial)
    setRow((r) => (same(r, saved) ? initial : r))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey])

  const dirty = !same(row, saved)

  const commit = async (next: Row = rowRef.current) => {
    if (same(next, saved)) return
    const p = problemOf(next)
    if (p) {
      setProblem(p.field)
      setState('error')
      onError(p.message)
      return
    }
    setProblem(null)
    setState('saving')
    try {
      await onSave(next)
      onError('')
      if (isNew) {
        setRow(initial)
        setSaved(initial)
        setState('idle')
      } else {
        setSaved(next)
        setState('saved')
      }
    } catch (e) {
      setState('error')
      onError(explain(e))
    }
  }

  const set = <K extends keyof Row>(key: K, value: Row[K], now = false) => {
    const next = { ...rowRef.current, [key]: value }
    setRow(next)
    rowRef.current = next
    if (state === 'saved') setState('idle')
    // 新しい行は「追加」か Enter で保存する（途中の入力でエラーを出さない）
    if (now && !isNew) commit(next)
  }

  const text = (key: 'name' | 'code' | 'available' | 'stock' | 'description' | 'note', opts?: { numeric?: boolean; max?: number }) => (
    <input
      data-cell={`${key}:${index}`}
      className={problem === key ? 'is-bad' : undefined}
      value={row[key]}
      inputMode={opts?.numeric ? 'numeric' : undefined}
      maxLength={opts?.max}
      onChange={(e) => set(key, opts?.numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
      onBlur={() => !isNew && commit()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setRow(saved)
          setProblem(null)
          ;(e.target as HTMLInputElement).blur()
          return
        }
        if (isNew && e.key === 'Enter') {
          e.preventDefault()
          commit()
          return
        }
        moveFocus(e, key, index)
      }}
      placeholder={isNew && key === 'name' ? '＋ 新しい商品' : undefined}
    />
  )

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      set('image', await fileToImage(file), true)
    } catch (e) {
      onError(e instanceof Error ? e.message : '画像を読み込めませんでした')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <tr className={`${isNew ? 'is-new' : ''}${dirty ? ' is-dirty' : ''}${state === 'error' ? ' is-error' : ''}`}>
      <td className="sheet-no">{isNew ? '＋' : index + 1}</td>
      <td className="col-category">
        <select value={row.category} onChange={(e) => set('category', e.target.value as CategoryKey, true)}>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label.replace('用アイテム', '')}</option>
          ))}
        </select>
      </td>
      <td className="col-name">{text('name')}</td>
      <td className="col-code">{text('code', { numeric: true, max: 4 })}</td>
      <td className="col-available">{text('available', { numeric: true })}</td>
      <td className="col-stock">{text('stock', { numeric: true })}</td>
      <td className="col-listed">
        <label>
          <input type="checkbox" checked={row.listed} onChange={(e) => set('listed', e.target.checked, true)} />
          {row.listed ? 'あり' : 'なし'}
        </label>
      </td>
      <td className="col-description">{text('description')}</td>
      <td className="col-image">
        <div className="sheet-image">
          {row.image ? (
            <button type="button" className="sheet-thumb" onClick={() => fileRef.current?.click()} title="画像を変える">
              <img src={row.image} alt="" />
            </button>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}>選ぶ</button>
          )}
          {row.image && (
            <button type="button" className="sheet-x" onClick={() => set('image', '', !isNew)} aria-label="画像を外す">×</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </td>
      <td className="col-note">{text('note')}</td>
      <td className="col-actions">
        {isNew ? (
          <button type="button" className="catalog-submit" disabled={!row.name.trim()} onClick={() => commit()}>追加</button>
        ) : (
          <>
            <span className={`sheet-state is-${state}`}>
              {state === 'saving' ? '保存中' : state === 'saved' ? '保存済み' : state === 'error' ? '未保存' : dirty ? '編集中' : ''}
            </span>
            <button
              type="button"
              className="catalog-delete"
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true)
                setConfirmDelete(false)
                onDelete?.().catch((e) => onError(explain(e)))
              }}
              onBlur={() => setConfirmDelete(false)}
            >
              {confirmDelete ? '削除する' : '削除'}
            </button>
          </>
        )}
      </td>
    </tr>
  )
}
