import { useRef, useState } from 'react'
import Header from '../components/Header'

/** USB接続（Web Serial API）。実際のプロトコルは後で決める */
export default function KeyboxScreen({ id }: { id: number }) {
  const [log, setLog] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const portRef = useRef<SerialPort | null>(null)
  const supported = 'serial' in navigator

  const push = (s: string) => setLog((l) => [...l.slice(-49), `${new Date().toLocaleTimeString()}  ${s}`])

  const connect = async () => {
    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 115200 })
      portRef.current = port
      setConnected(true)
      push('接続しました')
      const reader = port.readable!.pipeThrough(new TextDecoderStream()).getReader()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += value
        const lines = buf.split(/\r?\n/)
        buf = lines.pop() ?? ''
        lines.filter(Boolean).forEach((l) => push(`受信: ${l}`))
      }
    } catch (e) {
      push(`エラー: ${(e as Error).message}`)
    } finally {
      setConnected(false)
    }
  }

  return (
    <div className="screen keybox">
      <Header title={`キーボックス ${id}`} />
      {!supported && <p className="warn">このブラウザは Web Serial に未対応です（Chrome / Edge を使用）</p>}
      <button className="big" disabled={!supported || connected} onClick={connect}>
        {connected ? 'USB 接続中' : 'USB に接続'}
      </button>
      <pre className="log">{log.join('\n')}</pre>
    </div>
  )
}
