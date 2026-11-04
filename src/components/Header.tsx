import type { ReactNode } from 'react'
import Logo from './Logo'

/** 管理系画面の共通ヘッダー（ロゴ + 画面名 + 右側の任意要素） */
export default function Header({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="app-header">
      <Logo size="sm" />
      <h1 className="app-header-title">{title}</h1>
      <div className="app-header-right">{right}</div>
    </header>
  )
}
