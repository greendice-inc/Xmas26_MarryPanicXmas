import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getBackend } from '../net'
import { CATEGORIES, PRODUCTS, type CategoryKey, type Product } from './products'

/** 商品は teams コレクションの文書。会場のルールがこのコレクションへの書き込みだけを許している */
const COL = 'teams'
const productKey = (id: string) => `p~${id}`

export interface ProductInput {
  category: CategoryKey
  name: string
  code: string
  stock: number
  listed: boolean
  description: string
  /** 空なら画像なし。データURL */
  image: string
  note: string
  emoji?: string
}

interface Stored {
  record?: string
  category?: CategoryKey
  name?: string
  code?: string
  stock?: number
  listed?: boolean
  description?: string
  image?: string
  note?: string
  emoji?: string
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
} | null>(null)

function isCategory(v: unknown): v is CategoryKey {
  return CATEGORIES.some((c) => c.key === v)
}

function toProduct(id: string, d: Stored): Product | null {
  if (!isCategory(d.category) || !d.name) return null
  return {
    id,
    category: d.category,
    name: d.name,
    code: String(d.code ?? '').replace(/\D/g, ''),
    stock: Number(d.stock) || 0,
    listed: !!d.listed,
    description: d.description ?? '',
    image: d.image || undefined,
    note: d.note ?? '',
    emoji: d.emoji || '🎁',
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
          if (!id.startsWith('p~') || data?.record !== 'product') continue
          next[id.slice(2)] = data
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
    const prev = id ? stored.find((p) => p.id === id) : undefined
    await getBackend().set(COL, productKey(docId), {
      record: 'product',
      category: input.category,
      name: input.name.trim(),
      code: input.code,
      stock: input.stock,
      listed: input.listed,
      description: input.description.trim(),
      image: input.image,
      note: input.note.trim(),
      emoji: input.emoji || prev?.emoji || '🎁',
      updatedAt: Date.now(),
    })
  }

  const remove = (id: string) => getBackend().remove(COL, productKey(id))

  const importSeed = async () => {
    const have = new Set(stored.map((p) => p.id))
    for (const p of PRODUCTS) {
      if (have.has(p.id)) continue
      await getBackend().set(COL, productKey(p.id), {
        record: 'product',
        category: p.category,
        name: p.name,
        code: p.code,
        stock: p.stock,
        listed: p.listed,
        description: p.description,
        image: p.image ?? '',
        note: p.note ?? '',
        emoji: p.emoji,
        updatedAt: Date.now(),
      })
    }
  }

  return (
    <ProductsContext.Provider value={{ products, stored, loaded: cloud !== null, source, save, remove, importSeed }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts は ProductsProvider の中で使ってください')
  return ctx
}
