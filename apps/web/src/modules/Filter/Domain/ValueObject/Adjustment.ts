/**
 * Adjustment - 単一パラメータによる調整
 * 内部でGamma/Sigmoidを使用して自然な変化を実現
 */

export type Adjustment = {
  /** 露出: -2 (暗) 〜 0 (無変更) 〜 +2 (明) EV値 */
  exposure: number
  /** 明るさ: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  brightness: number
  /** コントラスト: -1 (低) 〜 0 (無変更) 〜 +1 (高) */
  contrast: number
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


export const $Adjustment = {
  /** デフォルト (無変更) */
  identity: (): Adjustment => ({
    exposure: 0,
    brightness: 0,
    contrast: 0,
  }),

  /** 調整が無変更かどうか */
  isIdentity: (adj: Adjustment): boolean => {
    return (
      Math.abs(adj.exposure) < 0.001 &&
      Math.abs(adj.brightness) < 0.001 &&
      Math.abs(adj.contrast) < 0.001
    )
  },

  /** AdjustmentをLUTに変換 (8bit) */
  toLut: (adj: Adjustment): Uint8Array => {
    const lut = new Uint8Array(256)
    const gamma = brightnessToGamma(adj.brightness)

    for (let i = 0; i < 256; i++) {
      let value = i / 255

      // 1. Exposure (線形光空間で乗算)
      value = applyExposure(value, adj.exposure)

      // 2. Gamma (brightness)
      value = applyGamma(value, gamma)

      // 3. Contrast (直接 -1〜+1 の値を渡す)
      value = applyContrast(value, adj.contrast)

      // 4. クランプして整数化
      lut[i] = Math.round(Math.max(0, Math.min(255, value * 255)))
    }

    return lut
  },

  /** AdjustmentをLUTに変換 (浮動小数点 0.0-1.0) */
  toLutFloat: (adj: Adjustment): Float32Array => {
    const lut = new Float32Array(256)
    const gamma = brightnessToGamma(adj.brightness)

    for (let i = 0; i < 256; i++) {
      let value = i / 255

      // 1. Exposure (線形光空間で乗算)
      value = applyExposure(value, adj.exposure)

      // 2. Gamma (brightness)
      value = applyGamma(value, gamma)

      // 3. Contrast (直接 -1〜+1 の値を渡す)
      value = applyContrast(value, adj.contrast)

      // 4. クランプ (0.0-1.0)
      lut[i] = Math.max(0, Math.min(1, value))
    }

    return lut
  },

  /** 個別の変換関数をエクスポート (テスト/可視化用) */
  applyExposure,
  applyGamma,
  applyContrast,
  brightnessToGamma,
  srgbToLinear,
  linearToSrgb,
}
