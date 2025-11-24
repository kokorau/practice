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
    // 1. Adjustment LUT (brightness/contrast/temperature) - RGB別の浮動小数点
    const adjustmentRGB = $Adjustment.toLutFloatRGB(filter.adjustment)

    // 2. Master Curve LUT - 浮動小数点
    const masterLut = $Curve.toLutFloat(filter.master)

    // 3. 合成: Adjustment → Master の順で適用 (浮動小数点のまま)
    const composedR = $LutFloat.compose(adjustmentRGB.r, masterLut)
    const composedG = $LutFloat.compose(adjustmentRGB.g, masterLut)
    const composedB = $LutFloat.compose(adjustmentRGB.b, masterLut)

    // 個別チャンネルがない場合
    if (!filter.r && !filter.g && !filter.b) {
      return $LutFloat.quantize({
        r: composedR,
        g: composedG,
        b: composedB,
      })
    }

    // 個別チャンネルがある場合: Master → 個別の順で適用 (浮動小数点)
    const rLut = filter.r ? $Curve.toLutFloat(filter.r) : null
    const gLut = filter.g ? $Curve.toLutFloat(filter.g) : null
    const bLut = filter.b ? $Curve.toLutFloat(filter.b) : null

    // 各チャンネルを合成 (浮動小数点)
    const finalR = rLut ? $LutFloat.compose(composedR, rLut) : composedR
    const finalG = gLut ? $LutFloat.compose(composedG, gLut) : composedG
    const finalB = bLut ? $LutFloat.compose(composedB, bLut) : composedB

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

  /** Whitesのみ更新 */
  setWhites: (filter: Filter, whites: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, whites },
  }),

  /** Blacksのみ更新 */
  setBlacks: (filter: Filter, blacks: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, blacks },
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

  /** Temperatureのみ更新 */
  setTemperature: (filter: Filter, temperature: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, temperature },
  }),

  /** Tintのみ更新 */
  setTint: (filter: Filter, tint: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, tint },
  }),

  /** Clarityのみ更新 */
  setClarity: (filter: Filter, clarity: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, clarity },
  }),

  /** Fadeのみ更新 */
  setFade: (filter: Filter, fade: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, fade },
  }),

  /** Vibranceのみ更新 */
  setVibrance: (filter: Filter, vibrance: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, vibrance },
  }),

  /** Split Toning: シャドウの色相を更新 */
  setSplitShadowHue: (filter: Filter, splitShadowHue: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, splitShadowHue },
  }),

  /** Split Toning: シャドウの強度を更新 */
  setSplitShadowAmount: (filter: Filter, splitShadowAmount: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, splitShadowAmount },
  }),

  /** Split Toning: ハイライトの色相を更新 */
  setSplitHighlightHue: (filter: Filter, splitHighlightHue: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, splitHighlightHue },
  }),

  /** Split Toning: ハイライトの強度を更新 */
  setSplitHighlightAmount: (filter: Filter, splitHighlightAmount: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, splitHighlightAmount },
  }),

  /** Split Toning: バランスを更新 */
  setSplitBalance: (filter: Filter, splitBalance: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, splitBalance },
  }),

  /** Toeのみ更新 */
  setToe: (filter: Filter, toe: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, toe },
  }),

  /** Shoulderのみ更新 */
  setShoulder: (filter: Filter, shoulder: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, shoulder },
  }),

  /** Color Balance: Lift R (シャドウの赤) */
  setLiftR: (filter: Filter, liftR: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, liftR },
  }),

  /** Color Balance: Lift G (シャドウの緑) */
  setLiftG: (filter: Filter, liftG: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, liftG },
  }),

  /** Color Balance: Lift B (シャドウの青) */
  setLiftB: (filter: Filter, liftB: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, liftB },
  }),

  /** Color Balance: Gamma R (ミッドトーンの赤) */
  setGammaR: (filter: Filter, gammaR: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, gammaR },
  }),

  /** Color Balance: Gamma G (ミッドトーンの緑) */
  setGammaG: (filter: Filter, gammaG: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, gammaG },
  }),

  /** Color Balance: Gamma B (ミッドトーンの青) */
  setGammaB: (filter: Filter, gammaB: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, gammaB },
  }),

  /** Color Balance: Gain R (ハイライトの赤) */
  setGainR: (filter: Filter, gainR: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, gainR },
  }),

  /** Color Balance: Gain G (ハイライトの緑) */
  setGainG: (filter: Filter, gainG: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, gainG },
  }),

  /** Color Balance: Gain B (ハイライトの青) */
  setGainB: (filter: Filter, gainB: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, gainB },
  }),

  // === Duotone/Tritone ===

  /** Tone Mode を更新 */
  setToneMode: (filter: Filter, toneMode: 'normal' | 'duotone' | 'tritone'): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, toneMode },
  }),

  /** Tone Color 1 Hue (シャドウ色) を更新 */
  setToneColor1Hue: (filter: Filter, toneColor1Hue: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, toneColor1Hue },
  }),

  /** Tone Color 1 Saturation を更新 */
  setToneColor1Sat: (filter: Filter, toneColor1Sat: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, toneColor1Sat },
  }),

  /** Tone Color 2 Hue (ハイライト色) を更新 */
  setToneColor2Hue: (filter: Filter, toneColor2Hue: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, toneColor2Hue },
  }),

  /** Tone Color 2 Saturation を更新 */
  setToneColor2Sat: (filter: Filter, toneColor2Sat: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, toneColor2Sat },
  }),

  /** Tone Color 3 Hue (ミッドトーン色) を更新 */
  setToneColor3Hue: (filter: Filter, toneColor3Hue: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, toneColor3Hue },
  }),

  /** Tone Color 3 Saturation を更新 */
  setToneColor3Sat: (filter: Filter, toneColor3Sat: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, toneColor3Sat },
  }),

  // === Selective Color ===

  /** Selective Color 有効/無効 を更新 */
  setSelectiveColorEnabled: (filter: Filter, selectiveColorEnabled: boolean): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, selectiveColorEnabled },
  }),

  /** Selective Color ターゲット色相 を更新 */
  setSelectiveHue: (filter: Filter, selectiveHue: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, selectiveHue },
  }),

  /** Selective Color 色相範囲 を更新 */
  setSelectiveRange: (filter: Filter, selectiveRange: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, selectiveRange },
  }),

  /** Selective Color 非選択部分の彩度 を更新 */
  setSelectiveDesaturate: (filter: Filter, selectiveDesaturate: number): Filter => ({
    ...filter,
    adjustment: { ...filter.adjustment, selectiveDesaturate },
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
