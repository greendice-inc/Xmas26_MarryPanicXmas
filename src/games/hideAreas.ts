import { areasToCode as toCode, resetConfigAreas, saveConfigAreas, useConfigAreas, type Area } from './configAreas'

/** 隠れているのは誰か。dummy はマネキンで作ったダミー */
export type HideRole = 'amy' | 'jimmy' | 'tommy' | 'dummy'

export const ROLE_LABEL: Record<HideRole, string> = {
  amy: 'アミー',
  jimmy: 'ジミー',
  tommy: 'トミー',
  dummy: 'ダミー',
}

/** ゲーム画面（st2_ゲーム画面_N.png）の中のタップできる場所。x/y/w/h は画像に対する % */
export interface HideArea extends Area {
  role: HideRole
}

/**
 * 初期値。?debug=true のゲーム画面で「エリア編集」から動かして保存すると、
 * Firestore（config/st2Areas）に入り、全端末がそちらを使う。
 * 誰がどこに隠れているかも、編集画面で選び直せる。
 */
export const DEFAULT_HIDE_AREAS: HideArea[] = [
  { id: 'shelf', label: '棚の下', role: 'dummy', x: 11, y: 22, w: 13, h: 36 },
  { id: 'tree', label: 'ツリー', role: 'amy', x: 28, y: 7, w: 24, h: 53 },
  { id: 'present', label: 'プレゼント', role: 'jimmy', x: 52, y: 21, w: 14, h: 28 },
  { id: 'curtain', label: 'カーテン', role: 'tommy', x: 73, y: 46, w: 11, h: 16 },
]

const DOC = 'st2Areas'

/** 保存済みのエリア。無ければ初期値 */
export const useHideAreas = () => useConfigAreas(DOC, DEFAULT_HIDE_AREAS)
export const saveHideAreas = (areas: HideArea[]) => saveConfigAreas(DOC, areas)
/** 保存を消して初期値に戻す */
export const resetHideAreas = () => resetConfigAreas(DOC)
/** DEFAULT_HIDE_AREAS に貼り付けられる形のコード */
export const areasToCode = (areas: HideArea[]) => toCode('DEFAULT_HIDE_AREAS', 'HideArea', areas, ['role'])
