/**
 * Filter - カーブベースのフィルター定義
 */

import { type Curve, $Curve } from './Curve'
import { type Lut, $LutFloat } from './Lut'
import { type Adjustment, $Adjustment } from './Adjustment'

export type Filter = {
  /** 基本調整 (Brightness/Contrast) - カーブの前に適用 */
  adjustment: Adjustment
  /** Master カーブ (RGB共通) */
  master: Curve
  /** 個別チャンネル (将来用、nullの場合はMasterのみ使用) */
  r: Curve | null
  g: Curve | null
  b: Curve | null
}

export const $Filter = {
  /** デフォルトフィルター (無変換) */
  identity: (pointCount: number = 7): Filter => ({
    adjustment: $Adjustment.identity(),
    master: $Curve.identity(pointCount),
    r: null,
    g: null,
    b: null,
  }),

  /** Masterカーブのみ設定 */
  fromMaster: (master: Curve): Filter => ({
    adjustment: $Adjustment.identity(),
    master,
    r: null,
    g: null,
    b: null,
  }),

  /**
   * FilterからLUTを生成
   * 内部計算は浮動小数点で行い、最終出力時のみ8bitに量子化
   */
  toLut: (filter: Filter): Lut => {
    // 1. Adjustment LUT (brightness/contrast) - 浮動小数点
    const adjustmentLut = $Adjustment.toLutFloat(filter.adjustment)

    // 2. Master Curve LUT - 浮動小数点
    const masterLut = $Curve.toLutFloat(filter.master)

    // 3. 合成: Adjustment → Master の順で適用 (浮動小数点のまま)
    const composedMaster = $LutFloat.compose(adjustmentLut, masterLut)

    // 個別チャンネルがない場合はMasterのみ → 量子化して返す
    if (!filter.r && !filter.g && !filter.b) {
      return $LutFloat.quantize($LutFloat.fromMaster(composedMaster))
    }

    // 個別チャンネルがある場合: Master → 個別の順で適用 (浮動小数点)
    const rLut = filter.r ? $Curve.toLutFloat(filter.r) : null
    const gLut = filter.g ? $Curve.toLutFloat(filter.g) : null
    const bLut = filter.b ? $Curve.toLutFloat(filter.b) : null

    // 各チャンネルを合成 (浮動小数点)
    const finalR = rLut ? $LutFloat.compose(composedMaster, rLut) : composedMaster
    const finalG = gLut ? $LutFloat.compose(composedMaster, gLut) : composedMaster
    const finalB = bLut ? $LutFloat.compose(composedMaster, bLut) : composedMaster

    // 最終的に量子化して返す
    return $LutFloat.quantize({
      r: finalR,
      g: finalG,
      b: finalB,
    })
  },

  /** Adjustmentを更新 */
  setAdjustment: (filter: Filter, adjustment: Adjustment): Filter => ({
    ...filter,
    adjustment,
  }),

  /** Exposureのみ更新 */
  setExposure: (filter: Filter, exposure: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, exposure },
  }),

  /** Highlightsのみ更新 */
  setHighlights: (filter: Filter, highlights: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, highlights },
  }),

  /** Shadowsのみ更新 */
  setShadows: (filter: Filter, shadows: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, shadows },
  }),

  /** Brightnessのみ更新 */
  setBrightness: (filter: Filter, brightness: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, brightness },
  }),

  /** Contrastのみ更新 */
  setContrast: (filter: Filter, contrast: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, contrast },
  }),

  /** Masterカーブを更新 */
  setMaster: (filter: Filter, master: Curve): Filter => ({
    ...filter,
    master,
  }),

  /** 個別チャンネルを設定 */
  setChannel: (
    filter: Filter,
    channel: 'r' | 'g' | 'b',
    curve: Curve | null
  ): Filter => ({
    ...filter,
    [channel]: curve,
  }),

  /** Masterを個別チャンネルに分離 */
  splitToChannels: (filter: Filter): Filter => ({
    ...filter,
    r: { points: [...filter.master.points] },
    g: { points: [...filter.master.points] },
    b: { points: [...filter.master.points] },
  }),

  /** 個別チャンネルをMasterに統合 (平均) */
  mergeToMaster: (filter: Filter): Filter => {
    if (!filter.r && !filter.g && !filter.b) {
      return filter
    }

    const pointCount = filter.master.points.length
    const points: number[] = []

    for (let i = 0; i < pointCount; i++) {
      const r = filter.r?.points[i] ?? filter.master.points[i]!
      const g = filter.g?.points[i] ?? filter.master.points[i]!
      const b = filter.b?.points[i] ?? filter.master.points[i]!
      points.push((r + g + b) / 3)
    }

    return {
      adjustment: filter.adjustment,
      master: { points },
      r: null,
      g: null,
      b: null,
    }
  },
}
