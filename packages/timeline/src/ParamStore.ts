import type { ParamId } from './Binding'

/**
 * ParamStore - Timeline評価結果の保持・通知
 *
 * Timeline の track 評価結果（0-1 の正規化値）を保持し、
 * フレーム単位で変更を通知する。
 */
export interface ParamStore {
  /** 現在の値を取得 (0-1) */
  get(trackId: ParamId): number | undefined

  /** 全trackの現在値 */
  getAll(): ReadonlyMap<ParamId, number>

  /** フレーム終了時のコールバック登録 */
  onFrameEnd(cb: (changedTrackIds: ReadonlySet<ParamId>) => void): () => void
}

/**
 * ParamStoreWriter - ParamStore の書き込みインターフェース
 *
 * TimelinePlayer からの更新を受け付け、変更を検知してコールバックを発火する。
 */
export interface ParamStoreWriter extends ParamStore {
  /** FrameState の params から更新（内部で diff 検知） */
  update(params: Record<ParamId, number>): void

  /** フレーム終了を通知（変更があればコールバック発火） */
  flush(): void
}
