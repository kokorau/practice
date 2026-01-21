import type { ParamId } from '../Binding'
import type { ParamStoreWriter } from '../ParamStore'

/**
 * ParamStore のインメモリ実装
 *
 * - フレームごとに update() で値を受け取り、差分を検知
 * - flush() で変更があったtrackIdをコールバックに通知
 */
export function createParamStore(): ParamStoreWriter {
  const current = new Map<ParamId, number>()
  const pending = new Map<ParamId, number>()
  const changedInFrame = new Set<ParamId>()
  const listeners = new Set<(changedTrackIds: ReadonlySet<ParamId>) => void>()

  return {
    get(trackId: ParamId): number | undefined {
      return current.get(trackId)
    },

    getAll(): ReadonlyMap<ParamId, number> {
      return current
    },

    onFrameEnd(cb: (changedTrackIds: ReadonlySet<ParamId>) => void): () => void {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    update(params: Record<ParamId, number>): void {
      for (const [trackId, value] of Object.entries(params)) {
        pending.set(trackId, value)
      }
    },

    flush(): void {
      changedInFrame.clear()

      // 差分検知
      for (const [trackId, newValue] of pending) {
        const oldValue = current.get(trackId)
        if (oldValue !== newValue) {
          current.set(trackId, newValue)
          changedInFrame.add(trackId)
        }
      }

      // 変更があればコールバック発火
      if (changedInFrame.size > 0) {
        for (const listener of listeners) {
          listener(changedInFrame)
        }
      }
    },
  }
}
