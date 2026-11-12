import type { ComponentType } from 'react'
import { GAME_COUNT } from '../config'
import Janken from './Janken'
import MarkGame from './MarkGame'

export interface GameProps {
  stage: number
  onClear: () => void
}

/** ゲームコンポーネント。添字はステージ番号 - 1。ステージ1はマーク当て、それ以外は仮のじゃんけん */
export const GAMES: ComponentType<GameProps>[] = Array.from({ length: GAME_COUNT }, (_, i) => (i === 0 ? MarkGame : Janken))
