import { GAME_COUNT } from './config'

export interface NovelLine {
  speaker: string
  text: string
}

export interface NovelScene {
  /** 背景画像のパス（public 配下）。未設定ならプレースホルダー */
  background?: string
  /** キャラクター画像のパス。未設定ならプレースホルダー */
  character?: string
  lines: NovelLine[]
}

/** ノベルパートの仮シナリオ。ステージ番号(1始まり)で参照 */
export const NOVEL: NovelScene[] = Array.from({ length: GAME_COUNT }, (_, i) => ({
  lines: [
    { speaker: 'サンタ', text: `ここは部屋${i + 1}だよ。クリスマスの準備が大変なんだ！` },
    { speaker: 'サンタ', text: 'プレゼントを守るために、力を貸してくれないかな？' },
    { speaker: 'サンタ', text: 'まずは、この勝負に勝ってみよう！' },
  ],
}))

export const ENDING: NovelScene = {
  lines: [
    { speaker: 'サンタ', text: 'ありがとう！おかげでクリスマスは大成功だ！' },
    { speaker: 'サンタ', text: 'メリークリスマス！' },
  ],
}
