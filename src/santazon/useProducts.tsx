import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getBackend } from '../net'
import { CATEGORIES, PRODUCTS, type CategoryKey, type Product } from './products'

/** 商品は items コレクション。チームの進行データ（teams）とは分ける */
const COL = 'items'

export interface ProductInput {
  category: CategoryKey
  name: string
  code: string
  /** 分母 */
  stock: number
  /** 分子。今ある数 */
  available: number
  listed: boolean
  description: string
  /** 空なら画像なし。データURL */
  image: string
  note: string
}

interface Stored {
  record?: string
  category?: CategoryKey
  name?: string
  code?: string
  stock?: number
  available?: number
  listed?: boolean
  description?: string
  image?: string
  note?: string
  updatedAt?: number
}

const ProductsContext = createContext<{
  /** ゲームが見る一覧。Firestore に1件でもあればそちら、無ければファイルの初期データ */
  products: Product[]
  /** Firestore に入っている商品だけ */
  stored: Product[]
  loaded: boolean
  source: 'cloud' | 'file'
  save: (id: string | null, input: ProductInput) => Promise<void>
  remove: (id: string) => Promise<void>
  importSeed: () => Promise<void>
  /** 同じ番号があれば更新、無ければ新規 */
  importMany: (rows: ProductInput[]) => Promise<{ added: number; updated: number }>
} | null>(null)

function isCategory(v: unknown): v is CategoryKey {
  return CATEGORIES.some((c) => c.key === v)
}

function whole(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : NaN
  return Number.isInteger(n) && n >= 0 ? n : null
}

function toProduct(id: string, d: Stored): Product | null {
  if (!isCategory(d.category) || !d.name) return null
  const stock = whole(d.stock) ?? 0
  return {
    id,
    category: d.category,
    name: d.name,
    code: String(d.code ?? '').replace(/\D/g, ''),
    stock,
    // 分子が未設定の古い商品は、これまで通り分母と同じ数から始める
    available: d.available == null ? stock : (whole(d.available) ?? 0),
    listed: !!d.listed,
    description: d.description ?? '',
    image: d.image || undefined,
    note: d.note ?? '',
  }
}

function byCategory(a: Product, b: Product): number {
  const order = CATEGORIES.map((c) => c.key)
  return order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name, 'ja')
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [cloud, setCloud] = useState<Record<string, Stored> | null>(null)

  useEffect(
    () =>
      getBackend().watchCol<Stored>(COL, (all) => {
        const next: Record<string, Stored> = {}
        for (const [id, data] of Object.entries(all)) {
          if (data) next[id] = data
        }
        setCloud((prev) => {
          if (!prev) return next
          const prevIds = Object.keys(prev)
          const nextIds = Object.keys(next)
          if (prevIds.length === nextIds.length && prevIds.every((id) => prev[id].updatedAt === next[id]?.updatedAt)) return prev
          return next
        })
      }),
    [],
  )

  const stored = useMemo(
    () =>
      Object.entries(cloud ?? {})
        .map(([id, d]) => toProduct(id, d))
        .filter((p): p is Product => !!p)
        .sort(byCategory),
    [cloud],
  )
  const source = stored.length > 0 ? 'cloud' : 'file'
  const products = source === 'cloud' ? stored : PRODUCTS

  const save = async (id: string | null, input: ProductInput) => {
    const docId = id ?? `item-${Date.now().toString(36)}`
    await getBackend().set(COL, docId, {
      category: input.category,
      name: input.name.trim(),
      code: input.code,
      stock: input.stock,
      available: input.available,
      listed: input.listed,
      description: input.description.trim(),
      image: input.image,
      note: input.note.trim(),
      updatedAt: Date.now(),
    })
  }

  const remove = (id: string) => getBackend().remove(COL, id)

  const importSeed = async () => {
    const have = new Set(stored.map((p) => p.id))
    for (const p of PRODUCTS) {
      if (have.has(p.id)) continue
      await getBackend().set(COL, p.id, {
        category: p.category,
        name: p.name,
        code: p.code,
        stock: p.stock,
        available: p.available,
        listed: p.listed,
        description: p.description,
        image: p.image ?? '',
        note: p.note ?? '',
        updatedAt: Date.now(),
      })
    }
  }

  const importMany = async (rows: ProductInput[]) => {
    let added = 0
    let updated = 0
    const known = new Map<string, { id: string; image: string }>(stored.map((p) => [`${p.category}:${p.code}`, { id: p.id, image: p.image ?? '' }] as const))
    for (const input of rows) {
      const key = `${input.category}:${input.code}`
      const hit = known.get(key)
      const id = hit?.id ?? `item-${Date.now().toString(36)}-${added + updated}`
      await getBackend().set(COL, id, {
        category: input.category,
        name: input.name.trim(),
        code: input.code,
        stock: input.stock,
        available: input.available,
        listed: input.listed,
        description: input.description.trim(),
        image: input.image || hit?.image || '',
        note: input.note.trim(),
        updatedAt: Date.now(),
      })
      if (hit) updated += 1
      else {
        added += 1
        known.set(key, { id, image: input.image || '' })
      }
    }
    return { added, updated }
  }

  return (
    <ProductsContext.Provider value={{ products, stored, loaded: cloud !== null, source, save, remove, importSeed, importMany }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts は ProductsProvider の中で使ってください')
  return ctx
}
