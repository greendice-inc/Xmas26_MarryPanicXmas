import { useRef, useState } from 'react'
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

/** 届いたときの演出：サンタがやって来て、吊るした靴下にプレゼントを入れる */
function DeliveryScene() {
  return (
    <svg className="arrive-scene" viewBox="0 0 800 560" aria-hidden>
      {/* プレゼント（靴下より先に描き、靴下の口に入ると隠れる） */}
      <g className="arrive-slide is-gift">
        <g className="arrive-gift">
          <rect x="455" y="105" width="70" height="58" rx="6" fill="#2a9d5c" stroke="#1d6e40" strokeWidth="4" />
          <rect x="484" y="105" width="12" height="58" fill="#ffd23f" />
          <rect x="455" y="128" width="70" height="12" fill="#ffd23f" />
          <path d="M490 105c-14-18-34-10-24 0zM490 105c14-18 34-10 24 0z" fill="#ffd23f" stroke="#e0a800" strokeWidth="3" />
        </g>
      </g>

      {/* 靴下 */}
      <g className="arrive-sock">
        <path d="M400 0V180" stroke="#c9b48a" strokeWidth="5" />
        <path d="M345 250H455V430Q455 500 385 500H285Q240 500 240 460Q240 422 285 420H345Z" fill="#d62839" stroke="#9d1830" strokeWidth="6" strokeLinejoin="round" />
        <path d="M455 452Q455 500 400 500" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" opacity=".85" />
        <path d="M262 430Q240 440 246 470" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" opacity=".85" />
        <path d="M400 300l9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3z" fill="#fff" opacity=".9" />
        <rect x="328" y="196" width="144" height="58" rx="18" fill="#fff" stroke="#d8d8de" strokeWidth="5" />
      </g>

      {/* サンタ */}
      <g className="arrive-slide">
        <g className="arrive-santa">
          <path d="M565 195Q530 175 505 152" stroke="#d62839" strokeWidth="28" strokeLinecap="round" fill="none" />
          <circle cx="500" cy="150" r="15" fill="#fff" stroke="#d8d8de" strokeWidth="3" />
          <ellipse cx="612" cy="215" rx="72" ry="66" fill="#d62839" stroke="#9d1830" strokeWidth="5" />
          <path d="M612 150V280" stroke="#fff" strokeWidth="14" />
          <rect x="542" y="220" width="140" height="18" fill="#2b2b2e" />
          <rect x="599" y="216" width="26" height="26" rx="4" fill="none" stroke="#ffd23f" strokeWidth="5" />
          <circle cx="612" cy="120" r="42" fill="#f6c9a8" />
          <path d="M566 118Q558 190 612 196Q666 190 658 118Q644 152 612 152Q580 152 566 118Z" fill="#fff" stroke="#e2e2e6" strokeWidth="3" />
          <ellipse cx="598" cy="136" rx="15" ry="8" fill="#fff" stroke="#e2e2e6" strokeWidth="2" />
          <ellipse cx="626" cy="136" rx="15" ry="8" fill="#fff" stroke="#e2e2e6" strokeWidth="2" />
          <circle cx="612" cy="128" r="7" fill="#f08a7e" />
          <circle cx="597" cy="112" r="4.5" fill="#2b2b2e" />
          <circle cx="627" cy="112" r="4.5" fill="#2b2b2e" />
          <path d="M570 96Q596 28 672 48L706 92Q664 70 654 96Z" fill="#d62839" stroke="#9d1830" strokeWidth="4" strokeLinejoin="round" />
          <rect x="562" y="86" width="100" height="22" rx="11" fill="#fff" stroke="#e2e2e6" strokeWidth="3" />
          <circle cx="708" cy="94" r="13" fill="#fff" stroke="#e2e2e6" strokeWidth="3" />
        </g>
      </g>

      {/* キラキラ */}
      <g className="arrive-sparkles" fill="#ffe14d" stroke="#e6a800" strokeWidth="2">
        <path className="sp" d="M215 300q3-16 18-18q-15-3-18-18q-3 15-18 18q15 2 18 18z" />
        <path className="sp" d="M590 330q3-16 18-18q-15-3-18-18q-3 15-18 18q15 2 18 18z" />
        <path className="sp" d="M280 180q2-11 12-12q-10-2-12-12q-2 10-12 12q10 1 12 12z" />
        <path className="sp" d="M530 440q2-11 12-12q-10-2-12-12q-2 10-12 12q10 1 12 12z" />
      </g>
    </svg>
  )
}

/** 注文した商品が届いたときに出る問題。正解すると onSolved が呼ばれる */
export default function ProblemDialog({ order, onSolved, onClose }: { order: Order; onSolved: () => void; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [opened, setOpened] = useState(false)
  const clearing = useRef(false)

  const { products } = useProducts()
  const first = products.find((p) => p.id === (order.items[0]?.id ?? ''))
  const problem = first ? PROBLEMS[first.category] : undefined
  const solved = order.status === 'solved'
  const kana = !!problem && !/^\d+$/.test(problem.answer)
  const mark = nextMark(value)

  const submit = () => {
    if (!problem || clearing.current) return
    if (kanaKey(value) === kanaKey(problem.answer)) {
      clearing.current = true
      onSolved()
    } else setWrong((n) => n + 1)
  }

  if (!solved && !opened) {
    return (
      <div className="sz-dialog-back sz-top">
        <button className="problem-arrive" onClick={() => setOpened(true)}>
          <DeliveryScene />
          <span className="arrive-text">アイテムが届きました。</span>
          <span className="arrive-hint">タップしてひらく</span>
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
        <h2 className="problem-title">宅配ソックスを開けるためにナゾを解こう。</h2>
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
