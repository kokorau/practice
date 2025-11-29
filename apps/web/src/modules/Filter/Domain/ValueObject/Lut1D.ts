/**
 * 1D LUT (Look-Up Table) - チャンネル独立のピクセル値変換テーブル
 */

import { hslToRgb, rgbToHsl, hueDifference } from './colors'

/** 1D LUT (浮動小数点) - チャンネル独立 */
export type Lut1D = {
  type: 'lut1d'
  r: Float32Array  // [256] input -> output mapping (0.0-1.0)
  g: Float32Array
  b: Float32Array
}

/** 1D LUT 操作 */
export const $Lut1D = {
  /** Type guard: 1D LUT かどうかを判定 */
  is: (lut: { type: string }): lut is Lut1D => {
    return lut.type === 'lut1d'
  },

  /** LUT1D を作成 */
  create: (r: Float32Array, g: Float32Array, b: Float32Array): Lut1D => ({
    type: 'lut1d',
    r,
    g,
    b,
  }),

  /** 無変換 LUT (identity) */
  identity: (): Lut1D => {
    const identity = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      identity[i] = i / 255
    }
    return {
      type: 'lut1d',
      r: identity.slice(),
      g: identity.slice(),
      b: identity.slice(),
    }
  },

  /** Master LUT (RGB共通) を作成 */
  fromMaster: (master: Float32Array): Lut1D => ({
    type: 'lut1d',
    r: master.slice(),
    g: master.slice(),
    b: master.slice(),
  }),

  /** LUTをImageDataに適用 (新しいImageDataを返す) */
  apply: (imageData: ImageData, lut: Lut1D): ImageData => {
    const { data, width, height } = imageData
    const newData = new Uint8ClampedArray(data.length)

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const a = data[i + 3]!

      newData[i] = Math.round(lut.r[r]! * 255)
      newData[i + 1] = Math.round(lut.g[g]! * 255)
      newData[i + 2] = Math.round(lut.b[b]! * 255)
      newData[i + 3] = a  // アルファは変更しない
    }

    return new ImageData(newData, width, height)
  },

  /** LUTをImageDataに直接適用 (破壊的) */
  applyInPlace: (imageData: ImageData, lut: Lut1D): void => {
    const { data } = imageData

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!

      data[i] = Math.round(lut.r[r]! * 255)
      data[i + 1] = Math.round(lut.g[g]! * 255)
      data[i + 2] = Math.round(lut.b[b]! * 255)
      // アルファは変更しない
    }
  },

  /**
   * LUT適用後にピクセルエフェクトも適用
   * @param imageData 入力画像
   * @param lut LUT
   * @param effects ピクセルエフェクト (vibrance, selective color等)
   */
  applyWithEffects: (
    imageData: ImageData,
    lut: Lut1D,
    effects: {
      vibrance?: number
      // Selective Color
      selectiveColorEnabled?: boolean
      selectiveHue?: number
      selectiveRange?: number
      selectiveDesaturate?: number
      // Posterize
      posterizeLevels?: number
      // Hue Rotation
      hueRotation?: number
    }
  ): ImageData => {
    const { data, width, height } = imageData
    const newData = new Uint8ClampedArray(data.length)

    // エフェクトフラグ
    const vibrance = effects.vibrance ?? 0
    const hasVibrance = Math.abs(vibrance) > 0.001

    const selectiveEnabled = effects.selectiveColorEnabled ?? false
    const selectiveHue = effects.selectiveHue ?? 0
    const selectiveRange = effects.selectiveRange ?? 30
    const selectiveDesaturate = effects.selectiveDesaturate ?? 0

    const posterizeLevels = effects.posterizeLevels ?? 256
    const hasPosterize = posterizeLevels < 256 && posterizeLevels >= 2

    const hueRotation = effects.hueRotation ?? 0
    const hasHueRotation = Math.abs(hueRotation) > 0.001

    // Posterize 用の LUT を事前計算
    let posterizeLut: Float32Array | null = null
    if (hasPosterize) {
      posterizeLut = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        // 入力値を levels 段階に量子化
        const level = Math.round(i / 255 * (posterizeLevels - 1))
        posterizeLut[i] = level / (posterizeLevels - 1)
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      // 1. LUT適用 (0-1)
      let r = lut.r[data[i]!]!
      let g = lut.g[data[i + 1]!]!
      let b = lut.b[data[i + 2]!]!
      const a = data[i + 3]!

      // 0-255 に変換して処理
      let r255 = Math.round(r * 255)
      let g255 = Math.round(g * 255)
      let b255 = Math.round(b * 255)

      // 2. Selective Color 適用
      if (selectiveEnabled) {
        const hsl = rgbToHsl(r255, g255, b255)
        const diff = hueDifference(hsl.h, selectiveHue)

        if (diff > selectiveRange) {
          // 範囲外: 彩度を下げる
          const gray = Math.round(r255 * 0.2126 + g255 * 0.7152 + b255 * 0.0722)
          // selectiveDesaturate: 0=完全グレー, 1=元のまま
          r255 = Math.round(gray + (r255 - gray) * selectiveDesaturate)
          g255 = Math.round(gray + (g255 - gray) * selectiveDesaturate)
          b255 = Math.round(gray + (b255 - gray) * selectiveDesaturate)
        } else if (diff > selectiveRange * 0.7) {
          // エッジ付近: スムーズに遷移
          const edgeT = (diff - selectiveRange * 0.7) / (selectiveRange * 0.3)
          const gray = Math.round(r255 * 0.2126 + g255 * 0.7152 + b255 * 0.0722)
          const desatAmount = selectiveDesaturate + (1 - selectiveDesaturate) * (1 - edgeT)
          r255 = Math.round(gray + (r255 - gray) * desatAmount)
          g255 = Math.round(gray + (g255 - gray) * desatAmount)
          b255 = Math.round(gray + (b255 - gray) * desatAmount)
        }
        // 範囲内: そのまま
      }

      // 3. Posterize 適用 (LUTベース)
      if (hasPosterize && posterizeLut) {
        r255 = Math.round(posterizeLut[r255]! * 255)
        g255 = Math.round(posterizeLut[g255]! * 255)
        b255 = Math.round(posterizeLut[b255]! * 255)
      }

      // 4. Hue Rotation 適用
      if (hasHueRotation) {
        const hsl = rgbToHsl(r255, g255, b255)
        // 色相を回転 (0-360度の範囲に収める)
        hsl.h = (hsl.h + hueRotation + 360) % 360
        const rotated = hslToRgb(hsl.h, hsl.s, hsl.l)
        r255 = rotated.r
        g255 = rotated.g
        b255 = rotated.b
      }

      // 5. Vibrance適用 (低彩度ほど強く効く)
      if (hasVibrance) {
        const max = Math.max(r255, g255, b255)
        const min = Math.min(r255, g255, b255)

        if (max > 0) {
          // 彩度 (0-1)
          const sat = (max - min) / max

          // 低彩度ほど強く効く (1 - sat)
          // さらに肌色保護: 彩度が中程度の暖色系は抑制
          const vibranceFactor = (1 - sat) * (1 - sat) // 二乗でより低彩度に集中

          // 彩度調整量
          const adjustment = vibrance * vibranceFactor * 0.5

          // グレーポイント (平均)
          const gray = (r255 + g255 + b255) / 3

          // 彩度を調整
          r255 = Math.round(Math.max(0, Math.min(255, gray + (r255 - gray) * (1 + adjustment))))
          g255 = Math.round(Math.max(0, Math.min(255, gray + (g255 - gray) * (1 + adjustment))))
          b255 = Math.round(Math.max(0, Math.min(255, gray + (b255 - gray) * (1 + adjustment))))
        }
      }

      newData[i] = r255
      newData[i + 1] = g255
      newData[i + 2] = b255
      newData[i + 3] = a
    }

    return new ImageData(newData, width, height)
  },

  /** 複数のLUTを合成 (順番に適用した結果と等価) */
  compose: (...luts: Lut1D[]): Lut1D => {
    if (luts.length === 0) {
      return $Lut1D.identity()
    }

    const result = $Lut1D.identity()

    for (const lut of luts) {
      const newR = new Float32Array(256)
      const newG = new Float32Array(256)
      const newB = new Float32Array(256)

      for (let i = 0; i < 256; i++) {
        // result の出力値 (0-1) を使って lut を補間ルックアップ
        const rVal = result.r[i]!
        const gVal = result.g[i]!
        const bVal = result.b[i]!

        newR[i] = interpolateLut(lut.r, rVal)
        newG[i] = interpolateLut(lut.g, gVal)
        newB[i] = interpolateLut(lut.b, bVal)
      }

      result.r = newR
      result.g = newG
      result.b = newB
    }

    return result
  },

  /**
   * 2つの浮動小数点LUTを合成 (first → second の順で適用)
   * second の入力は 0.0-1.0 なので、first の出力を補間してルックアップ
   */
  composeChannel: (first: Float32Array, second: Float32Array): Float32Array => {
    const result = new Float32Array(256)

    for (let i = 0; i < 256; i++) {
      const v = first[i]! // 0.0-1.0
      result[i] = interpolateLut(second, v)
    }

    return result
  },
}

/** LUT を補間ルックアップ (線形補間) */
function interpolateLut(lut: Float32Array, value: number): number {
  const idx = value * 255
  const lo = Math.floor(idx)
  const hi = Math.min(255, lo + 1)
  const t = idx - lo
  return lut[lo]! * (1 - t) + lut[hi]! * t
}
