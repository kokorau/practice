import type { TrackId } from './Track'
import type { ParamId, Binding, RangeMap } from './Binding'

/**
 * ParamResolver - 強度値を実パラメータ値に変換・通知
 *
 * Player から受け取った intensity (0-1) を Binding 定義に従って
 * 実際のパラメータ値に変換し、差分検知して変更を通知する。
 */
export interface ParamResolver {
  /** 現在の実値を取得 */
  get(paramId: ParamId): number | undefined

  /** 全パラメータの現在値 */
  getAll(): Readonly<Record<ParamId, number>>

  /** パラメータ変更時のコールバック登録 */
  onParamChange(cb: (changedParams: Readonly<Record<ParamId, number>>) => void): () => void
}

/**
 * ParamResolverWriter - ParamResolver の書き込みインターフェース
 */
export interface ParamResolverWriter extends ParamResolver {
  /** Binding 定義を設定 */
  setBindings(bindings: Binding[]): void

  /** 強度を受け取り、実値に変換して保持 */
  update(intensity: Record<TrackId, number>): void

  /** すでにマッピング済みの値を直接設定（Player からの出力用） */
  setParams(params: Record<ParamId, number>): void

  /** 変更を通知（update/setParams 後に呼ぶ） */
  flush(): void
}

/**
 * 線形補間 + clamp
 */
function mapValue(intensity: number, map: RangeMap): number {
  const value = map.min + (map.max - map.min) * intensity
  if (map.clamp) {
    return Math.max(map.min, Math.min(map.max, value))
  }
  return value
}

/**
 * ParamResolver を作成
 */
export function createParamResolver(): ParamResolverWriter {
  let bindings: Binding[] = []
  const current: Record<ParamId, number> = {}
  const pending: Record<ParamId, number> = {}
  const changedInFrame: Record<ParamId, number> = {}
  const listeners = new Set<(changedParams: Readonly<Record<ParamId, number>>) => void>()

  // TrackId → Binding[] のマップ（高速検索用）
  let trackToBindings = new Map<TrackId, Binding[]>()

  function rebuildIndex() {
    trackToBindings = new Map()
    for (const binding of bindings) {
      const list = trackToBindings.get(binding.sourceTrack) || []
      list.push(binding)
      trackToBindings.set(binding.sourceTrack, list)
    }
  }

  return {
    get(paramId: ParamId): number | undefined {
      return current[paramId]
    },

    getAll(): Readonly<Record<ParamId, number>> {
      return current
    },

    onParamChange(cb: (changedParams: Readonly<Record<ParamId, number>>) => void): () => void {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    setBindings(newBindings: Binding[]): void {
      bindings = newBindings
      rebuildIndex()
    },

    update(intensity: Record<TrackId, number>): void {
      // 各 intensity を対応する Binding で実値に変換
      for (const [trackId, value] of Object.entries(intensity)) {
        const bindingsForTrack = trackToBindings.get(trackId as TrackId)
        if (!bindingsForTrack) continue

        for (const binding of bindingsForTrack) {
          const resolvedValue = mapValue(value, binding.map)
          pending[binding.targetParam] = resolvedValue
        }
      }
    },

    setParams(params: Record<ParamId, number>): void {
      // すでにマッピング済みの値を直接設定（Player からの出力がマッピング済みの場合に使用）
      for (const [paramId, value] of Object.entries(params)) {
        pending[paramId as ParamId] = value
      }
    },

    flush(): void {
      // 差分検知
      let hasChanges = false
      for (const [paramId, newValue] of Object.entries(pending)) {
        const oldValue = current[paramId]
        if (oldValue !== newValue) {
          current[paramId] = newValue
          changedInFrame[paramId] = newValue
          hasChanges = true
        }
      }

      // 変更があればコールバック発火
      if (hasChanges) {
        const changes = { ...changedInFrame }
        for (const listener of listeners) {
          listener(changes)
        }
        // changedInFrame をクリア
        for (const key of Object.keys(changedInFrame)) {
          delete changedInFrame[key]
        }
      }
    },
  }
}
