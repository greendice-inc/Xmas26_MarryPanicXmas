/** 赤い角丸のロゴバッジ。size で大きさを切り替える */
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`logo logo-${size}`}>MERRY PANIC XMAS</div>
}
