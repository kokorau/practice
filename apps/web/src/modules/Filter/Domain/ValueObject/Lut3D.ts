/**
 * 3D LUT (Look-Up Table) - RGB組み合わせ全体に対する変換テーブル
 */

import type { Lut1D } from './Lut1D'

// HSL 変換ユーティリティ (0-1 スケール)
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s, l }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return { r, g, b }
}

/**
 * 3D LUT - RGB組み合わせ全体に対する変換テーブル
 * サイズは size^3 × 3 (通常 17, 33, 65 など)
 * データは R → G → B の順でインターリーブ
 * インデックス: (r + g * size + b * size * size) * 3
 */
export type Lut3D = {
  type: 'lut3d'
  size: number           // グリッドサイズ (17, 33, 65 など)
  data: Float32Array     // [size^3 * 3] RGB values (0.0-1.0)
}

/** 3D LUT 操作 */
export const $Lut3D = {
  /** Type guard: 3D LUT かどうかを判定 */
  is: (lut: { type: string }): lut is Lut3D => {
    return lut.type === 'lut3d'
  },

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

    return { type: 'lut3d', size, data }
  },

  /** 3D LUT を作成 */
  create: (size: number, data: Float32Array): Lut3D => ({
    type: 'lut3d',
    size,
    data,
  }),

  /**
   * 1D LUT を 3D LUT に変換
   * 各チャンネル独立の変換を3D空間に展開
   * Lut1D は既に Float32Array (0-1) なので直接使用可能
   */
  fromLut1D: (lut: Lut1D, size: number = 17): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const idx = (r + g * size + b * size * size) * 3
          // 入力を0-255インデックスにスケール
          const ri = Math.round((r / (size - 1)) * 255)
          const gi = Math.round((g / (size - 1)) * 255)
          const bi = Math.round((b / (size - 1)) * 255)
          // LUTから直接読み取り (既に0-1)
          data[idx] = lut.r[ri]!
          data[idx + 1] = lut.g[gi]!
          data[idx + 2] = lut.b[bi]!
        }
      }
    }

    return { type: 'lut3d', size, data }
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

  // ========================================
  // ジェネレーター関数
  // ========================================

  /**
   * チャンネルスワップ 3D LUT を生成
   * RGB チャンネルを入れ替える
   * @param mapping [出力R, 出力G, 出力B] それぞれ 'r' | 'g' | 'b' を指定
   */
  channelSwap: (mapping: ['r' | 'g' | 'b', 'r' | 'g' | 'b', 'r' | 'g' | 'b'], size: number = 17): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    const getChannel = (r: number, g: number, b: number, ch: 'r' | 'g' | 'b') => {
      if (ch === 'r') return r
      if (ch === 'g') return g
      return b
    }

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          data[idx] = getChannel(r, g, b, mapping[0])
          data[idx + 1] = getChannel(r, g, b, mapping[1])
          data[idx + 2] = getChannel(r, g, b, mapping[2])
        }
      }
    }

    return { type: 'lut3d', size, data }
  },

  /**
   * 色相シフト 3D LUT を生成
   * 特定の色相範囲を別の色相にシフト
   * @param sourceHue ソース色相 (0-360)
   * @param targetHue ターゲット色相 (0-360)
   * @param range 影響範囲 (度)
   * @param strength 強度 (0-1)
   */
  hueShift: (sourceHue: number, targetHue: number, range: number = 30, strength: number = 1, size: number = 17): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          // RGB → HSL
          const hsl = rgbToHsl(r, g, b)

          // 色相差を計算
          const hueDiff = Math.abs(((hsl.h - sourceHue + 540) % 360) - 180)

          if (hueDiff < range) {
            // 範囲内：色相をシフト
            const factor = (1 - hueDiff / range) * strength
            const shift = ((targetHue - sourceHue + 540) % 360) - 180
            hsl.h = (hsl.h + shift * factor + 360) % 360

            // HSL → RGB
            const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
            data[idx] = rgb.r
            data[idx + 1] = rgb.g
            data[idx + 2] = rgb.b
          } else {
            // 範囲外：そのまま
            data[idx] = r
            data[idx + 1] = g
            data[idx + 2] = b
          }
        }
      }
    }

    return { type: 'lut3d', size, data }
  },

  /**
   * 色相ごとの彩度調整 3D LUT を生成
   * @param hue ターゲット色相 (0-360)
   * @param saturationBoost 彩度ブースト (-1 to 1)
   * @param range 影響範囲 (度)
   */
  hueSaturation: (hue: number, saturationBoost: number, range: number = 30, size: number = 17): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          // RGB → HSL
          const hsl = rgbToHsl(r, g, b)

          // 色相差を計算
          const hueDiff = Math.abs(((hsl.h - hue + 540) % 360) - 180)

          if (hueDiff < range) {
            // 範囲内：彩度を調整
            const factor = 1 - hueDiff / range
            hsl.s = Math.max(0, Math.min(1, hsl.s + saturationBoost * factor))

            // HSL → RGB
            const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
            data[idx] = rgb.r
            data[idx + 1] = rgb.g
            data[idx + 2] = rgb.b
          } else {
            // 範囲外：そのまま
            data[idx] = r
            data[idx + 1] = g
            data[idx + 2] = b
          }
        }
      }
    }

    return { type: 'lut3d', size, data }
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
