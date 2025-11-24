/**
 * LUT (Look-Up Table) - ピクセル値変換テーブル
 */

import { hslToRgb, rgbToHsl, hueDifference } from './colors'

/** 最終出力用LUT (8bit) */
export type Lut = {
  r: Uint8Array  // [256] input -> output mapping (0-255)
  g: Uint8Array
  b: Uint8Array
}

/** 内部計算用LUT (浮動小数点) */
export type LutFloat = {
  r: Float32Array  // [256] input -> output mapping (0.0-1.0)
  g: Float32Array
  b: Float32Array
}

export const $Lut = {
  /** 無変換LUT (identity) */
  identity: (): Lut => {
    const identity = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      identity[i] = i
    }
    return {
      r: identity.slice(),
      g: identity.slice(),
      b: identity.slice(),
    }
  },

  /** Master LUT (RGB共通) を作成 */
  fromMaster: (master: Uint8Array): Lut => ({
    r: master.slice(),
    g: master.slice(),
    b: master.slice(),
  }),

  /** LUTをImageDataに適用 (新しいImageDataを返す) */
  apply: (imageData: ImageData, lut: Lut): ImageData => {
    const { data, width, height } = imageData
    const newData = new Uint8ClampedArray(data.length)

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const a = data[i + 3]!

      newData[i] = lut.r[r]!
      newData[i + 1] = lut.g[g]!
      newData[i + 2] = lut.b[b]!
      newData[i + 3] = a  // アルファは変更しない
    }

    return new ImageData(newData, width, height)
  },

  /** LUTをImageDataに直接適用 (破壊的) */
  applyInPlace: (imageData: ImageData, lut: Lut): void => {
    const { data } = imageData

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!

      data[i] = lut.r[r]!
      data[i + 1] = lut.g[g]!
      data[i + 2] = lut.b[b]!
      // アルファは変更しない
    }
  },

  /**
   * LUT適用後にピクセルエフェクトも適用
   * @param imageData 入力画像
   * @param lut LUT
   * @param effects ピクセルエフェクト (vibrance, duotone, selective color等)
   */
  applyWithEffects: (
    imageData: ImageData,
    lut: Lut,
    effects: {
      vibrance?: number
      // Duotone/Tritone
      toneMode?: 'normal' | 'duotone' | 'tritone'
      toneColor1Hue?: number
      toneColor1Sat?: number
      toneColor2Hue?: number
      toneColor2Sat?: number
      toneColor3Hue?: number
      toneColor3Sat?: number
      // Selective Color
      selectiveColorEnabled?: boolean
      selectiveHue?: number
      selectiveRange?: number
      selectiveDesaturate?: number
    }
  ): ImageData => {
    const { data, width, height } = imageData
    const newData = new Uint8ClampedArray(data.length)

    // エフェクトフラグ
    const vibrance = effects.vibrance ?? 0
    const hasVibrance = Math.abs(vibrance) > 0.001

    const toneMode = effects.toneMode ?? 'normal'
    const hasTone = toneMode !== 'normal'

    const selectiveEnabled = effects.selectiveColorEnabled ?? false
    const selectiveHue = effects.selectiveHue ?? 0
    const selectiveRange = effects.selectiveRange ?? 30
    const selectiveDesaturate = effects.selectiveDesaturate ?? 0

    // Duotone/Tritone 用の色を事前計算
    let toneColor1: { r: number; g: number; b: number } | null = null
    let toneColor2: { r: number; g: number; b: number } | null = null
    let toneColor3: { r: number; g: number; b: number } | null = null

    if (hasTone) {
      // HSL→RGB (Lightness=0.5 で最大彩度)
      toneColor1 = hslToRgb(effects.toneColor1Hue ?? 220, effects.toneColor1Sat ?? 0.7, 0.5)
      toneColor2 = hslToRgb(effects.toneColor2Hue ?? 40, effects.toneColor2Sat ?? 0.7, 0.5)
      if (toneMode === 'tritone') {
        toneColor3 = hslToRgb(effects.toneColor3Hue ?? 300, effects.toneColor3Sat ?? 0.5, 0.5)
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      // 1. LUT適用
      let r = lut.r[data[i]!]!
      let g = lut.g[data[i + 1]!]!
      let b = lut.b[data[i + 2]!]!
      const a = data[i + 3]!

      // 2. Duotone/Tritone 適用
      if (hasTone && toneColor1 && toneColor2) {
        // 輝度を計算 (Rec. 709)
        const luma = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255

        if (toneMode === 'duotone') {
          // 2色間を輝度で補間
          r = Math.round(toneColor1.r * (1 - luma) + toneColor2.r * luma)
          g = Math.round(toneColor1.g * (1 - luma) + toneColor2.g * luma)
          b = Math.round(toneColor1.b * (1 - luma) + toneColor2.b * luma)
        } else if (toneMode === 'tritone' && toneColor3) {
          // 3色間を輝度で補間 (シャドウ→ミッド→ハイライト)
          if (luma < 0.5) {
            const t = luma * 2 // 0-1
            r = Math.round(toneColor1.r * (1 - t) + toneColor3.r * t)
            g = Math.round(toneColor1.g * (1 - t) + toneColor3.g * t)
            b = Math.round(toneColor1.b * (1 - t) + toneColor3.b * t)
          } else {
            const t = (luma - 0.5) * 2 // 0-1
            r = Math.round(toneColor3.r * (1 - t) + toneColor2.r * t)
            g = Math.round(toneColor3.g * (1 - t) + toneColor2.g * t)
            b = Math.round(toneColor3.b * (1 - t) + toneColor2.b * t)
          }
        }
      }

      // 3. Selective Color 適用
      if (selectiveEnabled) {
        const hsl = rgbToHsl(r, g, b)
        const diff = hueDifference(hsl.h, selectiveHue)

        if (diff > selectiveRange) {
          // 範囲外: 彩度を下げる
          const gray = Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722)
          // selectiveDesaturate: 0=完全グレー, 1=元のまま
          r = Math.round(gray + (r - gray) * selectiveDesaturate)
          g = Math.round(gray + (g - gray) * selectiveDesaturate)
          b = Math.round(gray + (b - gray) * selectiveDesaturate)
        } else if (diff > selectiveRange * 0.7) {
          // エッジ付近: スムーズに遷移
          const edgeT = (diff - selectiveRange * 0.7) / (selectiveRange * 0.3)
          const gray = Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722)
          const desatAmount = selectiveDesaturate + (1 - selectiveDesaturate) * (1 - edgeT)
          r = Math.round(gray + (r - gray) * desatAmount)
          g = Math.round(gray + (g - gray) * desatAmount)
          b = Math.round(gray + (b - gray) * desatAmount)
        }
        // 範囲内: そのまま
      }

      // 4. Vibrance適用 (低彩度ほど強く効く)
      if (hasVibrance) {
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)

        if (max > 0) {
          // 彩度 (0-1)
          const sat = (max - min) / max

          // 低彩度ほど強く効く (1 - sat)
          // さらに肌色保護: 彩度が中程度の暖色系は抑制
          const vibranceFactor = (1 - sat) * (1 - sat) // 二乗でより低彩度に集中

          // 彩度調整量
          const adjustment = vibrance * vibranceFactor * 0.5

          // グレーポイント (平均)
          const gray = (r + g + b) / 3

          // 彩度を調整
          r = Math.round(Math.max(0, Math.min(255, gray + (r - gray) * (1 + adjustment))))
          g = Math.round(Math.max(0, Math.min(255, gray + (g - gray) * (1 + adjustment))))
          b = Math.round(Math.max(0, Math.min(255, gray + (b - gray) * (1 + adjustment))))
        }
      }

      newData[i] = r
      newData[i + 1] = g
      newData[i + 2] = b
      newData[i + 3] = a
    }

    return new ImageData(newData, width, height)
  },

  /** 複数のLUTを合成 (順番に適用した結果と等価) */
  compose: (...luts: Lut[]): Lut => {
    if (luts.length === 0) {
      return $Lut.identity()
    }

    const result = $Lut.identity()

    for (const lut of luts) {
      const newR = new Uint8Array(256)
      const newG = new Uint8Array(256)
      const newB = new Uint8Array(256)

      for (let i = 0; i < 256; i++) {
        newR[i] = lut.r[result.r[i]!]!
        newG[i] = lut.g[result.g[i]!]!
        newB[i] = lut.b[result.b[i]!]!
      }

      result.r = newR
      result.g = newG
      result.b = newB
    }

    return result
  },
}

/** 浮動小数点LUT操作 */
export const $LutFloat = {
  /** 無変換LUT (identity) */
  identity: (): LutFloat => {
    const identity = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      identity[i] = i / 255
    }
    return {
      r: identity.slice(),
      g: identity.slice(),
      b: identity.slice(),
    }
  },

  /** Master LUT (RGB共通) を作成 */
  fromMaster: (master: Float32Array): LutFloat => ({
    r: master.slice(),
    g: master.slice(),
    b: master.slice(),
  }),

  /** 浮動小数点LUTを8bit LUTに変換 */
  quantize: (lutFloat: LutFloat): Lut => {
    const r = new Uint8Array(256)
    const g = new Uint8Array(256)
    const b = new Uint8Array(256)

    for (let i = 0; i < 256; i++) {
      r[i] = Math.round(Math.max(0, Math.min(255, lutFloat.r[i]! * 255)))
      g[i] = Math.round(Math.max(0, Math.min(255, lutFloat.g[i]! * 255)))
      b[i] = Math.round(Math.max(0, Math.min(255, lutFloat.b[i]! * 255)))
    }

    return { r, g, b }
  },

  /**
   * 2つの浮動小数点LUTを合成 (first → second の順で適用)
   * second の入力は 0.0-1.0 なので、first の出力を補間してルックアップ
   */
  compose: (first: Float32Array, second: Float32Array): Float32Array => {
    const result = new Float32Array(256)

    for (let i = 0; i < 256; i++) {
      const v = first[i]! // 0.0-1.0
      // second を補間ルックアップ (線形補間)
      const idx = v * 255
      const lo = Math.floor(idx)
      const hi = Math.min(255, lo + 1)
      const t = idx - lo
      result[i] = second[lo]! * (1 - t) + second[hi]! * t
    }

    return result
  },
}
