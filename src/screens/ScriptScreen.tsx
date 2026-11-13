import { useEffect, useRef, useState } from 'react'
import NovelPart from '../components/NovelPart'
import Stage from '../components/Stage'
import type { Emotion, NovelScene } from '../scenario'
import {
  DEFAULT_CHARS,
  EMOTIONS,
  SCENES,
  SCRIPT_TABS,
  charImage,
  deleteChar,
  deleteSound,
  newId,
  resetScene,
  saveChar,
  saveScene,
  saveSound,
  sceneLines,
  soundUrl,
  toNovelScene,
  useScript,
  type LineKind,
  type ScriptChar,
  type ScriptLine,
  type ScriptSound,
} from '../script/scriptData'

type Tab = 'chars' | (typeof SCRIPT_TABS)[number]

/** 立ち絵を、透明を残したまま Firestore に入る大きさ（長辺 900px の WebP）にする */
function fileToPortrait(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let max = 900
      for (;;) {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const data = canvas.toDataURL('image/webp', 0.86)
        if (data.length < 600_000) return resolve(data)
        if (max < 300) return reject(new Error('画像が大きすぎます'))
        max = Math.round(max * 0.75)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像を読み込めませんでした'))
    }
    img.src = url
  })
}

/** 音のファイルをそのまま data URL にする（Firestore の1件の上限があるので 700KB まで） */
function fileToSound(file: File): Promise<string> {
  if (file.size > 700_000) return Promise.reject(new Error('音のファイルは 700KB までにしてください（mp3 推奨）'))
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('音を読み込めませんでした'))
    r.readAsDataURL(file)
  })
}

const KIND_LABEL: Record<LineKind, string> = { talk: 'セリフ', banner: '中央の文字', mood: 'キモチ' }

/** セリフ編集（?debug=true の /script）。キャラの立ち絵と、場面ごとのセリフ・効果音・音声を決める */
export default function ScriptScreen({ onBack }: { onBack: () => void }) {
  const script = useScript()
  const [tab, setTab] = useState<Tab>('Stage1')
  // 編集中の内容（保存すると消える）
  const [chars, setChars] = useState<ScriptChar[] | null>(null)
  const [dirtyChars, setDirtyChars] = useState<Set<string>>(new Set())
  const [removedChars, setRemovedChars] = useState<Set<string>>(new Set())
  const [scenes, setScenes] = useState<Record<string, ScriptLine[]>>({})
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null)
  const [preview, setPreview] = useState<NovelScene | null>(null)

  const allChars = chars ?? script.chars
  const linesOf = (id: string) => scenes[id] ?? sceneLines(id, script)
  const dirty = dirtyChars.size > 0 || removedChars.size > 0 || Object.keys(scenes).length > 0

  // 閉じる前に、保存していない変更を知らせる
  useEffect(() => {
    if (!dirty) return
    const on = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', on)
    return () => window.removeEventListener('beforeunload', on)
  }, [dirty])

  const editChar = (id: string, patch: Partial<ScriptChar>) => {
    setChars(allChars.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    setDirtyChars((s) => new Set(s).add(id))
  }
  const addChar = () => {
    const c: ScriptChar = { id: newId(), name: '新しいキャラ', images: {} }
    setChars([...allChars, c])
    setDirtyChars((s) => new Set(s).add(c.id))
  }
  const removeChar = (c: ScriptChar) => {
    const used = SCENES.filter((s) => linesOf(s.id).some((l) => l.kind === 'talk' && l.char === c.id))
    const msg = used.length
      ? `「${c.name}」は ${used.map((s) => `${s.tab} ${s.label}`).join('、')} で使われています。削除しますか？`
      : `「${c.name}」を削除しますか？`
    if (!confirm(msg)) return
    setChars(allChars.filter((x) => x.id !== c.id))
    setRemovedChars((s) => new Set(s).add(c.id))
    setDirtyChars((s) => {
      const n = new Set(s)
      n.delete(c.id)
      return n
    })
  }

  const setLines = (id: string, lines: ScriptLine[]) => setScenes((s) => ({ ...s, [id]: lines }))

  const saveAll = async () => {
    setStatus({ text: '保存中…' })
    try {
      await Promise.all([
        ...[...removedChars].map((id) => deleteChar(id)),
        ...allChars.map((c, i) => (dirtyChars.has(c.id) ? saveChar(c, i) : null)).filter(Boolean),
        ...Object.entries(scenes).map(([id, lines]) => saveScene(id, lines)),
      ])
      setChars(null)
      setDirtyChars(new Set())
      setRemovedChars(new Set())
      setScenes({})
      setStatus({ text: '保存しました（ゲームの会話に反映されます）' })
    } catch {
      setStatus({ text: '保存できませんでした。Firestore のルール（script）を確認してください', error: true })
    }
  }

  const back = () => {
    if (dirty && !confirm('保存していない変更があります。破棄して戻りますか？')) return
    onBack()
  }

  const play = (id: string) => {
    const def = SCENES.find((s) => s.id === id)
    if (def) setPreview(toNovelScene(def, linesOf(id), allChars, script.sounds))
  }

  const uploadSound = async (file: File): Promise<string | null> => {
    try {
      const data = await fileToSound(file)
      const s: ScriptSound = { id: newId(), name: file.name, data }
      await saveSound(s)
      return `sound:${s.id}`
    } catch (e) {
      setStatus({ text: e instanceof Error ? e.message : '音を追加できませんでした', error: true })
      return null
    }
  }

  return (
    <div className="catalog-page script-page">
      <header className="catalog-header script-header">
        <div>
          <h1>セリフ編集</h1>
          <p>キャラの立ち絵と、場面ごとのセリフ・効果音・音声を決めます。「保存」するとゲームの会話に反映されます。</p>
        </div>
        <div className="catalog-header-actions">
          {status && <span className={`script-status${status.error ? ' is-error' : ''}`}>{status.text}</span>}
          <button className="catalog-submit" disabled={!dirty} onClick={saveAll}>
            {dirty ? '保存' : '保存済み'}
          </button>
          <button className="catalog-back" onClick={back}>ゲームに戻る</button>
        </div>
      </header>

      <nav className="script-tabs">
        <button className={tab === 'chars' ? 'on' : ''} onClick={() => setTab('chars')}>キャラクター</button>
        {SCRIPT_TABS.map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t}
            {SCENES.some((s) => s.tab === t && scenes[s.id]) && <i>●</i>}
          </button>
        ))}
      </nav>

      {!script.loaded ? (
        <div className="script-body">読み込み中…</div>
      ) : tab === 'chars' ? (
        <div className="script-body">
          <div className="script-chars">
            {allChars.map((c) => (
              <CharCard
                key={c.id}
                c={c}
                dirty={dirtyChars.has(c.id)}
                onEdit={(p) => editChar(c.id, p)}
                onRemove={() => removeChar(c)}
                onError={(text) => setStatus({ text, error: true })}
              />
            ))}
            <button className="script-add-char" onClick={addChar}>＋ キャラクターを追加</button>
          </div>
          <SoundLibrary sounds={script.sounds} />
        </div>
      ) : (
        <div className="script-body">
          {SCENES.filter((s) => s.tab === tab).map((s) => (
            <SceneEditor
              key={s.id}
              title={`${s.tab}　${s.label}`}
              lines={linesOf(s.id)}
              saved={!!script.savedScenes[s.id]}
              edited={!!scenes[s.id]}
              chars={allChars}
              sounds={script.sounds}
              onChange={(lines) => setLines(s.id, lines)}
              onPlay={() => play(s.id)}
              onReset={async () => {
                if (!confirm('保存したセリフを消して、コードに書かれた元のセリフに戻しますか？')) return
                await resetScene(s.id)
                setScenes((all) => {
                  const n = { ...all }
                  delete n[s.id]
                  return n
                })
                setStatus({ text: '元のセリフに戻しました' })
              }}
              onUpload={uploadSound}
            />
          ))}
          {tab === 'Stage4' || tab === 'StageF' ? (
            <p className="script-note">Stage4・StageF はまだ仮のセリフです。ここで決めておくと、作ったときにそのまま使えます。</p>
          ) : null}
        </div>
      )}

      {preview && (
        <div className="script-preview">
          <Stage>
            <div className="screen player">
              <div className="play-frame is-open">
                <NovelPart scene={preview} onFinish={() => setPreview(null)} />
              </div>
            </div>
          </Stage>
          <button className="script-preview-close" onClick={() => setPreview(null)}>閉じる</button>
        </div>
      )}
    </div>
  )
}

function CharCard({
  c,
  dirty,
  onEdit,
  onRemove,
  onError,
}: {
  c: ScriptChar
  dirty: boolean
  onEdit: (p: Partial<ScriptChar>) => void
  onRemove: () => void
  onError: (text: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const target = useRef<Emotion>('真顔')
  const isDefault = DEFAULT_CHARS.some((d) => d.id === c.id)

  const pick = (e: Emotion) => {
    target.current = e
    fileRef.current?.click()
  }
  const onFile = async (file?: File) => {
    if (!file) return
    try {
      const data = await fileToPortrait(file)
      onEdit({ images: { ...c.images, [target.current]: data } })
    } catch (e) {
      onError(e instanceof Error ? e.message : '画像を追加できませんでした')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <section className={`script-char${dirty ? ' is-dirty' : ''}`}>
      <div className="script-char-head">
        <label>
          名前（会話に出る）
          <input value={c.name} onChange={(e) => onEdit({ name: e.target.value })} />
        </label>
        <label>
          メモ（編集画面だけ）
          <input value={c.note ?? ''} placeholder="シルエット など" onChange={(e) => onEdit({ note: e.target.value })} />
        </label>
        <button className="script-danger" onClick={onRemove}>削除</button>
      </div>
      <div className="script-faces">
        {EMOTIONS.map((e) => (
          <div key={e} className="script-face">
            <button className="script-face-img" onClick={() => pick(e)} title="クリックで画像を選ぶ">
              {c.images[e] ? <img src={c.images[e]} alt="" /> : <span>＋画像</span>}
            </button>
            <div className="script-face-label">
              {e}
              {c.images[e] && (
                <button className="script-x" onClick={() => onEdit({ images: { ...c.images, [e]: '' } })} aria-label={`${e}の画像を外す`}>
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <small className="script-hint">
        {isDefault ? '最初からいるキャラです。' : ''}画像が無い表情は「真顔」の画像を使います。透明な PNG もそのまま使えます。
      </small>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </section>
  )
}

function SceneEditor({
  title,
  lines,
  saved,
  edited,
  chars,
  sounds,
  onChange,
  onPlay,
  onReset,
  onUpload,
}: {
  title: string
  lines: ScriptLine[]
  saved: boolean
  edited: boolean
  chars: ScriptChar[]
  sounds: ScriptSound[]
  onChange: (lines: ScriptLine[]) => void
  onPlay: () => void
  onReset: () => void
  onUpload: (file: File) => Promise<string | null>
}) {
  const edit = (i: number, patch: Partial<ScriptLine>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= lines.length) return
    const next = [...lines]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const insert = (at: number, base?: ScriptLine) => {
    const prev = base ?? lines[at - 1]
    const l: ScriptLine = {
      id: newId(),
      kind: 'talk',
      char: prev?.kind === 'talk' ? prev.char : chars[0]?.id,
      emotion: prev?.kind === 'talk' ? prev.emotion : '真顔',
      text: '',
    }
    onChange([...lines.slice(0, at), base ? { ...base, id: newId() } : l, ...lines.slice(at)])
  }
  const remove = (i: number) => onChange(lines.filter((_, j) => j !== i))

  return (
    <section className="script-scene">
      <div className="script-scene-head">
        <h2>{title}</h2>
        <span className="script-badge">{edited ? '未保存の変更あり' : saved ? '保存済み' : 'コードのまま'}</span>
        <div className="script-scene-actions">
          <button onClick={onPlay}>▶ この場面を再生</button>
          {saved && <button onClick={onReset}>元のセリフに戻す</button>}
        </div>
      </div>
      <ol className="script-lines">
        {lines.map((l, i) => (
          <LineRow
            key={l.id}
            n={i + 1}
            line={l}
            chars={chars}
            sounds={sounds}
            first={i === 0}
            last={i === lines.length - 1}
            onEdit={(p) => edit(i, p)}
            onMove={(d) => move(i, d)}
            onInsert={() => insert(i + 1)}
            onCopy={() => insert(i + 1, l)}
            onRemove={() => remove(i)}
            onUpload={onUpload}
          />
        ))}
      </ol>
      <button className="script-add-line" onClick={() => insert(lines.length)}>＋ セリフを追加</button>
    </section>
  )
}

function LineRow({
  n,
  line,
  chars,
  sounds,
  first,
  last,
  onEdit,
  onMove,
  onInsert,
  onCopy,
  onRemove,
  onUpload,
}: {
  n: number
  line: ScriptLine
  chars: ScriptChar[]
  sounds: ScriptSound[]
  first: boolean
  last: boolean
  onEdit: (p: Partial<ScriptLine>) => void
  onMove: (d: number) => void
  onInsert: () => void
  onCopy: () => void
  onRemove: () => void
  onUpload: (file: File) => Promise<string | null>
}) {
  const c = chars.find((x) => x.id === line.char)
  const portrait = line.kind === 'talk' ? charImage(c, line.emotion) : undefined
  return (
    <li className={`script-line kind-${line.kind}`}>
      <div className="script-line-no">{n}</div>
      <div className="script-line-face">{portrait ? <img src={portrait} alt="" /> : <span>{KIND_LABEL[line.kind]}</span>}</div>
      <div className="script-line-main">
        <div className="script-line-row">
          <select
            value={line.kind}
            onChange={(e) => onEdit({ kind: e.target.value as LineKind })}
            disabled={line.kind === 'mood'}
          >
            <option value="talk">セリフ</option>
            <option value="banner">中央の文字</option>
            {line.kind === 'mood' && <option value="mood">キモチ</option>}
          </select>
          {line.kind === 'talk' && (
            <>
              <select value={line.char ?? ''} onChange={(e) => onEdit({ char: e.target.value })}>
                {!c && <option value="">（キャラを選ぶ）</option>}
                {chars.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                    {x.note ? `（${x.note}）` : ''}
                  </option>
                ))}
              </select>
              <div className="script-emotions">
                {EMOTIONS.map((e) => (
                  <button
                    key={e}
                    className={line.emotion === e || (!line.emotion && e === '真顔') ? 'on' : ''}
                    onClick={() => onEdit({ emotion: e })}
                    title={e}
                  >
                    {c?.images[e] ? <img src={c.images[e]} alt="" /> : null}
                    <span>{e}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {line.kind === 'mood' ? (
          <div className="script-mood">
            <b>{line.mood?.name}</b>
            {line.mood?.lines.map((m, i) => (
              <div key={i}>
                {m.who && <small>{m.who}：</small>}
                {m.text}
              </div>
            ))}
            <small className="script-hint">キモチのダイアログ（中身はコードで決めています）</small>
          </div>
        ) : (
          <textarea
            rows={2}
            value={line.text}
            placeholder={line.kind === 'banner' ? '画面の中央に出す文字' : 'セリフ。{ } で囲むと黄色で強調'}
            onChange={(e) => onEdit({ text: e.target.value })}
          />
        )}
        <div className="script-line-row">
          <SoundField label="SE" value={line.se} sounds={sounds} onChange={(v) => onEdit({ se: v })} onUpload={onUpload} />
          <SoundField label="音声" value={line.voice} sounds={sounds} onChange={(v) => onEdit({ voice: v })} onUpload={onUpload} />
          {line.slide && <span className="script-hint">中央に画像あり</span>}
        </div>
      </div>
      <div className="script-line-actions">
        <button onClick={() => onMove(-1)} disabled={first} aria-label="上へ">↑</button>
        <button onClick={() => onMove(1)} disabled={last} aria-label="下へ">↓</button>
        <button onClick={onInsert} title="下にセリフを追加">＋</button>
        <button onClick={onCopy} title="複製">複製</button>
        <button className="script-danger" onClick={onRemove}>削除</button>
      </div>
    </li>
  )
}

function SoundField({
  label,
  value,
  sounds,
  onChange,
  onUpload,
}: {
  label: string
  value?: string
  sounds: ScriptSound[]
  onChange: (v: string | undefined) => void
  onUpload: (file: File) => Promise<string | null>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const url = soundUrl(value, sounds)
  const known = !value || sounds.some((s) => `sound:${s.id}` === value)
  return (
    <div className="script-sound">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(e) => (e.target.value === '+' ? fileRef.current?.click() : onChange(e.target.value || undefined))}>
        <option value="">なし</option>
        {sounds.map((s) => (
          <option key={s.id} value={`sound:${s.id}`}>{s.name}</option>
        ))}
        {!known && <option value={value}>{value}</option>}
        <option value="+">＋ ファイルを追加…</option>
      </select>
      <button disabled={!url} onClick={() => url && new Audio(url).play().catch(() => {})} aria-label={`${label}を鳴らす`}>▶</button>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const ref = await onUpload(f)
          if (ref) onChange(ref)
        }}
      />
    </div>
  )
}

/** アップロードした音の一覧 */
function SoundLibrary({ sounds }: { sounds: ScriptSound[] }) {
  return (
    <section className="script-sounds">
      <h2>アップロードした音（{sounds.length}）</h2>
      <p className="script-hint">セリフの SE・音声の「＋ ファイルを追加…」から増やせます。ここで消すと、使っているセリフからも鳴らなくなります。</p>
      {sounds.map((s) => (
        <div key={s.id} className="script-sound-row">
          <button onClick={() => new Audio(s.data).play().catch(() => {})}>▶</button>
          <span>{s.name}</span>
          <button
            className="script-danger"
            onClick={() => confirm(`「${s.name}」を消しますか？`) && deleteSound(s.id)}
          >
            削除
          </button>
        </div>
      ))}
    </section>
  )
}
