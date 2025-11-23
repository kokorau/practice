/**
 * Filter - カーブベースのフィルター定義
 */

import { type Curve, $Curve } from './Curve'
import { type Lut, $Lut } from './Lut'
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

  /** FilterからLUTを生成 */
  toLut: (filter: Filter): Lut => {
    // 1. Adjustment LUT (brightness/contrast)
    const adjustmentLut = $Adjustment.toLut(filter.adjustment)

    // 2. Curve LUT
    const masterLut = $Curve.toLut(filter.master)

    // 3. 合成: Adjustment → Curve の順で適用
    const composedMaster = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      const afterAdjustment = adjustmentLut[i]!
      composedMaster[i] = masterLut[afterAdjustment]!
    }

    // 個別チャンネルがない場合はMasterのみ
    if (!filter.r && !filter.g && !filter.b) {
      return $Lut.fromMaster(composedMaster)
    }

    // 個別チャンネルがある場合: Master → 個別の順で適用
    const rLut = filter.r ? $Curve.toLut(filter.r) : null
    const gLut = filter.g ? $Curve.toLut(filter.g) : null
    const bLut = filter.b ? $Curve.toLut(filter.b) : null

    const result: Lut = {
      r: new Uint8Array(256),
      g: new Uint8Array(256),
      b: new Uint8Array(256),
    }

    for (let i = 0; i < 256; i++) {
      const afterMaster = composedMaster[i]!
      result.r[i] = rLut ? rLut[afterMaster]! : afterMaster
      result.g[i] = gLut ? gLut[afterMaster]! : afterMaster
      result.b[i] = bLut ? bLut[afterMaster]! : afterMaster
    }

    return result
  },

  /** Adjustmentを更新 */
  setAdjustment: (filter: Filter, adjustment: Adjustment): Filter => ({
    ...filter,
    adjustment,
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
