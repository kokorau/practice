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
   * 輝度に基づく色相/彩度調整 3D LUT を生成
   * シャドウ/ミッドトーン/ハイライトを個別に調整可能
   * @param target 'shadows' | 'midtones' | 'highlights'
   * @param hueShiftAmount 色相シフト量 (度、-180〜180)
   * @param saturationBoost 彩度調整 (-1〜1)
   * @param range 影響範囲の広さ (0〜1、デフォルト0.3)
   */
  luminanceAdjust: (
    target: 'shadows' | 'midtones' | 'highlights',
    hueShiftAmount: number = 0,
    saturationBoost: number = 0,
    range: number = 0.3,
    size: number = 17
  ): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    // ターゲット輝度の中心値
    const targetCenter = target === 'shadows' ? 0.2 : target === 'highlights' ? 0.8 : 0.5

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          // 輝度を計算 (Rec. 709)
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

          // ターゲット範囲からの距離を計算
          const distance = Math.abs(luminance - targetCenter)
          const factor = Math.max(0, 1 - distance / range)

          if (factor > 0 && (hueShiftAmount !== 0 || saturationBoost !== 0)) {
            // RGB → HSL
            const hsl = rgbToHsl(r, g, b)

            // 色相シフト
            if (hueShiftAmount !== 0) {
              hsl.h = (hsl.h + hueShiftAmount * factor + 360) % 360
            }

            // 彩度調整
            if (saturationBoost !== 0) {
              hsl.s = Math.max(0, Math.min(1, hsl.s + saturationBoost * factor))
            }

            // HSL → RGB
            const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
            data[idx] = rgb.r
            data[idx + 1] = rgb.g
            data[idx + 2] = rgb.b
          } else {
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
   * 特定の色相範囲を保護しつつ彩度調整 3D LUT を生成
   * 指定した色相は彩度を変えず、それ以外を調整
   * @param protectHue 保護する色相 (0-360)
   * @param protectRange 保護範囲 (度)
   * @param saturationBoost 保護範囲外の彩度調整 (-1〜1)
   */
  protectHue: (
    protectHue: number,
    protectRange: number = 30,
    saturationBoost: number = -0.5,
    size: number = 17
  ): Lut3D => {
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

          // 保護色相からの距離を計算
          const hueDiff = Math.abs(((hsl.h - protectHue + 540) % 360) - 180)

          if (hueDiff > protectRange) {
            // 保護範囲外: 彩度を調整
            const factor = Math.min(1, (hueDiff - protectRange) / protectRange)
            hsl.s = Math.max(0, Math.min(1, hsl.s + saturationBoost * factor))

            const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
            data[idx] = rgb.r
            data[idx + 1] = rgb.g
            data[idx + 2] = rgb.b
          } else {
            // 保護範囲内: そのまま
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
   * デュオトーン 3D LUT を生成
   * シャドウとハイライトにそれぞれ色を割り当て
   * @param shadowColor シャドウ色 { r, g, b } (0-1)
   * @param highlightColor ハイライト色 { r, g, b } (0-1)
   * @param contrast コントラスト調整 (0-2, default 1)
   */
  duotone: (
    shadowColor: { r: number; g: number; b: number },
    highlightColor: { r: number; g: number; b: number },
    contrast: number = 1,
    size: number = 17
  ): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          // 輝度を計算 (Rec. 709)
          let luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

          // コントラスト適用
          luminance = (luminance - 0.5) * contrast + 0.5
          luminance = Math.max(0, Math.min(1, luminance))

          // シャドウ色とハイライト色を補間
          data[idx] = shadowColor.r + (highlightColor.r - shadowColor.r) * luminance
          data[idx + 1] = shadowColor.g + (highlightColor.g - shadowColor.g) * luminance
          data[idx + 2] = shadowColor.b + (highlightColor.b - shadowColor.b) * luminance
        }
      }
    }

    return { type: 'lut3d', size, data }
  },

  /**
   * トライトーン 3D LUT を生成
   * シャドウ、ミッドトーン、ハイライトにそれぞれ色を割り当て
   * @param shadowColor シャドウ色 { r, g, b } (0-1)
   * @param midColor ミッドトーン色 { r, g, b } (0-1)
   * @param highlightColor ハイライト色 { r, g, b } (0-1)
   */
  tritone: (
    shadowColor: { r: number; g: number; b: number },
    midColor: { r: number; g: number; b: number },
    highlightColor: { r: number; g: number; b: number },
    size: number = 17
  ): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          // 輝度を計算 (Rec. 709)
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

          // 3点補間
          if (luminance < 0.5) {
            const t = luminance * 2
            data[idx] = shadowColor.r + (midColor.r - shadowColor.r) * t
            data[idx + 1] = shadowColor.g + (midColor.g - shadowColor.g) * t
            data[idx + 2] = shadowColor.b + (midColor.b - shadowColor.b) * t
          } else {
            const t = (luminance - 0.5) * 2
            data[idx] = midColor.r + (highlightColor.r - midColor.r) * t
            data[idx + 1] = midColor.g + (highlightColor.g - midColor.g) * t
            data[idx + 2] = midColor.b + (highlightColor.b - midColor.b) * t
          }
        }
      }
    }

    return { type: 'lut3d', size, data }
  },

  /**
   * カラーマトリックス変換 3D LUT を生成
   * 3x3マトリックスでRGB変換（映画業界標準）
   * @param matrix 3x3変換マトリックス [r1,r2,r3, g1,g2,g3, b1,b2,b3]
   */
  colorMatrix: (matrix: number[], size: number = 17): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          // マトリックス乗算
          data[idx] = Math.max(0, Math.min(1, matrix[0]! * r + matrix[1]! * g + matrix[2]! * b))
          data[idx + 1] = Math.max(0, Math.min(1, matrix[3]! * r + matrix[4]! * g + matrix[5]! * b))
          data[idx + 2] = Math.max(0, Math.min(1, matrix[6]! * r + matrix[7]! * g + matrix[8]! * b))
        }
      }
    }

    return { type: 'lut3d', size, data }
  },

  /**
   * 色温度シフト 3D LUT を生成
   * @param kelvinShift 色温度シフト量 (-100〜100、負で暖色、正で寒色)
   */
  colorTemperature: (kelvinShift: number, size: number = 17): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    // 簡易的な色温度変換係数
    const rMult = 1 - kelvinShift * 0.003
    const bMult = 1 + kelvinShift * 0.003

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          data[idx] = Math.max(0, Math.min(1, r * rMult))
          data[idx + 1] = g
          data[idx + 2] = Math.max(0, Math.min(1, b * bMult))
        }
      }
    }

    return { type: 'lut3d', size, data }
  },

  /**
   * 複数の色相を同時にシフト 3D LUT を生成
   * @param shifts 色相シフトの配列 [{ sourceHue, targetHue, range, strength }, ...]
   */
  multiHueShift: (
    shifts: Array<{ sourceHue: number; targetHue: number; range: number; strength: number }>,
    size: number = 17
  ): Lut3D => {
    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          const hsl = rgbToHsl(r, g, b)
          let totalShift = 0
          let totalWeight = 0

          // 各シフト設定を適用
          for (const shift of shifts) {
            const hueDiff = Math.abs(((hsl.h - shift.sourceHue + 540) % 360) - 180)
            if (hueDiff < shift.range) {
              const factor = (1 - hueDiff / shift.range) * shift.strength
              const shiftAmount = ((shift.targetHue - shift.sourceHue + 540) % 360) - 180
              totalShift += shiftAmount * factor
              totalWeight += factor
            }
          }

          if (totalWeight > 0) {
            hsl.h = (hsl.h + totalShift + 360) % 360
            const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
            data[idx] = rgb.r
            data[idx + 1] = rgb.g
            data[idx + 2] = rgb.b
          } else {
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
