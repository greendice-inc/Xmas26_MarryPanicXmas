import { useState } from 'react'
import { PROBLEMS } from '../santazon/products'
import { useProducts } from '../santazon/useProducts'
import type { Order } from '../types'

/** 注文した商品が届いたときに出る問題。正解すると onSolved が呼ばれる */
export default function ProblemDialog({ order, onSolved }: { order: Order; onSolved: () => void }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(0)

  const { products } = useProducts()
  const first = products.find((p) => p.id === (order.items[0]?.id ?? ''))
  const problem = first ? PROBLEMS[first.category] : undefined
  const solved = order.status === 'solved'

  const submit = () => {
    if (!problem) return
    if (value.trim() === problem.answer) onSolved()
    else setWrong((n) => n + 1)
  }

  return (
    <div className="sz-dialog-back sz-top">
      <div className="sz-dialog sz-problem">
        {solved ? (
          <h2 className="sz-correct">正解！</h2>
        ) : (
          <>
            <h2>アイテムが届きました。</h2>
            {problem?.image ? (
              <img className="sz-problem-img" src={problem.image} alt="" />
            ) : (
              <div className="sz-problem-img placeholder">問題画像</div>
            )}
            <div className="sz-answer">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="数字を入力"
              />
              <button className="sz-btn sz-yellow" onClick={submit}>確定</button>
            </div>
            {wrong > 0 && <div className="sz-wrong" key={wrong}>ちがうみたい…もう一度考えてみよう</div>}
          </>
        )}
      </div>
    </div>
  )
}
