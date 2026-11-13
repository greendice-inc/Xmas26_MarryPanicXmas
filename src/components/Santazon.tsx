import { useRef, useState } from 'react'
import {
  CATEGORIES,
  MAX_CART,
  formatCode,
  isCorrectCart,
  type CategoryKey,
  type Product,
} from '../santazon/products'
import { useProducts } from '../santazon/useProducts'
import { characterImage } from '../scenario'
import type { OrderItem, TeamDoc } from '../types'

interface Props {
  doc: TeamDoc
  update: (patch: Partial<TeamDoc>) => void
  cart: OrderItem[]
  setCart: (f: (c: OrderItem[]) => OrderItem[]) => void
  onClose: () => void
  /** 表示中のタブ。渡すと親が切り替えを管理する（ステージ2の案内で使う） */
  tab?: SzTab
  onTab?: (tab: SzTab) => void
  /** false = リスト追加検索タブを出さない（ステージ2の案内で解放するまで） */
  searchUnlocked?: boolean
  /** 案内で目立たせる場所 */
  guide?: SzGuide | null
  /** 正しい注文を確定する直前に呼ぶ。true を返すと注文しない（ステージ3の椅子の話） */
  onBeforeOrder?: () => boolean
}

export type SzTab = 'list' | 'search'
/** tab=リスト追加検索タブを目立たせる / talk=説明中（どこも触れない） */
export type SzGuide = 'tab' | 'talk'

/** リスト追加検索で、検索済みリストに載せてよい商品 */
const SEARCH_LIST_NAMES = new Set(['マネキン', 'セーター', 'オーバーオール', 'スーパーボール'])

function ProductImage({ p }: { p: Product }) {
  if (!p.image) return null
  return <img src={p.image} alt="" />
}

/** 注文画面「Santazon」。見た目はネット通販サイト風 */
export default function Santazon({ doc, update, cart, setCart, onClose, tab: tabProp, onTab, searchUnlocked = true, guide, onBeforeOrder }: Props) {
  const { products } = useProducts()
  const productById = (id: string) => products.find((p) => p.id === id)
  const [ownTab, setOwnTab] = useState<SzTab>('list')
  const tab = searchUnlocked ? (tabProp ?? ownTab) : 'list'
  const setTab = (t: SzTab) => {
    setOwnTab(t)
    onTab?.(t)
  }
  // 初期値は現在のステージのカテゴリ。選び直したら、そちらを優先する
  const stageCategory = CATEGORIES[Math.min(CATEGORIES.length, Math.max(1, doc.stage)) - 1].key
  const [picked, setPicked] = useState<CategoryKey | null>(null)
  const category = picked ?? stageCategory
  const [showSearched, setShowSearched] = useState(false)
  const [detail, setDetail] = useState<Product | null>(null)
  const [help, setHelp] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // 届く途中・解答中は新しい注文ができない。考え直す注文と、解き終わった注文は入れ直せる
  const ordering = !!doc.order && (doc.order.status === 'ordered' || doc.order.status === 'delivered')
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const full = cartCount >= MAX_CART

  const remaining = (p: Product) =>
    p.available -
    (doc.orderedQty.find((i) => i.id === p.id)?.qty ?? 0) -
    (cart.find((i) => i.id === p.id)?.qty ?? 0)

  const add = (p: Product) =>
    setCart((c) =>
      c.some((i) => i.id === p.id)
        ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { id: p.id, qty: 1 }],
    )
  const dec = (id: string) =>
    setCart((c) => c.flatMap((i) => (i.id !== id ? [i] : i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : [])))
  const remove = (id: string) => setCart((c) => c.filter((i) => i.id !== id))

  const confirm = () => {
    if (!cart.length || ordering) return
    const correct = isCorrectCart(doc.stage, cart)
    if (correct) {
      if (onBeforeOrder?.()) return
      const orderedQty = [...doc.orderedQty]
      cart.forEach((c) => {
        const e = orderedQty.find((o) => o.id === c.id)
        if (e) e.qty += c.qty
        else orderedQty.push({ ...c })
      })
      update({ order: { items: cart, status: 'ordered', at: Date.now() }, orderedQty: orderedQty.map((o) => ({ ...o })) })
      setCart(() => [])
      setConfirmed(true)
    } else {
      update({ order: { items: cart, status: 'wrong', at: Date.now() } })
      setRejected(true)
    }
  }

  // ステージが進むほど、その番号までのゲーム用アイテムが選べる
  const openCategories = CATEGORIES.slice(0, Math.min(CATEGORIES.length, Math.max(1, doc.stage)))
  const selected = openCategories.some((c) => c.key === category) ? category : openCategories[openCategories.length - 1].key
  const listed = products.filter((p) => p.category === selected && p.listed)
  const searchedProducts = doc.searched.map(productById).filter((p): p is Product => !!p)
  const rows = showSearched ? searchedProducts : listed
  const openSearched = () => {
    setTab('list')
    setShowSearched(true)
  }

  return (
    <div className={`santazon${guide ? ' is-guided' : ''}`}>
      <header className="sz-header">
        <button className="sz-home" onClick={onClose} aria-label="ホームに戻る">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor">
            <path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z" />
          </svg>
        </button>
        <div className="sz-logo">Santazon</div>
        <nav className="sz-tabs">
          <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>リスト</button>
          {searchUnlocked && (
            <button
              className={`${tab === 'search' ? 'on' : ''}${guide === 'tab' ? ' is-guide' : ''}`}
              onClick={() => {
                setTab('search')
                setShowSearched(false)
              }}
            >
              リスト追加検索
            </button>
          )}
        </nav>
        <button className="sz-btn sz-yellow sz-help" onClick={() => setHelp(true)}>Santazonの使い方</button>
        <button className="sz-btn sz-yellow sz-top-btn" onClick={onClose}>トップに戻る</button>
      </header>

      <div className="sz-body">
        <main className="sz-main">
          {tab === 'list' ? (
            <>
              <div className="sz-toolbar">
                <select
                  value={selected}
                  onChange={(e) => {
                    setPicked(e.target.value as CategoryKey)
                    setShowSearched(false)
                  }}
                >
                  {openCategories.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <button className={`sz-btn sz-light${showSearched ? ' is-on' : ''}`} onClick={openSearched}>
                  検索済みリスト（{searchedProducts.length}）
                </button>
              </div>
              <div className="sz-list">
                {rows.length === 0 && (
                  <div className="sz-empty">
                    {showSearched ? 'まだ検索した商品はありません' : 'このカテゴリに掲載中の商品はありません'}
                  </div>
                )}
                {rows.map((p) => {
                  const left = remaining(p)
                  const soldOut = left <= 0
                  return (
                    <div className={`sz-row${soldOut ? ' sold-out' : ''}`} key={p.id}>
                      <div className="sz-name">{p.name}</div>
                      <div className="sz-code">詳細番号：{formatCode(p.code)}</div>
                      <button className="sz-btn sz-light" onClick={() => setDetail(p)}>詳細</button>
                      <button className="sz-btn sz-yellow" disabled={soldOut || full || ordering} onClick={() => add(p)}>
                        カートに追加
                      </button>
                      <div className="sz-stock">在庫数：{Math.max(0, left)}/{p.stock}</div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <SearchTab
              products={products}
              searched={doc.searched}
              onFound={(ids) => {
                const addIds = ids.filter((id) => {
                  const p = productById(id)
                  return !!p && SEARCH_LIST_NAMES.has(p.name) && !doc.searched.includes(id)
                })
                if (addIds.length) update({ searched: [...doc.searched, ...addIds] })
              }}
              onOpenSearched={openSearched}
              guided={!!guide}
            />
          )}
        </main>

        <aside className="sz-cart">
          <h2>ショッピングカート</h2>
          <div className="sz-cart-count">{cartCount} / {MAX_CART} 点</div>
          <div className="sz-cart-list">
            {cart.length === 0 && <div className="sz-empty">カートは空です</div>}
            {cart.map((i) => {
              const p = productById(i.id)
              if (!p) return null
              return (
                <div className="sz-cart-item" key={i.id}>
                  <div className="sz-cart-info">
                    <div className="sz-name">{p.name} × {i.qty}</div>
                  </div>
                  <button className="sz-btn sz-light sz-sm" onClick={() => dec(i.id)} aria-label="1つ減らす">−</button>
                  <button className="sz-btn sz-light sz-sm" onClick={() => remove(i.id)}>削除</button>
                </div>
              )
            })}
          </div>
          {full && !ordering && <div className="sz-note">カートに入れられるのは{MAX_CART}つまでです</div>}
          {ordering && <div className="sz-note">配送中のため、新しい注文はできません</div>}
          <button className="sz-btn sz-orange sz-confirm" disabled={!cart.length || ordering} onClick={confirm}>
            注文確定
          </button>
        </aside>
      </div>

      {detail && (
        <div className="sz-dialog-back" onClick={() => setDetail(null)}>
          <div className="sz-dialog" onClick={(e) => e.stopPropagation()}>
            {detail.image && (
              <div className="sz-thumb sz-thumb-lg">
                <ProductImage p={detail} />
              </div>
            )}
            <h2>{detail.name}</h2>
            <p>{detail.description || '詳しい説明は準備中です。'}</p>
            <button className="sz-btn sz-yellow" onClick={() => setDetail(null)}>閉じる</button>
          </div>
        </div>
      )}

      {help && (
        <div className="sz-dialog-back" onClick={() => setHelp(false)}>
          <div className="sz-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Santazonの使い方</h2>
            <p>必要なアイテムを3つまでカートに追加して、注文確定ボタンを押すと、注文したものが宅配ソックスに届きます。</p>
            <p>宅配ソックスの番号は、注文したあとに出てくる謎を解くとわかります。</p>
            <button className="sz-btn sz-yellow" onClick={() => setHelp(false)}>閉じる</button>
          </div>
        </div>
      )}

      {rejected && (
        <div className="sz-elf-back" onClick={() => setRejected(false)}>
          <div className="sz-elf-line">
            <img src={characterImage('Common', '真顔')} alt="" />
            <p>
              <span>エルフ</span>
              注文するものをもう一度考えた方がよさそうだね。
            </p>
          </div>
        </div>
      )}

      {confirmed && (
        <div className="sz-dialog-back" onClick={() => setConfirmed(false)}>
          <div className="sz-dialog" onClick={(e) => e.stopPropagation()}>
            <p>注文が確定しました。商品が届くまでしばらくお待ちください。</p>
            <button className="sz-btn sz-yellow" onClick={() => setConfirmed(false)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductDetail({ p }: { p: Product }) {
  return (
    <div className="sz-detail">
      {p.image && (
        <div className="sz-thumb sz-thumb-lg">
          <ProductImage p={p} />
        </div>
      )}
      <div className="sz-detail-text">
        <div className="sz-name sz-name-lg">{p.name}</div>
        <div className="sz-code">リスト追加検索番号：{formatCode(p.code)}</div>
        <p>{p.description || '詳しい説明は準備中です。'}</p>
      </div>
    </div>
  )
}

/** 枠に文字を並べたときに、その商品を探す合言葉 */
const SPECIAL_WORDS: Record<string, string> = {
  オバオル: 'オーバーオール',
  スパボル: 'スーパーボール',
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

/** 下の説明文。ここにある文字も、枠へドラッグできる */
const HINT_LINES = [
  '画面中のオレンジの文字を引っ張って、',
  'バーで繋がれた4つのパープルの枠に当てはめることで',
  'アイテムを指定すること',
]

/** 4桁のコードを、下の数字パネルをドラッグして四角にはめ込み、商品を検索する */
function SearchTab({
  products,
  searched,
  onFound,
  onOpenSearched,
  guided,
}: {
  products: Product[]
  searched: string[]
  onFound: (ids: string[]) => void
  onOpenSearched: () => void
  /** 説明中。下の説明文はいじれないので隠す */
  guided: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null])
  const [drag, setDrag] = useState<{ digit: string; x: number; y: number } | null>(null)
  const [result, setResult] = useState<Product[] | 'none' | null>(null)

  // 画面は拡縮されているので、ポインタ座標をこの要素内の座標に直す
  const local = (e: React.PointerEvent) => {
    const el = rootRef.current!
    const r = el.getBoundingClientRect()
    const s = r.width / el.offsetWidth
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }
  }

  const down = (digit: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ digit, ...local(e) })
  }
  const move = (e: React.PointerEvent) => {
    if (drag) setDrag({ ...drag, ...local(e) })
  }
  const up = (e: React.PointerEvent) => {
    if (!drag) return
    const hit = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.slot !== undefined)
    if (hit) {
      const idx = Number(hit.dataset.slot)
      setSlots((s) => s.map((v, i) => (i === idx ? drag.digit : v)))
      setResult(null)
    }
    setDrag(null)
  }

  const filled = slots.every((s) => s !== null)
  const search = () => {
    const code = slots.join('')
    // 文字を並べたときだけの特別な検索（番号は要らない）
    const special = SPECIAL_WORDS[code]
    const found = special ? products.filter((p) => p.name === special) : products.filter((p) => p.code === code)
    setResult(found.length ? found : 'none')
    onFound(found.map((p) => p.id))
  }
  const clear = () => {
    setSlots([null, null, null, null])
    setResult(null)
  }

  return (
    <div className="sz-search" ref={rootRef}>
      <p className="sz-search-lead">
        商品を指定するとアイテムをリストに追加できます。
        <br />
        一度検索したものは検索済みリストから確認できます。
      </p>
      <button className="sz-btn sz-light sz-sm sz-search-list" onClick={onOpenSearched}>
        検索済みリスト（{searched.length}）
      </button>

      <div className="sz-slots">
        {slots.map((v, i) => (
          <div key={i} className="sz-slot-wrap">
            {i > 0 && <span className="sz-dash">ー</span>}
            <div
              className={`sz-slot${v ? ' filled' : ''}`}
              data-slot={i}
              onClick={() => setSlots((s) => s.map((x, j) => (j === i ? null : x)))}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      <div className="sz-search-actions">
        <button className="sz-btn sz-yellow" disabled={!filled} onClick={search}>検索</button>
        <button className="sz-btn sz-light" onClick={clear}>クリア</button>
      </div>

      {/* 検索結果は、他の部品に押しつぶされないよう、上に重ねて出す */}
      <div className="sz-result" />
      {result && (
        <div className="sz-result-back" onClick={() => setResult(null)}>
          <div className="sz-result-pop" onClick={(e) => e.stopPropagation()}>
            {result === 'none' ? (
              <div className="sz-result-none">該当する商品は見つかりませんでした</div>
            ) : (
              result.map((p) => <ProductDetail p={p} key={p.id} />)
            )}
            <button className="sz-btn sz-yellow" onClick={() => setResult(null)}>閉じる</button>
          </div>
        </div>
      )}

      <div className="sz-panels">
        {DIGITS.map((d) => (
          <button
            key={d}
            className="sz-panel"
            onPointerDown={down(d)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {d}
          </button>
        ))}
      </div>

      <p className="sz-search-hint" style={guided ? { visibility: 'hidden' } : undefined}>
        {HINT_LINES.map((line, li) => (
          <span className="sz-hint-line" key={li}>
            {[...line].map((ch, ci) =>
              ch === '、' || ch === '。' || ch === ' ' ? (
                <span key={`${li}-${ci}`}>{ch}</span>
              ) : (
                <button
                  key={`${li}-${ci}`}
                  className="sz-hint-ch"
                  onPointerDown={down(ch)}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={up}
                >
                  {ch}
                </button>
              ),
            )}
            {li < HINT_LINES.length - 1 && <br />}
          </span>
        ))}
      </p>

      {drag && (
        <div className={`sz-panel sz-ghost${DIGITS.includes(drag.digit) ? '' : ' is-char'}`} style={{ left: drag.x - 55, top: drag.y - 55 }}>
          {drag.digit}
        </div>
      )}
    </div>
  )
}
