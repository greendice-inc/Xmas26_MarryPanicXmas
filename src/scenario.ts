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
  /** 台詞の代わりに、画面の中央へフェードインさせる表示 */
  banner?: string
  /** キャラクター画像を直接指定する（シルエットなど、表情の決まりに当てはまらない画像） */
  charSrc?: string
  /** 台詞と一緒に、画面の中央へフェードインさせる画像 */
  slide?: string
  /** 台詞の代わりに、ハートを押したときと同じ「キモチ」のダイアログを出す */
  mood?: Mood
}

/** ハートを押したときに出す「キモチ」 */
export interface Mood {
  icon: string
  name: string
  lines: { who?: string; text: string }[]
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

const BASE = import.meta.env.BASE_URL

/** ステージ2：三人兄弟のシルエット（見つかるまではこちらを出す） */
export const st2Silhouette = (emotion: Emotion = '真顔') => `${BASE}character/Stage2/st2_silhouette_${emotion}.png`
/** ステージ2：兄弟ひとりずつの画像 */
export const ST2_KIDS = {
  amy: { name: 'アミー', image: `${BASE}character/Stage2/st2_アミー.png` },
  jimmy: { name: 'ジミー', image: `${BASE}character/Stage2/st2_ジミー.png` },
  tommy: { name: 'トミー', image: `${BASE}character/Stage2/st2_トミー.png` },
} as const
/** ステージ2：ゲーム画面。found は見つけた人数（0〜3） */
export const st2GameImage = (found: number) => `${BASE}BG/Stage2/st2_ゲーム画面_${Math.min(4, found + 1)}.png`

/** ダミー（マネキン）の画像。専用の画像ができるまでは商品カードを使う */
export const MANNEQUIN_IMAGE = `${BASE}slide/st2/card.png`

/** 「記録」から見返せる画像 */
export const RECORDS: Record<string, { title: string; image: string }> = {
  'st2-card': { title: 'マネキンとセーターの商品カード', image: `${BASE}slide/st2/card.png` },
}

/** ステージ2：三人のキモチ。誰がどの名前かはわからないので、アイコンはシルエットのまま */
export const ST2_MOOD: Mood = {
  icon: st2Silhouette('楽'),
  name: 'アミー・ジミー・トミー',
  lines: [
    { who: 'アミー（長男）', text: 'みんながどこに隠れたか知りたいから、一番初めに見つけて欲しいな' },
    { who: 'ジミー（次男）', text: 'お兄ちゃんよりは長く隠れていたいな' },
    { who: 'トミー（三男）', text: '最後に僕とダミーの二人になって、ダミーに引っかかって欲しいな' },
  ],
}

const ST2_KIDS_NAME = 'アミー・ジミー・トミー'

/** ステージ2の導入。三人兄弟（シルエット）とかくれんぼ */
const STAGE2_INTRO: NovelScene = {
  character: 'Stage2',
  background: 'Stage2',
  lines: [
    { speaker: ST2_KIDS_NAME, charSrc: st2Silhouette('楽'), text: 'こんにちは！', emotion: '楽' },
    { speaker: ST2_KIDS_NAME, charSrc: st2Silhouette('楽'), text: '僕たち三人兄弟とかくれんぼで遊ぼうよ！', emotion: '楽' },
    {
      speaker: ST2_KIDS_NAME,
      charSrc: st2Silhouette('真顔'),
      text: 'あ、そうそうさっき注文で子供のマネキンと洋服を2つ買って、ダミーを作ったんだ。',
      slide: RECORDS['st2-card'].image,
    },
    { speaker: ST2_KIDS_NAME, charSrc: st2Silhouette('喜'), text: 'ダミーと合わせて4人で隠れるから、大人のふたりは僕らを見つけてね。', emotion: '喜' },
    { speaker: 'エルフ', character: 'Common', text: 'キモチヨメール使って調べます。', emotion: '真顔' },
    { speaker: '', text: '', mood: ST2_MOOD },
    { speaker: 'エルフ', character: 'Common', text: 'まずは長男のアミーを見つけよう！', emotion: '楽' },
  ],
}

/** ステージ2のクリア。見つかったので、シルエットではない方の画像を出す */
const STAGE2_CLEAR: NovelScene = {
  character: 'Stage2',
  background: 'Stage2',
  lines: [
    { speaker: ST2_KIDS_NAME, text: 'やったー！勝った勝ったー！', emotion: '喜' },
    { speaker: ST2_KIDS_NAME, text: 'すごく楽しかった！遊んでくれてありがとう！', emotion: '楽' },
  ],
}

/** ステージ3：カイ・メイ（ふたりで一枚の画像） */
export const ST3_NAME = 'カイ・メイ'
/** ステージ3：ゲーム画面。1・2は押さえてワード、3は部屋でやるお題 */
export const st3GameImage = (n: 1 | 2 | 3) => `${BASE}BG/Stage3/st3_ゲーム画面_${n}.png`

/** ステージ3：ふたりのキモチ */
export const ST3_MOOD: Mood = {
  icon: characterImage('Stage3', '楽'),
  name: ST3_NAME,
  lines: [
    { who: 'カイ', text: '私たちの考えたゲームを全部解いてほしい！' },
    { who: 'メイ', text: '私たちの考えたゲームを全部解いてほしい！' },
  ],
}

/** ステージ3の導入。カイ・メイと押さえてワード */
const STAGE3_INTRO: NovelScene = {
  character: 'Stage3',
  background: 'Stage3',
  lines: [
    { speaker: ST3_NAME, text: '今回の対戦相手ですね。', emotion: '楽' },
    { speaker: ST3_NAME, text: '私たちの考えたカイ・メイゲームをやってもらいます。', emotion: '喜' },
    { speaker: ST3_NAME, text: '全部クリアできますかね？', emotion: '楽' },
    { speaker: 'エルフ', character: 'Common', text: 'キモチヨメール使用中…', emotion: '真顔' },
    { speaker: '', text: '', mood: ST3_MOOD },
    { speaker: 'エルフ', character: 'Common', text: '頑張ってクリアしましょう。', emotion: '楽' },
  ],
}

/** ノベルパートのシナリオ。添字はステージ番号 - 1（ステージ番号は 1〜GAME_COUNT） */
export const NOVEL: NovelScene[] = Array.from({ length: GAME_COUNT }, (_, i): NovelScene => {
  if (i === 0) return STAGE1_INTRO
  if (i === 1) return STAGE2_INTRO
  if (i === 2) return STAGE3_INTRO
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

/** ステージ1の導入のあとの、エルフと子供の会話 */
const STAGE1_CLEAR: NovelScene = {
  character: 'Stage1',
  background: 'Stage1',
  lines: [
    { speaker: 'エルフ', character: 'Common', text: '無事特定できたみたいですね。', emotion: '真顔' },
    { speaker: '子供', text: 'やったー！いちおくポイントゲット！', emotion: '楽' },
    {
      speaker: 'エルフ',
      character: 'Common',
      text: 'どうやらリンはもうポイントリングを終えちゃったみたいです。一億ポイントもゲットできるマークはないはずですが・・・',
      emotion: '真顔',
    },
    { speaker: '', text: '', banner: 'リン１ポイント' },
    {
      speaker: 'エルフ',
      character: 'Common',
      text: 'やっぱり…1億点取ったと思い込んでいるみたいです。このままだと、ゲームに負けることができないですね…',
      emotion: '哀',
    },
    {
      speaker: 'エルフ',
      character: 'Common',
      text: 'そうだ！Santazonを使いましょう！Santazonを使うと、勝負に必要なアイテムを購入することができるんです！',
      emotion: '楽',
    },
    {
      speaker: 'エルフ',
      character: 'Common',
      text: 'タブレットの左下にある注文ボタンを押すとSantazonのページを開くことができます。',
      emotion: '真顔',
    },
    {
      speaker: 'エルフ',
      character: 'Common',
      text: '必要なアイテムを3つまでカートに追加して、注文確定ボタンを押すと注文したものが宅配ソックスに届きます。',
      emotion: '真顔',
    },
    {
      speaker: 'エルフ',
      character: 'Common',
      text: '宅配ソックスの番号は、注文した後に出てくる謎を解くとわかるようになってます！',
      emotion: '真顔',
    },
    {
      speaker: 'エルフ',
      character: 'Common',
      text: '詳しい説明はSantazonページのSantazonの使い方。ボタンを押してみてください。',
      emotion: '真顔',
    },
    {
      speaker: 'エルフ',
      character: 'Common',
      text: 'では、Santazonを使ってゲームに負ける方法を考えてください！',
      emotion: '楽',
    },
  ],
}

/** ゲームをクリアしたときの会話。添字はステージ番号 - 1 */
export const CLEAR: NovelScene[] = NOVEL.map((n, i): NovelScene => {
  if (i === 0) return STAGE1_CLEAR
  if (i === 1) return STAGE2_CLEAR
  return {
    character: n.character,
    background: n.background,
    lines: [
      { speaker: 'サンタ', text: '{クリア}してくれてありがとう！', emotion: '喜' },
      { speaker: 'サンタ', text: 'おかげで助かったよ！さあ、次へ進もう！', emotion: '楽' },
    ],
  }
})
