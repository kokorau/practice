/**
 * Adjustment - 単一パラメータによる調整
 * 内部でGamma/Sigmoidを使用して自然な変化を実現
 */

import { pipe, clamp } from '../../../Pipe'

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
}

/**
 * Gamma変換 (Brightness用)
 * gamma < 1: 明るくなる (シャドウを持ち上げ)
 * gamma > 1: 暗くなる
 */
const applyGamma = (input: number, gamma: number): number => {
  return Math.pow(Math.max(0, Math.min(1, input)), gamma)
}

/**
 * コントラスト変換
 * contrast > 0: コントラスト増加 (S字カーブで端に広げる)
 * contrast < 0: コントラスト減少 (中央0.5に向かって圧縮)
 *
 * @param input 入力値 (0-1)
 * @param contrast コントラスト値 (-1 to +1)
 */
const applyContrast = (input: number, contrast: number): number => {
  if (Math.abs(contrast) < 0.001) {
    return input // contrast ≈ 0 は変化なし
  }

  if (contrast > 0) {
    // 正のコントラスト: シグモイドS字カーブ
    // contrast 1.0 で十分な効果が出るようにスケール
    const k = contrast * 4
    const centered = input - 0.5

    const sigmoid = 1 / (1 + Math.exp(-k * centered * 4))
    const sigmoid0 = 1 / (1 + Math.exp(-k * (-0.5) * 4))
    const sigmoid1 = 1 / (1 + Math.exp(-k * 0.5 * 4))

    return (sigmoid - sigmoid0) / (sigmoid1 - sigmoid0)
  } else {
    // 負のコントラスト: 中央(0.5)に向かって線形補間
    // contrast = -1 で完全に0.5になる
    const t = Math.abs(contrast)
    return input + (0.5 - input) * t
  }
}

/**
 * パラメータ(-1〜+1)をGamma値に変換
 * brightness: -1 → gamma 2.0 (暗く)
 * brightness:  0 → gamma 1.0 (変化なし)
 * brightness: +1 → gamma 0.5 (明るく)
 */
const brightnessToGamma = (brightness: number): number => {
  // -1 to +1 → 2.0 to 0.5 (exponential mapping)
  return Math.pow(2, -brightness)
}

/**
 * sRGB → Linear 変換
 * sRGBのガンマエンコードを解除
 */
const srgbToLinear = (srgb: number): number => {
  if (srgb <= 0.04045) {
    return srgb / 12.92
  }
  return Math.pow((srgb + 0.055) / 1.055, 2.4)
}

/**
 * Linear → sRGB 変換
 * sRGBのガンマエンコードを適用
 */
const linearToSrgb = (linear: number): number => {
  if (linear <= 0.0031308) {
    return linear * 12.92
  }
  return 1.055 * Math.pow(linear, 1 / 2.4) - 0.055
}

/**
 * 露出補正 (Exposure)
 * 線形光空間で乗算を行う
 * @param input sRGB値 (0-1)
 * @param ev EV値 (+1 = 2倍, -1 = 1/2)
 */
const applyExposure = (input: number, ev: number): number => {
  if (Math.abs(ev) < 0.001) {
    return input // ev ≈ 0 は変化なし
  }

  // sRGB → Linear
  const linear = srgbToLinear(input)

  // 露出補正 (2^ev 倍)
  const multiplier = Math.pow(2, ev)
  const adjusted = linear * multiplier

  // Linear → sRGB (クランプ付き)
  return linearToSrgb(Math.max(0, Math.min(1, adjusted)))
}

/**
 * Smoothstep関数
 * edge0からedge1の間で滑らかに0から1へ遷移
 */
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * ハイライトマスク
 * 明るい部分ほど影響を受ける (0.5付近から1.0で最大)
 */
const highlightMask = (x: number): number => {
  return smoothstep(0.25, 0.75, x)
}

/**
 * シャドウマスク
 * 暗い部分ほど影響を受ける (0.0で最大、0.5付近から減少)
 */
const shadowMask = (x: number): number => {
  return 1 - smoothstep(0.25, 0.75, x)
}

/**
 * 白レベルマスク
 * 最も明るい部分のみ影響 (0.75-1.0で遷移、Highlightsより狭い)
 */
const whiteMask = (x: number): number => {
  return smoothstep(0.75, 1.0, x)
}

/**
 * 黒レベルマスク
 * 最も暗い部分のみ影響 (0.0-0.25で遷移、Shadowsより狭い)
 */
const blackMask = (x: number): number => {
  return 1 - smoothstep(0.0, 0.25, x)
}

/**
 * 明瞭度マスク (中間調のみ影響)
 * ベルカーブ: 0.5で最大、端点で0
 */
const clarityMask = (x: number): number => {
  // 4 * x * (1 - x) は 0.5 で 1.0、端点で 0
  return 4 * x * (1 - x)
}

/**
 * ハイライト/シャドウ調整
 * @param input 入力値 (0-1)
 * @param highlights ハイライト調整 (-1 to +1)
 * @param shadows シャドウ調整 (-1 to +1)
 */
const applyHighlightsShadows = (
  input: number,
  highlights: number,
  shadows: number
): number => {
  if (Math.abs(highlights) < 0.001 && Math.abs(shadows) < 0.001) {
    return input
  }

  // 調整の強さ (±1で最大±0.5の変化)
  const strength = 0.5

  // 各マスクの影響度を計算
  const hMask = highlightMask(input)
  const sMask = shadowMask(input)

  // 調整を適用
  let result = input
  result += highlights * hMask * strength
  result += shadows * sMask * strength

  return Math.max(0, Math.min(1, result))
}

/**
 * 白レベル/黒レベル調整
 * Highlights/Shadowsより狭い範囲で、端点に近い部分のみ調整
 * @param input 入力値 (0-1)
 * @param whites 白レベル調整 (-1 to +1)
 * @param blacks 黒レベル調整 (-1 to +1)
 */
const applyWhitesBlacks = (
  input: number,
  whites: number,
  blacks: number
): number => {
  if (Math.abs(whites) < 0.001 && Math.abs(blacks) < 0.001) {
    return input
  }

  // 調整の強さ (±1で最大±0.3の変化、端点に近いのでより控えめ)
  const strength = 0.3

  // 各マスクの影響度を計算
  const wMask = whiteMask(input)
  const bMask = blackMask(input)

  // 調整を適用
  let result = input
  result += whites * wMask * strength
  result += blacks * bMask * strength

  return Math.max(0, Math.min(1, result))
}

/**
 * 明瞭度調整
 * 中間調のみコントラストを調整 (端点は維持)
 * @param input 入力値 (0-1)
 * @param clarity 明瞭度 (-1 to +1)
 */
const applyClarity = (input: number, clarity: number): number => {
  if (Math.abs(clarity) < 0.001) {
    return input
  }

  // 中間調マスク
  const mask = clarityMask(input)

  // 0.5 からの距離に基づいて調整
  const centered = input - 0.5

  // 正の clarity: 中間調を0.5から離す (コントラスト増)
  // 負の clarity: 中間調を0.5に近づける (ソフト化)
  const strength = 0.4 // 最大調整量
  const adjustment = centered * clarity * strength * mask

  return Math.max(0, Math.min(1, input + adjustment))
}

/**
 * フェード調整 (黒点の持ち上げ)
 * フィルム風のマット感を出す
 * @param input 入力値 (0-1)
 * @param fade フェード量 (0 to +1)
 */
const applyFade = (input: number, fade: number): number => {
  if (fade < 0.001) {
    return input
  }

  // 黒点を持ち上げる
  // fade=1で最大約20%まで持ち上げ
  const blackLevel = fade * 0.2
  return blackLevel + input * (1 - blackLevel)
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
      Math.abs(adj.fade) < 0.001
    )
  },

  /**
   * 処理パイプラインを構築
   * Exposure → Brightness → Contrast → Clarity → Highlights/Shadows → Whites/Blacks → Fade
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

    // Temperature と Tint が両方 0 の場合は同じ LUT を共有
    if (Math.abs(adj.temperature) < 0.001 && Math.abs(adj.tint) < 0.001) {
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

    // 合成シフト
    const rShift = tempR + tintR
    const gShift = tempG + tintG
    const bShift = tempB + tintB

    const rLut = new Float32Array(256)
    const gLut = new Float32Array(256)
    const bLut = new Float32Array(256)

    for (let i = 0; i < 256; i++) {
      const base = baseLut[i]!
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
}
