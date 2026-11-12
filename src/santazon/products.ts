/** Santazon の商品データ（仮）。商品名・説明・コード・問題はあとで差し替える */

export type CategoryKey = 'game1' | 'game2' | 'game3' | 'game4' | 'game5' | 'final'

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'game1', label: '第1ゲーム用アイテム' },
  { key: 'game2', label: '第2ゲーム用アイテム' },
  { key: 'game3', label: '第3ゲーム用アイテム' },
  { key: 'game4', label: '第4ゲーム用アイテム' },
  { key: 'game5', label: '第5ゲーム用アイテム' },
  { key: 'final', label: 'ファイナルゲーム用アイテム' },
]

export interface Product {
  id: string
  category: CategoryKey
  name: string
  /** 商品画像（public 配下のパス）。未設定なら絵文字で代用 */
  image?: string
  emoji: string
  /** 1チームあたりの在庫数 */
  stock: number
  /** 詳細検索で入力する4桁のコード */
  code: string
  /** false = リストには載らない（詳細検索でだけ見つかる） */
  listed: boolean
  /** 詳細検索で見られる説明。空なら「準備中」と表示 */
  description: string
}

const p = (
  category: CategoryKey,
  n: number,
  emoji: string,
  name: string,
  code: string,
  stock: number,
  listed: boolean,
  description = '',
): Product => ({ id: `${category}-${n}`, category, emoji, name, code, stock, listed, description })

/** 「1564」→「1-5-6-4」 */
export const formatCode = (code: string) => code.split('').join('-')

export const PRODUCTS: Product[] = [
  p('game1', 1, '💍', '金の指輪', '1564', 1, true),
  p('game1', 2, '➰', '輪ゴム', '2190', 1, true),
  p('game1', 3, '⭕', '20cmのわなげ用リング', '1864', 1, true),
  p('game1', 4, '🎄', 'クリスマスリース', '1839', 1, true),
  p('game1', 5, '🌀', 'フラフープ', '2453', 1, true),
  p('game2', 1, '🧍', 'マネキン', '1311', 0, false),
  p('game2', 2, '🎩', '帽子', '2433', 0, false),
  p('game2', 3, '👕', 'シャツ', '2054', 0, false),
  p('game2', 4, '👖', 'オーバーオール', '1678', 0, false),
  p('game3', 1, '🐧', 'ペンギンのぬいぐるみ', '1926', 1, true),
  p('game3', 2, '🐍', 'ヘビのぬいぐるみ', '1478', 1, true),
  p('game3', 3, '🪿', 'ガチョウのぬいぐるみ', '1620', 1, true),
  p('game4', 1, '🕯️', 'ロウソク3本', '1592', 1, true),
  p('game4', 2, '⛄', 'スノーマン4体', '2367', 1, true),
  p('game4', 3, '🧩', 'ジグソーパズル1箱', '1745', 1, true),
  p('game4', 4, '🍾', 'シャンパン1本', '2129', 1, true),
  p('game4', 5, '🌺', 'ポインセチア5鉢', '1418', 1, true),
  p('game4', 6, '🍷', 'ワイングラス2個', '2286', 1, true),
  p('game4', 7, '🪆', 'マトリョーシカ3体', '1983', 1, true),
  p('game4', 8, '☕', 'ホットココア1杯', '2475', 1, true),
  p('game4', 9, '🍬', 'コンペイトウ1缶', '1536', 1, true),
  p('game4', 10, '🍰', 'ケーキ2個', '2017', 1, true),
  p('game4', 11, '🤹', 'ジャグリングセット', '1221', 5, true),
  p('game4', 12, '🍳', 'おままごとセット', '2271', 5, true),
  p('game4', 13, '✏️', '文房具セット', '1653', 5, true),
  p('game4', 14, '🧭', '探検セット', '2104', 5, true),
  p('final', 1, '🔴', 'レッドボール2個セット', '0002', 1, true),
  p('final', 2, '🔵', 'ブルーボール2個セット', '1795', 1, true),
  p('final', 3, '🟡', 'イエローボール2個セット', '2382', 1, true),
  p('final', 4, '🟢', 'グリーンボール2個セット', '1340', 1, true),
  p('final', 5, '🏠', 'エントツ', '0001', 5, false),
  p('final', 6, '🔐', '金庫', '0001', 5, false),
  p('final', 7, '🏀', 'スーパーボール', '1223', 1, false),
  p('final', 8, '🎁', 'サプライズアイテム', '9999', 1, false),
]

export const productById = (id: string): Product | undefined => PRODUCTS.find((x) => x.id === id)
/** 同じコードの商品が複数ある場合は、すべて返す */
export const productsByCode = (code: string): Product[] => PRODUCTS.filter((x) => x.code === code)

/** 注文後に出す問題（仮）。カテゴリ（注文の先頭の商品）ごとに1問 */
export interface Problem {
  /** 問題画像（public 配下のパス）。未設定ならプレースホルダー */
  image?: string
  answer: string
}

export const PROBLEMS: Record<CategoryKey, Problem> = {
  game1: { answer: '1234' },
  game2: { answer: '1234' },
  game3: { answer: '1234' },
  game4: { answer: '1234' },
  game5: { answer: '1234' },
  final: { answer: '1234' },
}

export const MAX_CART = 3
