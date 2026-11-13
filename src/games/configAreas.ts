import { useEffect, useState } from 'react'
import { getBackend } from '../net'

/** ゲーム画面の中のタップ・タッチできる場所。x/y/w/h は画像に対する % */
export interface Area {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

const COL = 'config'
const round = (n: number) => Math.round(n * 10) / 10

function valid<T extends Area>(v: unknown): v is T[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((a) => a && typeof a.id === 'string' && ['x', 'y', 'w', 'h'].every((k) => typeof a[k] === 'number'))
  )
}

/** Firestore（config/{docId}）に保存済みのエリア。無ければ初期値 */
export function useConfigAreas<T extends Area>(docId: string, defaults: T[]): { areas: T[]; saved: boolean } {
  const [areas, setAreas] = useState<T[] | null>(null)
  useEffect(
    () =>
      getBackend().watchDoc<{ areas?: unknown }>(COL, docId, (d) => {
        setAreas(valid<T>(d?.areas) ? d.areas : null)
      }),
    [docId],
  )
  return { areas: areas ?? defaults, saved: !!areas }
}

export function saveConfigAreas<T extends Area>(docId: string, areas: T[]): Promise<void> {
  return getBackend().set(COL, docId, {
    areas: areas.map((a) => ({ ...a, x: round(a.x), y: round(a.y), w: round(a.w), h: round(a.h) })),
    updatedAt: Date.now(),
  })
}

/** 保存を消して初期値に戻す */
export function resetConfigAreas(docId: string): Promise<void> {
  return getBackend().remove(COL, docId)
}

/** 初期値の定数に貼り付けられる形のコード。extra は id・label 以外に書き出す文字列の項目 */
export function areasToCode<T extends Area>(name: string, type: string, areas: T[], extra: (keyof T & string)[] = []): string {
  const rows = areas.map((a) => {
    const fields = [`id: '${a.id}'`, `label: '${a.label}'`, ...extra.map((k) => `${k}: '${String(a[k])}'`)]
    return `  { ${fields.join(', ')}, x: ${round(a.x)}, y: ${round(a.y)}, w: ${round(a.w)}, h: ${round(a.h)} },`
  })
  return `export const ${name}: ${type}[] = [\n${rows.join('\n')}\n]`
}
