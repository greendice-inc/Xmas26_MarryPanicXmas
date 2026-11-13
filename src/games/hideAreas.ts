import { useEffect, useState } from 'react'
import { getBackend } from '../net'

/** 隠れているのは誰か。dummy はマネキンで作ったダミー（最後まで正解にならない） */
export type HideRole = 'amy' | 'jimmy' | 'tommy' | 'dummy'

export const ROLE_LABEL: Record<HideRole, string> = {
  amy: 'アミー',
  jimmy: 'ジミー',
  tommy: 'トミー',
  dummy: 'ダミー',
}

/** ゲーム画面（st2_ゲーム画面_N.png）の中のタップできる場所。x/y/w/h は画像に対する % */
export interface HideArea {
  id: string
  label: string
  role: HideRole
  x: number
  y: number
  w: number
  h: number
}

/**
 * 初期値。?debug=true のゲーム画面で「エリア編集」から動かして保存すると、
 * Firestore（config/st2Areas）に入り、全端末がそちらを使う。
 * 誰がどこに隠れているかも、編集画面で選び直せる。
 */
export const DEFAULT_HIDE_AREAS: HideArea[] = [
  { id: 'curtain', label: 'カーテン', role: 'dummy', x: 11, y: 22, w: 13, h: 36 },
  { id: 'tree', label: 'ツリー', role: 'amy', x: 28, y: 7, w: 24, h: 53 },
  { id: 'present', label: 'プレゼント', role: 'jimmy', x: 52, y: 21, w: 14, h: 28 },
  { id: 'shelf', label: '棚の下', role: 'tommy', x: 73, y: 46, w: 11, h: 16 },
]

const COL = 'config'
const DOC = 'st2Areas'

function valid(v: unknown): v is HideArea[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((a) => a && typeof a.id === 'string' && ['x', 'y', 'w', 'h'].every((k) => typeof a[k] === 'number'))
  )
}

/** 保存済みのエリア。無ければ初期値 */
export function useHideAreas(): { areas: HideArea[]; saved: boolean } {
  const [areas, setAreas] = useState<HideArea[] | null>(null)
  useEffect(
    () =>
      getBackend().watchDoc<{ areas?: unknown }>(COL, DOC, (d) => {
        setAreas(valid(d?.areas) ? d.areas : null)
      }),
    [],
  )
  return { areas: areas ?? DEFAULT_HIDE_AREAS, saved: !!areas }
}

export function saveHideAreas(areas: HideArea[]): Promise<void> {
  const round = (n: number) => Math.round(n * 10) / 10
  return getBackend().set(COL, DOC, {
    areas: areas.map((a) => ({ ...a, x: round(a.x), y: round(a.y), w: round(a.w), h: round(a.h) })),
    updatedAt: Date.now(),
  })
}

/** 保存を消して初期値に戻す */
export function resetHideAreas(): Promise<void> {
  return getBackend().remove(COL, DOC)
}

/** DEFAULT_HIDE_AREAS に貼り付けられる形のコード */
export function areasToCode(areas: HideArea[]): string {
  const round = (n: number) => Math.round(n * 10) / 10
  const rows = areas.map(
    (a) =>
      `  { id: '${a.id}', label: '${a.label}', role: '${a.role}', x: ${round(a.x)}, y: ${round(a.y)}, w: ${round(a.w)}, h: ${round(a.h)} },`,
  )
  return `export const DEFAULT_HIDE_AREAS: HideArea[] = [\n${rows.join('\n')}\n]`
}
