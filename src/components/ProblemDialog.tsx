import { useState } from 'react'
import { PROBLEMS } from '../santazon/products'
import { useProducts } from '../santazon/useProducts'
import { characterImage } from '../scenario'
import type { Order } from '../types'

/** 横長の五十音。右からあかさたなはまやらわん。段は上からあいうえお。わは上、をはその列の一番下 */
const KANA_GRID: (string | null)[][] = [
  ['ん', 'わ', 'ら', 'や', 'ま', 'は', 'な', 'た', 'さ', 'か', 'あ'],
  [null, null, 'り', null, 'み', 'ひ', 'に', 'ち', 'し', 'き', 'い'],
  [null, null, 'る', 'ゆ', 'む', 'ふ', 'ぬ', 'つ', 'す', 'く', 'う'],
  [null, null, 'れ', null, 'め', 'へ', 'ね', 'て', 'せ', 'け', 'え'],
  [null, 'を', 'ろ', 'よ', 'も', 'ほ', 'の', 'と', 'そ', 'こ', 'お'],
]

/** 押すたびに 小 → ゛ → ゜ → 元 の順で最後の文字を送る */
const KANA_CYCLES: string[][] = [
  ['あ', 'ぁ'], ['い', 'ぃ'], ['う', 'ぅ', 'ゔ'], ['え', 'ぇ'], ['お', 'ぉ'],
  ['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'],
  ['さ', 'ざ'], ['し', 'じ'], ['す', 'ず'], ['せ', 'ぜ'], ['そ', 'ぞ'],
  ['た', 'だ'], ['ち', 'ぢ'], ['つ', 'っ', 'づ'], ['て', 'で'], ['と', 'ど'],
  ['は', 'ば', 'ぱ'], ['ひ', 'び', 'ぴ'], ['ふ', 'ぶ', 'ぷ'], ['へ', 'べ', 'ぺ'], ['ほ', 'ぼ', 'ぽ'],
  ['や', 'ゃ'], ['ゆ', 'ゅ'], ['よ', 'ょ'], ['わ', 'ゎ'],
]
const SMALL = new Set('ぁぃぅぇぉゃゅょっゎ')
const DAKU = new Set('がぎぐげござじずぜぞだぢづでどばびぶべぼゔ')
const HAN = new Set('ぱぴぷぺぽ')

function cycleLast(value: string) {
  if (!value) return value
  const last = value.slice(-1)
  const seq = KANA_CYCLES.find((s) => s.includes(last))
  if (!seq) return value
  const next = seq[(seq.indexOf(last) + 1) % seq.length]
  return value.slice(0, -1) + next
}

/** カタカナで書かれた解答も、ひらがな入力と揃えて比べる */
function kanaKey(s: string) {
  return s.trim().replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}
function nextMark(value: string): 'small' | 'daku' | 'han' | null {
  if (!value) return null
  const last = value.slice(-1)
  const seq = KANA_CYCLES.find((s) => s.includes(last))
  if (!seq) return null
  const next = seq[(seq.indexOf(last) + 1) % seq.length]
  if (SMALL.has(next)) return 'small'
  if (DAKU.has(next)) return 'daku'
  if (HAN.has(next)) return 'han'
  return null
}

function ProblemVisual({ src, onZoom }: { src?: string; onZoom: () => void }) {
  return (
    <div className="problem-center">
      <div className="problem-frame">
        <button className="problem-zoom" onClick={onZoom} aria-label="問題画像を大きく見る">
          {src ? <img className="sz-problem-img" src={src} alt="" /> : <span className="sz-problem-img placeholder">問題画像</span>}
        </button>
        <button className="problem-mag" onClick={onZoom} aria-label="大きく見る">
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M10.5 8.2v4.6M8.2 10.5h4.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M15.2 15.2 20.4 20.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        </button>
      </div>
    </div>
  )
}

/** 注文した商品が届いたときに出る問題。正解すると onSolved が呼ばれる */
export default function ProblemDialog({ order, onSolved, onClose }: { order: Order; onSolved: () => void; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [opened, setOpened] = useState(false)

  const { products } = useProducts()
  const first = products.find((p) => p.id === (order.items[0]?.id ?? ''))
  const problem = first ? PROBLEMS[first.category] : undefined
  const solved = order.status === 'solved'
  const kana = !!problem && !/^\d+$/.test(problem.answer)
  const mark = nextMark(value)

  const submit = () => {
    if (!problem) return
    if (kanaKey(value) === kanaKey(problem.answer)) onSolved()
    else setWrong((n) => n + 1)
  }

  if (!solved && !opened) {
    return (
      <div className="sz-dialog-back sz-top">
        <button className="problem-arrive" onClick={() => setOpened(true)}>
          アイテムが届きました。
        </button>
        <button className="sz-close" onClick={onClose} aria-label="閉じる">✕</button>
      </div>
    )
  }

  return (
    <div className="sz-dialog-back sz-top">
      <div className={`sz-dialog sz-problem${kana ? ' is-kana' : ''}`}>
        {!solved && (
          <button className="sz-close" onClick={onClose} aria-label="閉じる">✕</button>
        )}
        {solved ? (
          <h2 className="sz-correct">正解！</h2>
        ) : (
          <>
            <h2 className="problem-title">アイテムが届きました。</h2>
            {kana ? (
              <>
                <div className="problem-top">
                  <ProblemVisual src={problem?.image} onZoom={() => setZoom(true)} />
                  <div className="problem-answer">
                    <div className="kana-entry">{value || ' '}</div>
                  </div>
                </div>
                <div className="kana-pad">
                  {KANA_GRID.map((row, r) =>
                    row.map((ch, c) =>
                      ch ? (
                        <button
                          key={ch}
                          className="kana-key"
                          style={{ gridRow: r + 1, gridColumn: c + 1 }}
                          onClick={() => setValue((v) => (v.length >= 10 ? v : v + ch))}
                        >
                          {ch}
                        </button>
                      ) : null,
                    ),
                  )}
                  <button className="kana-cycle" style={{ gridRow: 1, gridColumn: 12 }} onClick={() => setValue(cycleLast)} aria-label="小字・濁点・半濁点">
                    <span className={mark === 'small' ? 'is-on' : ''}>小字</span>
                    <span className={mark === 'daku' ? 'is-on' : ''}>゛</span>
                    <span className={mark === 'han' ? 'is-on' : ''}>゜</span>
                  </button>
                  <button className="kana-side" style={{ gridRow: 2, gridColumn: 12 }} onClick={() => setValue((v) => v.slice(0, -1))} aria-label="バックスペース">⌫</button>
                  <button className="kana-side is-ok" style={{ gridRow: '3 / span 3', gridColumn: 12 }} disabled={!value} onClick={submit}>OK</button>
                </div>
              </>
            ) : (
              <>
                <ProblemVisual src={problem?.image} onZoom={() => setZoom(true)} />
                <div className="sz-answer">
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="数字を入力"
                  />
                  <button className="sz-btn sz-yellow" onClick={submit}>確定</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      {wrong > 0 && (
        <div className="sz-elf-back" onClick={() => setWrong(0)}>
          <div className="sz-elf-line" key={wrong}>
            <img src={characterImage('Common', '真顔')} alt="" />
            <p>
              <span>エルフ</span>
              答えが違うみたい。もう一度考えてみよう。
            </p>
          </div>
        </div>
      )}
      {zoom && (
        <div className="problem-zoom-back" onClick={() => setZoom(false)}>
          {problem?.image ? (
            <img className="problem-zoom-view" src={problem.image} alt="" />
          ) : (
            <div className="problem-zoom-view placeholder">問題画像</div>
          )}
        </div>
      )}
    </div>
  )
}
