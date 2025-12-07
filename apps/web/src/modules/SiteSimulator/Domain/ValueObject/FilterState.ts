import type { Filter, Lut3D } from '../../../Filter/Domain'
import { $Filter, $Lut3D, $Lut1D, type Lut } from '../../../Filter/Domain'

/**
 * FilterState - フィルターの完全な状態
 *
 * useFilter が内部で持つ状態と同等の情報を ValueObject として保持。
 * SiteBlueprint の一部として使用される。
 */
export type FilterState = {
  /** カーブ＋Adjustment */
  readonly filter: Filter
  /** フィルター強度 (0.0〜1.0) */
  readonly intensity: number
  /** 適用中のプリセットID (null = カスタム) */
  readonly presetId: string | null
  /** 3D LUT (プリセットで指定された場合) */
  readonly lut3d: Lut3D | null
}

export const $FilterState = {
  /** デフォルト状態（無変換） */
  identity(pointCount: number = 7): FilterState {
    return {
      filter: $Filter.identity(pointCount),
      intensity: 1.0,
      presetId: null,
      lut3d: null,
    }
  },

  /** Filter を更新 */
  setFilter(state: FilterState, filter: Filter): FilterState {
    return {
      ...state,
      filter,
      presetId: null, // カスタム編集時はプリセットをクリア
      lut3d: null,
    }
  },

  /** 強度を更新 */
  setIntensity(state: FilterState, intensity: number): FilterState {
    return {
      ...state,
      intensity: Math.max(0, Math.min(1, intensity)),
    }
  },

  /** プリセットを適用 */
  applyPreset(
    state: FilterState,
    presetId: string,
    filter: Filter,
    lut3d: Lut3D | null
  ): FilterState {
    return {
      filter,
      intensity: state.intensity,
      presetId,
      lut3d,
    }
  },

  /** LUT を生成（強度適用済み） */
  toLut(state: FilterState): Lut {
    const baseLut = state.lut3d ?? $Filter.toLut(state.filter)

    // 強度が1.0ならそのまま返す
    if (state.intensity >= 0.999) return baseLut

    // 強度に応じてIdentityとブレンド
    if ($Lut3D.is(baseLut)) {
      return $Lut3D.blend(baseLut, state.intensity)
    } else {
      return $Lut1D.blend(baseLut, state.intensity)
    }
  },

  /** Master カーブのポイントを更新 */
  setMasterPoint(state: FilterState, index: number, value: number): FilterState {
    const newPoints = [...state.filter.master.points]
    newPoints[index] = Math.max(0, Math.min(1, value))
    return $FilterState.setFilter(state, $Filter.setMaster(state.filter, { points: newPoints }))
  },

  /** Master カーブ全体を更新 */
  setMasterPoints(state: FilterState, points: number[]): FilterState {
    return $FilterState.setFilter(state, $Filter.setMaster(state.filter, { points }))
  },
}
