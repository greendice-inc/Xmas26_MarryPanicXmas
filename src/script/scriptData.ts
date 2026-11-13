import { useEffect, useMemo, useState } from 'react'
import { getBackend } from '../net'
import {
  CLEAR,
  ENDING,
  NOVEL,
  characterImage,
  st2Silhouette,
  ST2_KIDS,
  type Emotion,
  type Mood,
  type NovelLine,
  type NovelScene,
} from '../scenario'

/**
 * セリフ編集（?debug=true の /script）で作るデータ。
 * Firestore の script コレクションに、キャラ（char-*）・場面（scene-*）・音（sound-*）を1件ずつ入れる。
 * 保存されていないものは、コードに書かれた今のセリフ（scenario.ts）を使う。
 */

export const EMOTIONS: Emotion[] = ['喜', '怒', '哀', '楽', '真顔']

export interface ScriptChar {
  id: string
  /** 会話で表示する名前 */
  name: string
  /** 編集画面だけのメモ（シルエットなど、同じ名前のキャラを見分ける） */
  note?: string
  /** 表情ごとの立ち絵（public のパスか、アップロードした画像） */
  images: Partial<Record<Emotion, string>>
}

/** talk=セリフ / banner=画面中央の文字 / mood=キモチのダイアログ */
export type LineKind = 'talk' | 'banner' | 'mood'

export interface ScriptLine {
  id: string
  kind: LineKind
  char?: string
  emotion?: Emotion
  text: string
  size?: 'sm' | 'md' | 'lg'
  /** 効果音・音声。public のパスか「sound:<id>」 */
  se?: string
  voice?: string
  /** 台詞と一緒に中央へ出す画像 */
  slide?: string
  image?: string
  mood?: Mood
}

export interface ScriptSound {
  id: string
  name: string
  data: string
}

export interface SceneDef {
  id: string
  /** タブ（Stage1 など） */
  tab: string
  label: string
  base: NovelScene
}

export const SCRIPT_TABS = ['Stage1', 'Stage2', 'Stage3', 'Stage4', 'StageF'] as const

/** 編集できる場面 */
export const SCENES: SceneDef[] = [
  { id: 'st1-intro', tab: 'Stage1', label: '導入', base: NOVEL[0] },
  { id: 'st1-clear', tab: 'Stage1', label: 'クリア後', base: CLEAR[0] },
  { id: 'st2-intro', tab: 'Stage2', label: '導入', base: NOVEL[1] },
  { id: 'st2-clear', tab: 'Stage2', label: 'クリア後', base: CLEAR[1] },
  { id: 'st3-intro', tab: 'Stage3', label: '導入', base: NOVEL[2] },
  { id: 'st4-intro', tab: 'Stage4', label: '導入', base: NOVEL[3] },
  { id: 'st4-clear', tab: 'Stage4', label: 'クリア後', base: CLEAR[3] },
  { id: 'stF-ending', tab: 'StageF', label: 'エンディング', base: ENDING },
]

/** ステージと場面（会話 / クリア / エンディング）から、編集できる場面の id */
export function sceneIdFor(stage: number, phase: 'novel' | 'clear' | 'end'): string | null {
  if (phase === 'end') return 'stF-ending'
  const id = `st${stage}-${phase === 'novel' ? 'intro' : 'clear'}`
  return SCENES.some((s) => s.id === id) ? id : null
}

const folderImages = (folder: string): ScriptChar['images'] =>
  Object.fromEntries(EMOTIONS.map((e) => [e, characterImage(folder, e)]))
const sameImage = (src: string): ScriptChar['images'] => Object.fromEntries(EMOTIONS.map((e) => [e, src]))

/** 今のコードにいるキャラ */
export const DEFAULT_CHARS: ScriptChar[] = [
  { id: 'elf', name: 'エルフ', note: '案内役', images: folderImages('Common') },
  { id: 'st1', name: '子供', note: 'ステージ1', images: folderImages('Stage1') },
  {
    id: 'st2s',
    name: 'アミー・ジミー・トミー',
    note: 'ステージ2（シルエット）',
    images: Object.fromEntries(EMOTIONS.map((e) => [e, st2Silhouette(e)])),
  },
  { id: 'st2', name: 'アミー・ジミー・トミー', note: 'ステージ2', images: folderImages('Stage2') },
  { id: 'amy', name: 'アミー', note: 'ステージ2', images: sameImage(ST2_KIDS.amy.image) },
  { id: 'jimmy', name: 'ジミー', note: 'ステージ2', images: sameImage(ST2_KIDS.jimmy.image) },
  { id: 'tommy', name: 'トミー', note: 'ステージ2', images: sameImage(ST2_KIDS.tommy.image) },
  { id: 'st3', name: 'カイ・メイ', note: 'ステージ3', images: folderImages('Stage3') },
  { id: 'st4', name: 'サンタ', note: 'ステージ4', images: folderImages('Stage4') },
  { id: 'stF', name: 'サンタ', note: 'エンディング', images: folderImages('StageF') },
]

const FOLDER_CHAR: Record<string, string> = {
  Common: 'elf',
  Stage1: 'st1',
  Stage2: 'st2',
  Stage3: 'st3',
  Stage4: 'st4',
  StageF: 'stF',
}

export const newId = () => Math.random().toString(36).slice(2, 10)

/** コードに書かれた場面を、編集用の行にする */
export function linesFromScene(scene: NovelScene): ScriptLine[] {
  return scene.lines.map((l, i): ScriptLine => {
    const id = `d${i}`
    if (l.mood) return { id, kind: 'mood', text: '', mood: l.mood }
    if (l.banner) return { id, kind: 'banner', text: l.banner }
    const folder = l.character ?? scene.character ?? ''
    const char = l.charSrc?.includes('silhouette') ? 'st2s' : FOLDER_CHAR[folder] ?? 'elf'
    return {
      id,
      kind: 'talk',
      char,
      emotion: l.emotion ?? '真顔',
      text: l.text,
      size: l.size,
      slide: l.slide,
      image: l.image,
    }
  })
}

/** 立ち絵。その表情が無ければ真顔、それも無ければ最初の1枚 */
export function charImage(c: ScriptChar | undefined, e: Emotion = '真顔'): string | undefined {
  if (!c) return undefined
  return c.images[e] || c.images['真顔'] || EMOTIONS.map((x) => c.images[x]).find(Boolean)
}

export interface ScriptState {
  loaded: boolean
  chars: ScriptChar[]
  /** 保存済みの場面（無いものはコードのまま） */
  savedScenes: Record<string, ScriptLine[]>
  sounds: ScriptSound[]
  /** 保存済みのキャラ id */
  savedChars: Set<string>
}

type Doc =
  | ({ kind: 'char'; deleted?: boolean; order?: number } & ScriptChar)
  | { kind: 'scene'; lines: ScriptLine[] }
  | ({ kind: 'sound' } & ScriptSound)

const COL = 'script'

/** script コレクションを読む */
export function useScript(): ScriptState {
  const [all, setAll] = useState<Record<string, Doc> | null>(null)
  useEffect(() => getBackend().watchCol<Doc>(COL, setAll), [])
  return useMemo(() => {
    const docs = all ?? {}
    const savedChars = new Set<string>()
    const charDocs = new Map<string, Doc & { kind: 'char' }>()
    const savedScenes: Record<string, ScriptLine[]> = {}
    const sounds: ScriptSound[] = []
    for (const [key, d] of Object.entries(docs)) {
      if (!d) continue
      if (d.kind === 'char') {
        charDocs.set(d.id, d)
        savedChars.add(d.id)
      } else if (d.kind === 'scene' && Array.isArray(d.lines)) savedScenes[key.replace(/^scene-/, '')] = d.lines
      else if (d.kind === 'sound') sounds.push({ id: d.id, name: d.name, data: d.data })
    }
    // 最初からいるキャラは保存で上書き。足したキャラは後ろに並べる
    const chars: ScriptChar[] = []
    for (const c of DEFAULT_CHARS) {
      const s = charDocs.get(c.id)
      if (s?.deleted) continue
      chars.push(s ? strip(s) : c)
    }
    const added = [...charDocs.values()]
      .filter((c) => !c.deleted && !DEFAULT_CHARS.some((d) => d.id === c.id))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    chars.push(...added.map(strip))
    sounds.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    return { loaded: !!all, chars, savedScenes, sounds, savedChars }
  }, [all])
}

function strip(d: ScriptChar & { kind?: string; deleted?: boolean; order?: number }): ScriptChar {
  return { id: d.id, name: d.name, note: d.note, images: d.images ?? {} }
}

export const saveChar = (c: ScriptChar, order: number) =>
  getBackend().set(COL, `char-${c.id}`, { kind: 'char', ...c, note: c.note ?? '', deleted: false, order, updatedAt: Date.now() })
/** 消す。最初からいるキャラは「消した」印を残す */
export const deleteChar = (id: string) =>
  DEFAULT_CHARS.some((c) => c.id === id)
    ? getBackend().set(COL, `char-${id}`, { kind: 'char', id, name: '', images: {}, deleted: true, updatedAt: Date.now() })
    : getBackend().remove(COL, `char-${id}`)
export const saveScene = (id: string, lines: ScriptLine[]) =>
  // Firestore は undefined を入れられないので、JSON を通して落とす
  getBackend().set(COL, `scene-${id}`, { kind: 'scene', lines: JSON.parse(JSON.stringify(lines)), updatedAt: Date.now() })
/** 保存を消して、コードに書かれたセリフに戻す */
export const resetScene = (id: string) => getBackend().remove(COL, `scene-${id}`)
export const saveSound = (s: ScriptSound) => getBackend().set(COL, `sound-${s.id}`, { kind: 'sound', ...s, updatedAt: Date.now() })
export const deleteSound = (id: string) => getBackend().remove(COL, `sound-${id}`)

/** 「sound:<id>」を再生できる URL にする */
export function soundUrl(ref: string | undefined, sounds: ScriptSound[]): string | undefined {
  if (!ref) return undefined
  if (ref.startsWith('sound:')) return sounds.find((s) => s.id === ref.slice(6))?.data
  return ref
}

/** 場面の行（保存済み or コード）を、ゲームで流す形にする */
export function toNovelScene(def: SceneDef, lines: ScriptLine[], chars: ScriptChar[], sounds: ScriptSound[]): NovelScene {
  return {
    background: def.base.background,
    character: def.base.character,
    lines: lines.map((l): NovelLine => {
      const extra = { se: soundUrl(l.se, sounds), voice: soundUrl(l.voice, sounds) }
      if (l.kind === 'mood' && l.mood) return { speaker: '', text: '', mood: l.mood, ...extra }
      if (l.kind === 'banner') return { speaker: '', text: '', banner: l.text, ...extra }
      const c = chars.find((x) => x.id === l.char)
      return {
        speaker: c?.name ?? '',
        text: l.text,
        emotion: l.emotion,
        size: l.size,
        charSrc: charImage(c, l.emotion),
        slide: l.slide,
        image: l.image,
        ...extra,
      }
    }),
  }
}

export const sceneLines = (id: string, state: ScriptState): ScriptLine[] => {
  const def = SCENES.find((s) => s.id === id)
  return state.savedScenes[id] ?? (def ? linesFromScene(def.base) : [])
}

/**
 * ゲームで流す場面。セリフ編集で場面かキャラを保存していれば、そちらから作る。
 * どちらも無ければ null（コードのまま）
 */
export function useScriptScene(stage: number, phase: 'novel' | 'clear' | 'end' | 'game'): NovelScene | null {
  const state = useScript()
  return useMemo(() => {
    if (phase === 'game') return null
    const id = sceneIdFor(stage, phase)
    const def = SCENES.find((s) => s.id === id)
    if (!def || !id) return null
    if (!state.savedScenes[id] && state.savedChars.size === 0) return null
    return toNovelScene(def, sceneLines(id, state), state.chars, state.sounds)
  }, [state, stage, phase])
}
