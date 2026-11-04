export type Unsubscribe = () => void

/** コレクション/ドキュメントの薄い抽象。Firestore とローカルを差し替え可能にする */
export interface Backend {
  readonly kind: 'firestore' | 'local'
  /** マージ書き込み */
  set(col: string, id: string, data: Record<string, unknown>): Promise<void>
  watchDoc<T>(col: string, id: string, cb: (data: T | null) => void): Unsubscribe
  watchCol<T>(col: string, cb: (all: Record<string, T>) => void): Unsubscribe
}
