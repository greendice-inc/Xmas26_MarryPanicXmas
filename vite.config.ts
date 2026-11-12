import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** ビルド（開発サーバ起動）時点。トップ画面に出して、どの版かを見分ける */
const updatedAt = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).format(new Date())

export default defineConfig({
  plugins: [react()],
  define: { __UPDATED_AT__: JSON.stringify(updatedAt) },
})
