import { GAME_COUNT } from './config'

export type Emotion = '怒' | '喜' | '哀' | '楽' | '真顔'

/** 背景画像のパス。folder は public/BG 配下の 'Stage1' など */
export function backgroundImage(folder: string): string {
  const prefix = 'st' + folder.replace('Stage', '')
  return `${import.meta.env.BASE_URL}BG/${folder}/${prefix}_背景.jpg`
}

export interface NovelLine {
  speaker: string
  text: string
  /** 表情（省略時は真顔） */
  emotion?: Emotion
  /** 文字の大きさ（省略時は md） */
  size?: 'sm' | 'md' | 'lg'
  /** パネルに出す画像（public 配下のパス）。台詞の上に表示 */
  image?: string
  /** この台詞を話すキャラクターのフォルダ名（省略時はシーンの character） */
  character?: string
}

/** キャラクター画像のパス。folder は public/character 配下の 'Stage1'（prefix は st1）や 'Common'（案内役のエルフ、prefix は elf） */
export function characterImage(folder: string, emotion: Emotion = '真顔'): string {
  const prefix = folder === 'Common' ? 'elf' : 'st' + folder.replace('Stage', '')
  return `${import.meta.env.BASE_URL}character/${folder}/${prefix}_${emotion}.png`
}

export interface NovelScene {
  /** 背景のフォルダ名（public/BG 配下。例: 'Stage1'）。未設定ならプレースホルダー */
  background?: string
  /** キャラクターのフォルダ名（public/character 配下。例: 'Stage1'）。未設定ならプレースホルダー */
  character?: string
  lines: NovelLine[]
}

/** ステージ1の導入。案内役のエルフと子供（Stage1）の会話 */
const STAGE1_INTRO: NovelScene = {
  character: 'Stage1',
  background: 'Stage1',
  lines: [
    { speaker: 'エルフ', character: 'Common', text: 'こんにちは！{笑顔}にしましょう！', emotion: '楽' },
    { speaker: 'エルフ', character: 'Common', text: '{ルール}を説明するね。詳しいルールは後ろのラミネートを取ってね。', emotion: '真顔' },
    { speaker: '子供', text: 'こんにちは', emotion: '真顔' },
    { speaker: '子供', text: '僕の{対戦相手}だね。', emotion: '楽' },
    { speaker: 'エルフ', character: 'Common', text: 'まずはどの{マーク}が何点なのか特定しよう。', emotion: '真顔' },
  ],
}

/** ノベルパートのシナリオ。添字はステージ番号 - 1（ステージ番号は 1〜GAME_COUNT） */
export const NOVEL: NovelScene[] = Array.from({ length: GAME_COUNT }, (_, i): NovelScene => {
  if (i === 0) return STAGE1_INTRO
  // 素材が揃っているのは Stage1〜4。5以降は仮で Stage1 を使う
  return {
    character: `Stage${i < 4 ? i + 1 : 1}`,
    background: `Stage${i < 4 ? i + 1 : 1}`,
    lines: [
      { speaker: 'サンタ', text: `ここは部屋${i + 1}だよ。クリスマスの準備が大変なんだ！`, emotion: '哀' },
      { speaker: 'サンタ', text: 'プレゼントを守るために、力を貸してくれないかな？', emotion: '真顔' },
      { speaker: 'サンタ', text: 'まずは、この勝負に勝ってみよう！', emotion: '楽' },
    ],
  }
})

export const ENDING: NovelScene = {
  character: 'StageF',
  background: 'StageF',
  lines: [
    { speaker: 'サンタ', text: 'ありがとう！おかげでクリスマスは大成功だ！', emotion: '喜' },
    { speaker: 'サンタ', text: 'メリークリスマス！', emotion: '楽' },
  ],
}

/** ゲームをクリアしたときの、キャラクターからのお礼。添字はステージ番号 - 1 */
export const CLEAR: NovelScene[] = NOVEL.map((n) => ({
  character: n.character,
  background: n.background,
  lines: [
    { speaker: 'サンタ', text: '{クリア}してくれてありがとう！', emotion: '喜' },
    { speaker: 'サンタ', text: 'おかげで助かったよ！さあ、次へ進もう！', emotion: '楽' },
  ],
}))
