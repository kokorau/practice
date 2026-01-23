import type { TrackId } from './Track'

/**
 * IntensityProvider - Timeline トラックの intensity (0-1) を提供するインターフェース
 *
 * PropertyResolver で RangeExpr を解決するために使用される。
 * 変更通知機能を持ち、リアクティブなレンダリング更新をサポートする。
 */
export interface IntensityProvider {
  /** 特定トラックの intensity (0-1) を取得 */
  get(trackId: string): number | undefined

  /** 全トラックの現在の intensity を取得 */
  getAll(): Readonly<Record<string, number>>

  /** intensity 変更時のコールバック登録 */
  onIntensityChange(cb: (changed: Record<string, number>) => void): () => void
}

/**
 * IntensityProviderWriter - IntensityProvider の書き込みインターフェース
 *
 * Timeline Player から呼び出される。
 */
export interface IntensityProviderWriter extends IntensityProvider {
  /** intensity を設定（pending に保持） */
  setIntensities(intensities: Record<TrackId, number>): void

  /** pending の変更を確定して通知 */
  flush(): void
}

/**
 * IntensityProvider を作成
 *
 * @example
 * ```ts
 * const provider = createIntensityProvider()
 *
 * // Subscribe to changes
 * provider.onIntensityChange((changed) => {
 *   console.log('Changed:', changed)
 * })
 *
 * // Update intensities (from Timeline Player)
 * provider.setIntensities({ 'track-1': 0.5, 'track-2': 0.8 })
 * provider.flush() // Triggers notification
 * ```
 */
export function createIntensityProvider(): IntensityProviderWriter {
  const current: Record<string, number> = {}
  const pending: Record<string, number> = {}
  const listeners = new Set<(changed: Record<string, number>) => void>()

  return {
    get(trackId: string): number | undefined {
      return current[trackId]
    },

    getAll(): Readonly<Record<string, number>> {
      return current
    },

    onIntensityChange(cb: (changed: Record<string, number>) => void): () => void {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    setIntensities(intensities: Record<TrackId, number>): void {
      Object.assign(pending, intensities)
    },

    flush(): void {
      const changed: Record<string, number> = {}
      let hasChanges = false

      for (const [trackId, newValue] of Object.entries(pending)) {
        if (current[trackId] !== newValue) {
          current[trackId] = newValue
          changed[trackId] = newValue
          hasChanges = true
        }
      }

      if (hasChanges) {
        for (const listener of listeners) {
          listener(changed)
        }
      }
    },
  }
}
