import { areasToCode as toCode, resetConfigAreas, saveConfigAreas, useConfigAreas, type Area } from './configAreas'

/** ステージ3の押さえてワード：画面の丸。label がその丸の文字 */
export type WordArea = Area

/**
 * 初期値（画像の青い丸の位置）。?debug=true のゲーム画面で「エリア編集」から動かして保存すると、
 * Firestore（config/st3Areas1・st3Areas2）に入り、全端末がそちらを使う。
 */
export const DEFAULT_WORD_AREAS_1: WordArea[] = [
  { id: 'g1-bu', label: 'ブ', x: 4.2, y: 5.5, w: 15.8, h: 23.2 },
  { id: 'g1-yo', label: 'ヨ', x: 36.1, y: 5.5, w: 15.8, h: 23.2 },
  { id: 'g1-gu', label: 'グ', x: 67.8, y: 5.9, w: 15.8, h: 23.2 },
  { id: 'g1-re', label: 'レ', x: 20.1, y: 40.2, w: 15.8, h: 23.2 },
  { id: 'g1-ri', label: 'リ', x: 51.9, y: 40.2, w: 15.8, h: 23.2 },
  { id: 'g1-n', label: 'ン', x: 83.6, y: 40.2, w: 15.8, h: 23.2 },
  { id: 'g1-ki', label: 'キ', x: 4.2, y: 71.7, w: 15.8, h: 23.2 },
  { id: 'g1-do', label: 'ド', x: 36.1, y: 71.7, w: 15.8, h: 23.2 },
  { id: 'g1-bi', label: 'ビ', x: 67.8, y: 72.1, w: 15.8, h: 23.2 },
]

export const DEFAULT_WORD_AREAS_2: WordArea[] = [
  { id: 'g2-su', label: 'ス', x: 11.8, y: 7.1, w: 13.9, h: 20.6 },
  { id: 'g2-ro', label: 'ロ', x: 55.5, y: 7.1, w: 13.9, h: 20.6 },
  { id: 'g2-tsu', label: 'ッ', x: 32.8, y: 27.9, w: 13.9, h: 20.6 },
  { id: 'g2-bar', label: 'ー', x: 78, y: 30.5, w: 13.9, h: 20.6 },
  { id: 'g2-to', label: 'ト', x: 7.4, y: 47.7, w: 13.9, h: 20.6 },
  { id: 'g2-sa', label: 'サ', x: 53.6, y: 51.3, w: 13.9, h: 20.6 },
  { id: 'g2-ka', label: 'カ', x: 25.9, y: 68.9, w: 13.9, h: 20.6 },
  { id: 'g2-ke', label: 'ケ', x: 76.5, y: 71.5, w: 13.9, h: 20.6 },
]

const DEFAULTS = [DEFAULT_WORD_AREAS_1, DEFAULT_WORD_AREAS_2]
const docId = (game: number) => `st3Areas${game + 1}`

/** game は 0（1ゲーム目）か 1（2ゲーム目） */
export const useWordAreas = (game: number) => useConfigAreas(docId(game), DEFAULTS[game] ?? DEFAULT_WORD_AREAS_1)
export const saveWordAreas = (game: number, areas: WordArea[]) => saveConfigAreas(docId(game), areas)
export const resetWordAreas = (game: number) => resetConfigAreas(docId(game))
export const wordAreasToCode = (game: number, areas: WordArea[]) => toCode(`DEFAULT_WORD_AREAS_${game + 1}`, 'WordArea', areas)
