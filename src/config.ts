export const STAGE_W = 1920
export const STAGE_H = 1200

export const TEAM_COUNT = 12
export const KEYBOX_COUNT = 2
export const GAME_COUNT = 6

/** ロック中に全面へかぶせるキービジュアル（public/kv.png） */
export const KV_IMAGE = `${import.meta.env.BASE_URL}kv.png`

/** チーム番号 → 部屋番号（仮。確定したら書き換える） */
export const ROOM_BY_TEAM: Record<number, number> = Object.fromEntries(
  Array.from({ length: TEAM_COUNT }, (_, i) => [i + 1, i + 1]),
)

/** 隠しメニュー：この回数タップで表示 */
export const SECRET_TAP_COUNT = 5
export const SECRET_TAP_WINDOW_MS = 3000

export const HEARTBEAT_MS = 5000
/** この時間 heartbeat が無ければ切断扱い */
export const PRESENCE_TIMEOUT_MS = 15000
