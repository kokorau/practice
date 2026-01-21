import type { ParamId } from './Track'

/**
 * ParamResolver - パラメータ変更の通知管理
 *
 * Player から受け取った計算済みパラメータ値を保持し、
 * 差分検知して変更を通知する。
 *
 * DSL移行により、Bindingによるマッピングは不要になった。
 * Playerが直接最終値を出力するため、ParamResolverは変更通知のみを担当。
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
  /** パラメータ値を設定（Player からの出力用） */
  setParams(params: Record<ParamId, number>): void

  /** 変更を通知（setParams 後に呼ぶ） */
  flush(): void
}

/**
 * ParamResolver を作成
 */
export function createParamResolver(): ParamResolverWriter {
  const current: Record<ParamId, number> = {}
  const pending: Record<ParamId, number> = {}
  const changedInFrame: Record<ParamId, number> = {}
  const listeners = new Set<(changedParams: Readonly<Record<ParamId, number>>) => void>()

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

    setParams(params: Record<ParamId, number>): void {
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
