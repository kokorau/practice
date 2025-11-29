/**
 * LUT (Look-Up Table) - ピクセル値変換テーブル
 */

import { hslToRgb, rgbToHsl, hueDifference } from './colors'

/** 最終出力用LUT (8bit) - 1D */
export type Lut = {
  r: Uint8Array  // [256] input -> output mapping (0-255)
  g: Uint8Array
  b: Uint8Array
}

/** 内部計算用LUT (浮動小数点) - 1D */
export type LutFloat = {
  r: Float32Array  // [256] input -> output mapping (0.0-1.0)
  g: Float32Array
  b: Float32Array
}

/**
 * 3D LUT - RGB組み合わせ全体に対する変換テーブル
 * サイズは size^3 × 3 (通常 17, 33, 65 など)
 * データは R → G → B の順でインターリーブ
 * インデックス: (r + g * size + b * size * size) * 3
 */
export type Lut3D = {
  size: number           // グリッドサイズ (17, 33, 65 など)
  data: Float32Array     // [size^3 * 3] RGB values (0.0-1.0)
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
   * @param effects ピクセルエフェクト (vibrance, selective color等)
   */
  applyWithEffects: (
    imageData: ImageData,
    lut: Lut,
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

    // Posterize 用の LUT を事前計算 (1D LUT)
    let posterizeLut: Uint8Array | null = null
    if (hasPosterize) {
      posterizeLut = new Uint8Array(256)
      const step = 255 / (posterizeLevels - 1)
      for (let i = 0; i < 256; i++) {
        // 入力値を levels 段階に量子化
        const level = Math.round(i / 255 * (posterizeLevels - 1))
        posterizeLut[i] = Math.round(level * step)
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      // 1. LUT適用
      let r = lut.r[data[i]!]!
      let g = lut.g[data[i + 1]!]!
      let b = lut.b[data[i + 2]!]!
      const a = data[i + 3]!

      // 2. Selective Color 適用
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

      // 3. Posterize 適用 (LUTベース)
      if (hasPosterize && posterizeLut) {
        r = posterizeLut[r]!
        g = posterizeLut[g]!
        b = posterizeLut[b]!
      }

      // 4. Hue Rotation 適用
      if (hasHueRotation) {
        const hsl = rgbToHsl(r, g, b)
        // 色相を回転 (0-360度の範囲に収める)
        hsl.h = (hsl.h + hueRotation + 360) % 360
        const rotated = hslToRgb(hsl.h, hsl.s, hsl.l)
        r = rotated.r
        g = rotated.g
        b = rotated.b
      }

      // 5. Vibrance適用 (低彩度ほど強く効く)
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

/** 3D LUT 操作 */
export const $Lut3D = {
  /**
   * 無変換3D LUT (identity)
   * 入力と出力が同じ
   */
  identity: (size: number = 17): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const idx = (r + g * size + b * size * size) * 3
          data[idx] = r / (size - 1)      // R
          data[idx + 1] = g / (size - 1)  // G
          data[idx + 2] = b / (size - 1)  // B
        }
      }
    }

    return { size, data }
  },

  /**
   * 1D LUT を 3D LUT に変換
   * 各チャンネル独立の変換を3D空間に展開
   */
  fromLut1D: (lut: Lut, size: number = 17): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const idx = (r + g * size + b * size * size) * 3
          // 入力を0-255にスケール
          const ri = Math.round((r / (size - 1)) * 255)
          const gi = Math.round((g / (size - 1)) * 255)
          const bi = Math.round((b / (size - 1)) * 255)
          // LUTを適用して0-1にスケール
          data[idx] = lut.r[ri]! / 255      // R
          data[idx + 1] = lut.g[gi]! / 255  // G
          data[idx + 2] = lut.b[bi]! / 255  // B
        }
      }
    }

    return { size, data }
  },

  /**
   * 3D LUT から RGB 値を三線形補間でルックアップ
   * @param lut 3D LUT
   * @param r 0-1
   * @param g 0-1
   * @param b 0-1
   * @returns [r, g, b] 0-1
   */
  lookup: (lut: Lut3D, r: number, g: number, b: number): [number, number, number] => {
    const { size, data } = lut
    const maxIdx = size - 1

    // スケーリング
    const rScaled = r * maxIdx
    const gScaled = g * maxIdx
    const bScaled = b * maxIdx

    // 隣接インデックス
    const r0 = Math.floor(rScaled)
    const g0 = Math.floor(gScaled)
    const b0 = Math.floor(bScaled)
    const r1 = Math.min(r0 + 1, maxIdx)
    const g1 = Math.min(g0 + 1, maxIdx)
    const b1 = Math.min(b0 + 1, maxIdx)

    // 補間係数
    const rT = rScaled - r0
    const gT = gScaled - g0
    const bT = bScaled - b0

    // 8つの隣接点をルックアップ
    const getColor = (ri: number, gi: number, bi: number): [number, number, number] => {
      const idx = (ri + gi * size + bi * size * size) * 3
      return [data[idx]!, data[idx + 1]!, data[idx + 2]!]
    }

    const c000 = getColor(r0, g0, b0)
    const c100 = getColor(r1, g0, b0)
    const c010 = getColor(r0, g1, b0)
    const c110 = getColor(r1, g1, b0)
    const c001 = getColor(r0, g0, b1)
    const c101 = getColor(r1, g0, b1)
    const c011 = getColor(r0, g1, b1)
    const c111 = getColor(r1, g1, b1)

    // 三線形補間
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const result: [number, number, number] = [0, 0, 0]
    for (let i = 0; i < 3; i++) {
      // R方向の補間
      const c00 = lerp(c000[i]!, c100[i]!, rT)
      const c01 = lerp(c001[i]!, c101[i]!, rT)
      const c10 = lerp(c010[i]!, c110[i]!, rT)
      const c11 = lerp(c011[i]!, c111[i]!, rT)
      // G方向の補間
      const c0 = lerp(c00, c10, gT)
      const c1 = lerp(c01, c11, gT)
      // B方向の補間
      result[i] = lerp(c0, c1, bT)
    }

    return result
  },

  /**
   * 3D LUT を ImageData に適用
   */
  apply: (imageData: ImageData, lut: Lut3D): ImageData => {
    const { data, width, height } = imageData
    const newData = new Uint8ClampedArray(data.length)

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]! / 255
      const g = data[i + 1]! / 255
      const b = data[i + 2]! / 255
      const a = data[i + 3]!

      const [outR, outG, outB] = $Lut3D.lookup(lut, r, g, b)

      newData[i] = Math.round(outR * 255)
      newData[i + 1] = Math.round(outG * 255)
      newData[i + 2] = Math.round(outB * 255)
      newData[i + 3] = a
    }

    return new ImageData(newData, width, height)
  },

  /**
   * WebGL用に3Dテクスチャデータを生成
   * WebGL1では3Dテクスチャがないため、2Dテクスチャにパックする
   * レイアウト: size x (size * size) の2Dテクスチャ
   * 各「行」がB軸の1スライス
   */
  toTexture2D: (lut: Lut3D): { width: number; height: number; data: Uint8Array } => {
    const { size, data } = lut
    const width = size
    const height = size * size
    const texData = new Uint8Array(width * height * 4)

    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const srcIdx = (r + g * size + b * size * size) * 3
          const dstIdx = (r + (g + b * size) * size) * 4
          texData[dstIdx] = Math.round(data[srcIdx]! * 255)
          texData[dstIdx + 1] = Math.round(data[srcIdx + 1]! * 255)
          texData[dstIdx + 2] = Math.round(data[srcIdx + 2]! * 255)
          texData[dstIdx + 3] = 255
        }
      }
    }

    return { width, height, data: texData }
  },
}
