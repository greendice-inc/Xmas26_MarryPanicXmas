/** 商品の初期データ。登録サイトで Firestore に入ったあとは、ゲームはそちらを表示する */

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
  /** 商品画像。未設定なら画像なし */
  image?: string
  /** 在庫の分母。表示は「分子/分母」 */
  stock: number
  /** 在庫の分子。今ある数。注文するとここから減る */
  available: number
  /** リスト追加検索で入力する4桁のコード */
  code: string
  /** false = リストには載らない（リスト追加検索でだけ見つかる） */
  listed: boolean
  /** リスト追加検索で見られる説明。空なら「準備中」と表示 */
  description: string
  /** 登録サイトだけのメモ。プレイヤーには出さない */
  note?: string
}

const p = (
  category: CategoryKey,
  n: number,
  name: string,
  code: string,
  stock: number,
  listed: boolean,
  description = '',
  note = '',
): Product => ({ id: `${category}-${n}`, category, name, code, stock, available: stock, listed, description, note })

/** 「1564」→「1-5-6-4」 */
export const formatCode = (code: string) => code.split('').join('-')

export const PRODUCTS: Product[] = [
  p('game1', 1, '王冠', '1913', 1, true),
  p('game1', 2, 'タンバリン', '2190', 1, true, '', '1で発送'),
  p('game1', 3, 'わなげ用リング', '1864', 0, true),
  p('game1', 4, 'クリスマスリース', '1839', 1, true),
  p('game1', 5, 'フラフープ', '2453', 1, true, '', '1で発送'),
  p('game2', 1, 'マネキン', '2222', 0, false),
  p('game2', 2, 'セーター', '2323', 0, false),
  p('game2', 3, 'オーバーオール', '1678', 0, false),
  p('game3', 1, 'ペンギンのぬいぐるみ', '1926', 1, true, '', '3で発送'),
  p('game3', 2, 'ヘビのぬいぐるみ', '1478', 1, true),
  p('game3', 3, 'ガチョウのぬいぐるみ', '1620', 1, true, '', '3で発送'),
  p('game3', 4, 'クジラのぬいぐるみ', '2106', 1, true),
  p('game4', 1, 'ロウソク3本', '1592', 1, true),
  p('game4', 2, 'スノーマン4体', '2367', 1, true),
  p('game4', 3, 'ジグソーパズル1箱', '1745', 1, true),
  p('game4', 4, 'シャンパン1本', '2129', 1, true),
  p('game4', 5, 'ポインセチア5鉢', '1418', 1, true),
  p('game4', 6, 'サッカーボール7個', '2002', 5, false, '', 'ファイナル1'),
  p('final', 1, 'レッドボール2個', '1020', 0, true, '直径10cmのボール', 'ファイナル2'),
  p('final', 2, 'ブルーボール2個', '0204', 0, true, '直径10cmのボール', 'ファイナル2'),
  p('final', 3, 'イエローボール2個', '2382', 1, true, '直径10cmのボール', 'ファイナル3'),
  p('final', 4, 'グリーンボール2個', '1340', 1, true, '直径10cmのボール', 'ファイナル3'),
  p('final', 5, 'パープルボール2個', '1432', 1, true, '直径10cmのボール'),
  p('final', 6, 'エントツ', '0001', 1, false, '内寸20cm四方の筒', 'ファイナル3'),
  p('final', 7, '金庫', '0025', 5, false, '', 'ファイナル4'),
  p('final', 8, 'スーパーボール', '1200', 1, false, '', 'ファイナル4'),
  p('final', 9, 'サプライズアイテム', '1999', 1, false),
]

export const productById = (id: string): Product | undefined => PRODUCTS.find((x) => x.id === id)
/** 同じコードの商品が複数ある場合は、すべて返す */
export const productsByCode = (code: string): Product[] => PRODUCTS.filter((x) => x.code === code)

/** 注文後に出す問題（仮）。カテゴリ（注文の先頭の商品）ごとに1問 */
export interface Problem {
  /** 問題画像（public 配下のパス）。未設定ならプレースホルダー */
  image?: string
  answer: string
  /** 正解したときに見せる宅配ソックスの4桁 */
  code: string
}

export const PROBLEMS: Record<CategoryKey, Problem> = {
  game1: { answer: 'タンバリン', code: '1111' },
  game2: { answer: '1234', code: '1234' },
  game3: { answer: '1234', code: '3333' },
  game4: { answer: '1234', code: '1234' },
  game5: { answer: '1234', code: '1234' },
  final: { answer: '1234', code: '1234' },
}

export const MAX_CART = 3

/** ステージ1で、勝負に負けるために注文する3つ（王冠・タンバリン・フラフープ） */
const GAME1_LOSE_IDS = ['game1-1', 'game1-2', 'game1-5']

export function isGame1LoseCart(items: { id: string; qty: number }[]): boolean {
  const ids = items.flatMap((i) => Array.from({ length: i.qty }, () => i.id)).sort()
  return ids.join(',') === [...GAME1_LOSE_IDS].sort().join(',')
}

/** ステージ1を終えたあとに、すでに注文済みになっている数 */
export function game1OrderedQty(): { id: string; qty: number }[] {
  return GAME1_LOSE_IDS.map((id) => ({ id, qty: 1 }))
}

/** ステージ3で、椅子を使わずにお題をクリアするために注文する2つ（ペンギン・ダチョウ） */
const STAGE3_IDS = ['game3-1', 'game3-3']

export function isStage3Cart(items: { id: string; qty: number }[]): boolean {
  const ids = items.flatMap((i) => Array.from({ length: i.qty }, () => i.id)).sort()
  return ids.join(',') === [...STAGE3_IDS].sort().join(',')
}

/** ステージ3を終えたあとに、すでに注文済みになっている数 */
export function stage3OrderedQty(): { id: string; qty: number }[] {
  return STAGE3_IDS.map((id) => ({ id, qty: 1 }))
}

/** そのステージの正しい注文か。ステージ3以外は、ステージ1の3つ */
export function isCorrectCart(stage: number, items: { id: string; qty: number }[]): boolean {
  return stage === 3 ? isStage3Cart(items) : isGame1LoseCart(items)
}

/** 正しい注文が届いて正解したら、エルフが番号を出し、待ってから次のステージへ進むステージ */
export const ORDER_STAGES = [1, 3]
