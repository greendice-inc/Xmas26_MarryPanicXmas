
export type Role = 'master' | 'staff' | 'player' | 'keybox'

export interface Identity {
  role: Role
  /** player: チーム番号 1-12 / keybox: 1-2 / それ以外: 0 */
  id: number
}

export function presenceKey(i: Identity): string {
  return i.role === 'player' || i.role === 'keybox' ? `${i.role}-${i.id}` : i.role
}

export interface PresenceDoc {
  lastSeen: number
}

/** novel=会話 / game=ゲーム / clear=クリア後のお礼 / end=エンディング */
export type Phase = 'novel' | 'game' | 'clear' | 'end'

export interface OrderItem {
  id: string
  qty: number
}

/** ordered=届くまでの待ち / delivered=問題を解いている最中 / solved=正解 / wrong=注文の中身を考え直す */
export type OrderStatus = 'ordered' | 'delivered' | 'solved' | 'wrong'

export interface Order {
  items: OrderItem[]
  status: OrderStatus
  at: number
}

export interface TeamDoc {
  started: boolean
  room: number | null
  /** 1..GAME_COUNT */
  stage: number
  phase: Phase
  /** true = メインビジュアルのフタをかけている */
  locked: boolean
  /** マスターが全端末をリセットした時刻（変化したらプレイヤーは最初の画面へ戻る） */
  resetAt?: number
  /** シーンジャンプした時刻（変化したらプレイヤーは画面に入る） */
  enterAt?: number
  /** Santazon の注文（なければ null） */
  order: Order | null
  /** これまでに注文した数（在庫の計算用） */
  orderedQty: OrderItem[]
  /** 詳細検索で調べた商品の id */
  searched: string[]
  /** ステージ1のマーク当てが終わり、子供部屋を見ている */
  markCleared: boolean
  updatedAt: number
}

export const DEFAULT_TEAM: TeamDoc = {
  started: false,
  room: null,
  stage: 1,
  phase: 'novel',
  locked: true,
  order: null,
  orderedQty: [],
  searched: [],
  markCleared: false,
  updatedAt: 0,
}

/** スタッフ画面用の進捗表記: 1-N, 1-G, ... LAST */
export function progressLabel(t: TeamDoc): string {
  if (!t.started) return '未開始'
  if (t.phase === 'end') return 'LAST'
  return `${t.stage}-${t.phase === 'novel' ? 'N' : t.phase === 'game' ? 'G' : 'C'}`
}
