import type { ComponentType } from 'react'
import { GAME_COUNT } from '../config'
import Janken from './Janken'

export interface GameProps {
  stage: number
  onClear: () => void
}

/** ステージ番号(1始まり) → ゲームコンポーネント。後で各ゲームに差し替える */
export const GAMES: ComponentType<GameProps>[] = Array.from({ length: GAME_COUNT }, () => Janken)
