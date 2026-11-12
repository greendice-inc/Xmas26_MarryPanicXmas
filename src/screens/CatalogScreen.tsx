import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, formatCode, type CategoryKey } from '../santazon/products'
import { useProducts, type ProductInput } from '../santazon/useProducts'

const EMPTY_DIGITS = ['', '', '', '']

function explain(e: unknown): string {
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
  if (code.includes('permission-denied')) return '保存できませんでした。Firestore の権限を確認してください'
  return e instanceof Error ? e.message : '登録に失敗しました'
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

/** 商品を Firestore に登録する画面。ゲームのステージとは別の、普通のページ */
export default function CatalogScreen({ onBack }: { onBack: () => void }) {
  const { stored, loaded, source, save, remove, importSeed } = useProducts()
  const [editing, setEditing] = useState<string | null>(null)
  const [category, setCategory] = useState<CategoryKey>('game1')
  const [name, setName] = useState('')
  const [digits, setDigits] = useState<string[]>(EMPTY_DIGITS)
  const [stock, setStock] = useState('1')
  const [listed, setListed] = useState(true)
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [image, setImage] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const imported = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const clear = () => {
    setEditing(null)
    setCategory('game1')
    setName('')
    setDigits(EMPTY_DIGITS)
    setStock('1')
    setListed(true)
    setDescription('')
    setNote('')
    setImage('')
    setEmoji('🎁')
    if (fileRef.current) fileRef.current.value = ''
  }

  const edit = (id: string) => {
    const p = stored.find((x) => x.id === id)
    if (!p) return
    setEditing(id)
    setCategory(p.category)
    setName(p.name)
    setDigits([...p.code.padEnd(4, ' ').slice(0, 4)].map((c) => (/\d/.test(c) ? c : '')))
    setStock(String(p.stock))
    setListed(p.listed)
    setDescription(p.description)
    setNote(p.note ?? '')
    setImage(p.image ?? '')
    setEmoji(p.emoji)
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDigits = (index: number, raw: string) => {
    const only = raw.replace(/\D/g, '')
    if (only.length > 1) {
      const next = [...EMPTY_DIGITS]
      only.slice(0, 4).split('').forEach((d, i) => (next[i] = d))
      setDigits(next)
      return
    }
    const next = [...digits]
    next[index] = only
    setDigits(next)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      setImage(await fileToImage(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像を読み込めませんでした')
    }
  }

  const submit = async () => {
    const code = digits.join('')
    const qty = Number(stock)
    if (!name.trim()) return setError('商品名を入力してください')
    if (!/^\d{4}$/.test(code)) return setError('商品番号は4桁の数字です')
    if (!Number.isInteger(qty) || qty < 0) return setError('在庫は0以上の整数です')
    const input: ProductInput = {
      category,
      name,
      code,
      stock: qty,
      listed,
      description,
      image,
      note,
      emoji,
    }
    setBusy(true)
    setError('')
    try {
      await save(editing, input)
      setMessage(editing ? '更新しました' : '登録しました')
      clear()
    } catch (e) {
      setError(explain(e))
    } finally {
      setBusy(false)
    }
  }

  const labelOf = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)?.label ?? key

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <div>
          <h1>商品登録</h1>
          <p>登録すると Firestore が更新され、ゲームの Santazon にも反映されます。</p>
        </div>
        <button className="catalog-back" onClick={onBack}>ゲームに戻る</button>
      </header>

      <div className="catalog-layout">
        <form
          className="catalog-form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <label>
            ゲーム
            <select value={category} onChange={(e) => setCategory(e.target.value as CategoryKey)}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>

          <label>
            商品名
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="王冠" />
          </label>

          <div className="catalog-field">
            <span>商品番号</span>
            <div className="catalog-code">
              {digits.map((d, i) => (
                <span key={i}>
                  {i > 0 && <i>ー</i>}
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    value={d}
                    aria-label={`商品番号 ${i + 1}桁目`}
                    onChange={(e) => onDigits(i, e.target.value)}
                  />
                </span>
              ))}
            </div>
          </div>

          <label>
            在庫
            <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} />
          </label>

          <div className="catalog-field">
            <span>リスト掲載</span>
            <div className="catalog-radios">
              <label><input type="radio" checked={listed} onChange={() => setListed(true)} />あり</label>
              <label><input type="radio" checked={!listed} onChange={() => setListed(false)} />なし</label>
            </div>
            <small>なしの商品は一覧に出ません。詳細検索すると、検索済みリストに追加されます。</small>
          </div>

          <label>
            アイテムの詳細説明
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="詳細ボタンを押したときに表示されます" />
          </label>

          <div className="catalog-field">
            <span>アイテムの画像</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
            {image && (
              <div className="catalog-preview">
                <img src={image} alt="" />
                <button type="button" onClick={() => { setImage(''); if (fileRef.current) fileRef.current.value = '' }}>画像を外す</button>
              </div>
            )}
          </div>

          <label>
            備考
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="登録する人のメモです。ゲームには出ません" />
          </label>

          {error && <div className="catalog-error">{error}</div>}
          {message && !error && <div className="catalog-ok">{message}</div>}

          <div className="catalog-actions">
            <button type="submit" className="catalog-submit" disabled={busy}>{editing ? '更新する' : '登録する'}</button>
            {editing && <button type="button" onClick={clear}>新規入力に戻す</button>}
          </div>
        </form>

        <section className="catalog-list">
          <h2>登録済み {loaded ? stored.length : '…'} 件</h2>
          {!loaded && <p>読み込み中</p>}
          {loaded && stored.length === 0 && <p>まだ商品がありません。</p>}
          {stored.map((p) => (
            <article key={p.id} className="catalog-row">
              <div className="catalog-thumb">
                {p.image ? <img src={p.image} alt="" /> : <span>なし</span>}
              </div>
              <div className="catalog-row-text">
                <strong>{p.name}</strong>
                <span>{labelOf(p.category)}　{formatCode(p.code) || '番号なし'}　在庫 {p.stock}　{p.listed ? '掲載あり' : '掲載なし'}</span>
                {p.note && <span className="catalog-note">備考：{p.note}</span>}
              </div>
              <button type="button" onClick={() => edit(p.id)}>編集</button>
              <button
                type="button"
                className="catalog-delete"
                onClick={() => {
                  if (confirmDelete !== p.id) {
                    setConfirmDelete(p.id)
                    return
                  }
                  setConfirmDelete(null)
                  remove(p.id).catch((e) => setError(explain(e)))
                  if (editing === p.id) clear()
                }}
              >
                {confirmDelete === p.id ? '削除する' : '削除'}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
