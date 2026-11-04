import { useEffect, useState, type ReactNode } from 'react'
import { STAGE_H, STAGE_W } from '../config'

/** 1920x1200 の「大きな板」を作り、ウィンドウに収まるよう拡縮して中央に置く */
export default function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return (
    <div className="viewport">
      <div
        className="stage"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          left: (window.innerWidth - STAGE_W * scale) / 2,
          top: (window.innerHeight - STAGE_H * scale) / 2,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
