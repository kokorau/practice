/**
 * Adjustment - 単一パラメータによる調整
 * 内部でGamma/Sigmoidを使用して自然な変化を実現
 */

import { pipe, clamp } from '../../../Pipe'
import { srgbToLinear, linearToSrgb, hueToRGB } from './colors'
import {
  smoothstep,
  highlightMask,
  shadowMask,
  whiteMask,
  blackMask,
  clarityMask,
} from './masks'
import {
  applyGamma,
  applyContrast,
  brightnessToGamma,
  applyExposure,
  applyHighlightsShadows,
  applyWhitesBlacks,
  applyClarity,
  applyFade,
  applyToe,
  applyShoulder,
} from './transforms'

export type Adjustment = {
  /** 露出: -2 (暗) 〜 0 (無変更) 〜 +2 (明) EV値 */
  exposure: number
  /** ハイライト: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  highlights: number
  /** シャドウ: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  shadows: number
  /** 白レベル: -1 (暗) 〜 0 (無変更) 〜 +1 (明) - 最も明るい部分 */
  whites: number
  /** 黒レベル: -1 (暗) 〜 0 (無変更) 〜 +1 (明) - 最も暗い部分 */
  blacks: number
  /** 明るさ: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  brightness: number
  /** コントラスト: -1 (低) 〜 0 (無変更) 〜 +1 (高) */
  contrast: number
  /** 色温度: -1 (寒色/青) 〜 0 (無変更) 〜 +1 (暖色/黄) */
  temperature: number
  /** 色合い: -1 (緑) 〜 0 (無変更) 〜 +1 (マゼンタ) */
  tint: number
  /** 明瞭度: -1 (ソフト) 〜 0 (無変更) 〜 +1 (シャープ) - 中間調コントラスト */
  clarity: number
  /** フェード: 0 (無変更) 〜 +1 (黒を持ち上げ) - フィルム風 */
  fade: number
  /** 自然な彩度: -1 (彩度低下) 〜 0 (無変更) 〜 +1 (彩度増加) - 低彩度の色ほど強く効く */
  vibrance: number
  /** Split Toning: シャドウの色相 (0-360度) */
  splitShadowHue: number
  /** Split Toning: シャドウの強度 (0-1) */
  splitShadowAmount: number
  /** Split Toning: ハイライトの色相 (0-360度) */
  splitHighlightHue: number
  /** Split Toning: ハイライトの強度 (0-1) */
  splitHighlightAmount: number
  /** Split Toning: バランス (-1=シャドウ寄り, 0=中央, +1=ハイライト寄り) */
  splitBalance: number
  /** Toe: 黒の締まり (0=ソフト, +1=締まり) */
  toe: number
  /** Shoulder: 白のロールオフ (0=リニア, +1=フィルムライク) */
  shoulder: number
  /** Color Balance: Lift R (-1 to +1) シャドウの赤 */
  liftR: number
  /** Color Balance: Lift G (-1 to +1) シャドウの緑 */
  liftG: number
  /** Color Balance: Lift B (-1 to +1) シャドウの青 */
  liftB: number
  /** Color Balance: Gamma R (-1 to +1) ミッドトーンの赤 */
  gammaR: number
  /** Color Balance: Gamma G (-1 to +1) ミッドトーンの緑 */
  gammaG: number
  /** Color Balance: Gamma B (-1 to +1) ミッドトーンの青 */
  gammaB: number
  /** Color Balance: Gain R (-1 to +1) ハイライトの赤 */
  gainR: number
  /** Color Balance: Gain G (-1 to +1) ハイライトの緑 */
  gainG: number
  /** Color Balance: Gain B (-1 to +1) ハイライトの青 */
  gainB: number

  // === Selective Color ===
  /** Selective Color: 有効/無効 */
  selectiveColorEnabled: boolean
  /** Selective Color: ターゲット色相 (0-360度) */
  selectiveHue: number
  /** Selective Color: 色相の許容範囲 (0-180度) */
  selectiveRange: number
  /** Selective Color: 非選択部分の彩度 (0=グレー, 1=元のまま) */
  selectiveDesaturate: number

  // === Posterize ===
  /** Posterize: 階調数 (2-256, 256=無効) */
  posterizeLevels: number

  // === Hue Rotation ===
  /** Hue Rotation: 色相回転 (-180 〜 +180度) */
  hueRotation: number
}

export const $Adjustment = {
  /** デフォルト (無変更) */
  identity: (): Adjustment => ({
    exposure: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    brightness: 0,
    contrast: 0,
    temperature: 0,
    tint: 0,
    clarity: 0,
    fade: 0,
    vibrance: 0,
    splitShadowHue: 220,      // デフォルト: 青系
    splitShadowAmount: 0,
    splitHighlightHue: 40,    // デフォルト: 暖色系
    splitHighlightAmount: 0,
    splitBalance: 0,
    toe: 0,
    shoulder: 0,
    liftR: 0,
    liftG: 0,
    liftB: 0,
    gammaR: 0,
    gammaG: 0,
    gammaB: 0,
    gainR: 0,
    gainG: 0,
    gainB: 0,
    // Selective Color
    selectiveColorEnabled: false,
    selectiveHue: 0,       // デフォルト: 赤
    selectiveRange: 30,    // 30度の範囲
    selectiveDesaturate: 1, // 範囲外を完全にグレー化 (0=元のまま, 1=完全脱色)
    // Posterize
    posterizeLevels: 256,  // 256 = 無効（フル階調）
    // Hue Rotation
    hueRotation: 0,        // 0 = 無効
  }),

  /** 調整が無変更かどうか */
  isIdentity: (adj: Adjustment): boolean => {
    return (
      Math.abs(adj.exposure) < 0.001 &&
      Math.abs(adj.highlights) < 0.001 &&
      Math.abs(adj.shadows) < 0.001 &&
      Math.abs(adj.whites) < 0.001 &&
      Math.abs(adj.blacks) < 0.001 &&
      Math.abs(adj.brightness) < 0.001 &&
      Math.abs(adj.contrast) < 0.001 &&
      Math.abs(adj.temperature) < 0.001 &&
      Math.abs(adj.tint) < 0.001 &&
      Math.abs(adj.clarity) < 0.001 &&
      Math.abs(adj.fade) < 0.001 &&
      Math.abs(adj.vibrance) < 0.001 &&
      adj.splitShadowAmount < 0.001 &&
      adj.splitHighlightAmount < 0.001 &&
      adj.toe < 0.001 &&
      adj.shoulder < 0.001 &&
      Math.abs(adj.liftR) < 0.001 &&
      Math.abs(adj.liftG) < 0.001 &&
      Math.abs(adj.liftB) < 0.001 &&
      Math.abs(adj.gammaR) < 0.001 &&
      Math.abs(adj.gammaG) < 0.001 &&
      Math.abs(adj.gammaB) < 0.001 &&
      Math.abs(adj.gainR) < 0.001 &&
      Math.abs(adj.gainG) < 0.001 &&
      Math.abs(adj.gainB) < 0.001 &&
      !adj.selectiveColorEnabled &&
      adj.posterizeLevels >= 256 &&
      Math.abs(adj.hueRotation) < 0.001
    )
  },

  /**
   * 処理パイプラインを構築
   * Exposure → Brightness → Contrast → Clarity → Highlights/Shadows → Whites/Blacks → Toe → Shoulder → Fade
   */
  buildPipeline: (adj: Adjustment) => {
    const gamma = brightnessToGamma(adj.brightness)
    return (value: number): number =>
      pipe(
        value,
        v => applyExposure(v, adj.exposure),
        v => applyGamma(v, gamma),
        v => applyContrast(v, adj.contrast),
        v => applyClarity(v, adj.clarity),
        v => applyHighlightsShadows(v, adj.highlights, adj.shadows),
        v => applyWhitesBlacks(v, adj.whites, adj.blacks),
        v => applyToe(v, adj.toe),
        v => applyShoulder(v, adj.shoulder),
        v => applyFade(v, adj.fade),
        clamp(0, 1)
      )
  },

  /** AdjustmentをLUTに変換 (8bit) */
  toLut: (adj: Adjustment): Uint8Array => {
    const lut = new Uint8Array(256)
    const process = $Adjustment.buildPipeline(adj)

    for (let i = 0; i < 256; i++) {
      lut[i] = Math.round(process(i / 255) * 255)
    }

    return lut
  },

  /** AdjustmentをLUTに変換 (浮動小数点 0.0-1.0) */
  toLutFloat: (adj: Adjustment): Float32Array => {
    const lut = new Float32Array(256)
    const process = $Adjustment.buildPipeline(adj)

    for (let i = 0; i < 256; i++) {
      lut[i] = process(i / 255)
    }

    return lut
  },

  /**
   * AdjustmentをRGB別のLUTに変換 (浮動小数点 0.0-1.0)
   * Temperature による色シフトを含む
   */
  toLutFloatRGB: (adj: Adjustment): { r: Float32Array; g: Float32Array; b: Float32Array } => {
    const baseLut = new Float32Array(256)
    const process = $Adjustment.buildPipeline(adj)

    // 基本パイプラインを適用
    for (let i = 0; i < 256; i++) {
      baseLut[i] = process(i / 255)
    }

    // 色調整が不要な場合は同じLUTを共有
    const hasTemperature = Math.abs(adj.temperature) >= 0.001
    const hasTint = Math.abs(adj.tint) >= 0.001
    const hasSplitTone = adj.splitShadowAmount >= 0.001 || adj.splitHighlightAmount >= 0.001
    const hasColorBalance =
      Math.abs(adj.liftR) >= 0.001 || Math.abs(adj.liftG) >= 0.001 || Math.abs(adj.liftB) >= 0.001 ||
      Math.abs(adj.gammaR) >= 0.001 || Math.abs(adj.gammaG) >= 0.001 || Math.abs(adj.gammaB) >= 0.001 ||
      Math.abs(adj.gainR) >= 0.001 || Math.abs(adj.gainG) >= 0.001 || Math.abs(adj.gainB) >= 0.001

    if (!hasTemperature && !hasTint && !hasSplitTone && !hasColorBalance) {
      return { r: baseLut, g: baseLut, b: baseLut }
    }

    // Temperature による色シフト (青⇔黄軸)
    // 暖色 (positive): R↑, G微↑, B↓
    // 寒色 (negative): R↓, G微↓, B↑
    const tempStrength = 0.15
    const tempR = adj.temperature * tempStrength
    const tempG = adj.temperature * tempStrength * 0.3
    const tempB = -adj.temperature * tempStrength

    // Tint による色シフト (緑⇔マゼンタ軸)
    // マゼンタ (positive): R↑, G↓, B↑
    // 緑 (negative): R↓, G↑, B↓
    const tintStrength = 0.1
    const tintR = adj.tint * tintStrength
    const tintG = -adj.tint * tintStrength
    const tintB = adj.tint * tintStrength

    // Split Toning 色計算
    const shadowColor = hueToRGB(adj.splitShadowHue)
    const highlightColor = hueToRGB(adj.splitHighlightHue)
    const splitStrength = 0.15

    // バランス調整 (-1 to +1) でマスクの境界をシフト
    const balanceOffset = adj.splitBalance * 0.25

    const rLut = new Float32Array(256)
    const gLut = new Float32Array(256)
    const bLut = new Float32Array(256)

    for (let i = 0; i < 256; i++) {
      const base = baseLut[i]!
      const input = i / 255

      // 基本の色シフト (Temperature + Tint)
      let rShift = tempR + tintR
      let gShift = tempG + tintG
      let bShift = tempB + tintB

      // Split Toning
      if (hasSplitTone) {
        // マスク計算 (バランスでオフセット)
        const shadowWeight = (1 - smoothstep(0.0 + balanceOffset, 0.5 + balanceOffset, input)) * adj.splitShadowAmount
        const highlightWeight = smoothstep(0.5 + balanceOffset, 1.0 + balanceOffset, input) * adj.splitHighlightAmount

        rShift += shadowColor.r * shadowWeight * splitStrength + highlightColor.r * highlightWeight * splitStrength
        gShift += shadowColor.g * shadowWeight * splitStrength + highlightColor.g * highlightWeight * splitStrength
        bShift += shadowColor.b * shadowWeight * splitStrength + highlightColor.b * highlightWeight * splitStrength
      }

      // Color Balance (Lift/Gamma/Gain)
      // DaVinci Resolve スタイルの 3-way カラーグレーディング
      if (hasColorBalance) {
        const cbStrength = 0.2  // 効果の強さ

        // Lift: シャドウ部分に加算 (shadowMaskで重み付け)
        const liftWeight = shadowMask(input)
        rShift += adj.liftR * liftWeight * cbStrength
        gShift += adj.liftG * liftWeight * cbStrength
        bShift += adj.liftB * liftWeight * cbStrength

        // Gamma: ミッドトーンを調整 (clarityMaskで重み付け)
        const gammaWeight = clarityMask(input)
        rShift += adj.gammaR * gammaWeight * cbStrength
        gShift += adj.gammaG * gammaWeight * cbStrength
        bShift += adj.gammaB * gammaWeight * cbStrength

        // Gain: ハイライト部分を乗算的に調整 (highlightMaskで重み付け)
        const gainWeight = highlightMask(input)
        rShift += adj.gainR * gainWeight * cbStrength
        gShift += adj.gainG * gainWeight * cbStrength
        bShift += adj.gainB * gainWeight * cbStrength
      }

      rLut[i] = Math.max(0, Math.min(1, base + rShift))
      gLut[i] = Math.max(0, Math.min(1, base + gShift))
      bLut[i] = Math.max(0, Math.min(1, base + bShift))
    }

    return { r: rLut, g: gLut, b: bLut }
  },

  /** 個別の変換関数をエクスポート (テスト/可視化用) */
  applyExposure,
  applyHighlightsShadows,
  applyWhitesBlacks,
  applyClarity,
  applyFade,
  highlightMask,
  shadowMask,
  whiteMask,
  blackMask,
  clarityMask,
  applyGamma,
  applyContrast,
  brightnessToGamma,
  srgbToLinear,
  linearToSrgb,
  hueToRGB,
  applyToe,
  applyShoulder,
}
