/**
 * LUT (Look-Up Table) - ピクセル値変換テーブル
 */

export type Lut = {
  r: Uint8Array  // [256] input -> output mapping
  g: Uint8Array
  b: Uint8Array
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
