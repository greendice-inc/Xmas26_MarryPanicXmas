import { GAME_COUNT } from './config'

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

export type Phase = 'novel' | 'game' | 'end'

export interface TeamDoc {
  started: boolean
  room: number | null
  /** 1..GAME_COUNT */
  stage: number
  phase: Phase
  /** true = メインビジュアルのフタをかけている */
  locked: boolean
  updatedAt: number
}

export const DEFAULT_TEAM: TeamDoc = {
  started: false,
  room: null,
  stage: 1,
  phase: 'novel',
  locked: true,
  updatedAt: 0,
}

/** スタッフ画面用の進捗表記: 1-N, 1-G, ... LAST */
export function progressLabel(t: TeamDoc): string {
  if (!t.started) return '未開始'
  if (t.phase === 'end') return 'LAST'
  return `${Math.min(t.stage, GAME_COUNT)}-${t.phase === 'novel' ? 'N' : 'G'}`
}
