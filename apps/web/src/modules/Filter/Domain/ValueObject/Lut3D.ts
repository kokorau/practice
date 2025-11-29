/**
 * 3D LUT (Look-Up Table) - RGB組み合わせ全体に対する変換テーブル
 */

import type { Lut1D } from './Lut1D'

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
