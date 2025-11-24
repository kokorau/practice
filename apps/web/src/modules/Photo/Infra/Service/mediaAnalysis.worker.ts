/**
 * Media Analysis Web Worker
 * OffscreenCanvas を使って video フレーム取得 → LUT 適用 → 解析 を一括処理
 */

import { $Photo } from '../../Domain/ValueObject/Photo'
import { $PhotoAnalysis } from '../../Domain/ValueObject/PhotoAnalysis'
import type { Lut } from '../../../Filter/Domain/ValueObject/Lut'

export type AnalysisRequest = {
  id: number
  type: 'analyze'
  imageData: ImageData
  lut?: Lut
  // pixelEffects の一部（Worker で処理可能なもの）
  vibrance?: number
  hueRotation?: number
  /** 解析用にダウンサンプルするスケール (0.25 = 1/4 サイズ) */
  downsampleScale?: number
}

export type AnalysisResponse = {
  id: number
  analysis: ReturnType<typeof $PhotoAnalysis.create>
}

/**
 * LUT を適用（シンプル版、Worker 内で使用）
 */
const applyLut = (imageData: ImageData, lut: Lut): void => {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut.r[data[i]!]!
    data[i + 1] = lut.g[data[i + 1]!]!
    data[i + 2] = lut.b[data[i + 2]!]!
  }
}

/**
 * HSL 変換ユーティリティ
 */
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return [0, 0, l]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return [h, s, l]
}

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ]
}

/**
 * Vibrance と Hue Rotation を適用
 */
const applyEffects = (
  imageData: ImageData,
  vibrance: number,
  hueRotation: number
): void => {
  const data = imageData.data
  const hueShift = hueRotation / 360

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]!
    let g = data[i + 1]!
    let b = data[i + 2]!

    // Hue Rotation
    if (Math.abs(hueRotation) > 0.01) {
      const [h, s, l] = rgbToHsl(r, g, b)
      const newH = (h + hueShift + 1) % 1
      ;[r, g, b] = hslToRgb(newH, s, l)
    }

    // Vibrance
    if (Math.abs(vibrance) > 0.01) {
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const sat = (max - min) / 255
      const avg = (r + g + b) / 3
      const boost = vibrance * (1 - sat)
      r = Math.min(255, Math.max(0, avg + (r - avg) * (1 + boost)))
      g = Math.min(255, Math.max(0, avg + (g - avg) * (1 + boost)))
      b = Math.min(255, Math.max(0, avg + (b - avg) * (1 + boost)))
    }

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}

/**
 * ダウンサンプリング
 */
const downsample = (imageData: ImageData, scale: number): ImageData => {
  if (scale >= 1) return imageData

  const newWidth = Math.max(1, Math.floor(imageData.width * scale))
  const newHeight = Math.max(1, Math.floor(imageData.height * scale))

  const canvas = new OffscreenCanvas(newWidth, newHeight)
  const ctx = canvas.getContext('2d')!

  // ImageData を一時キャンバスに描画
  const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height)
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(imageData, 0, 0)

  // 縮小して描画
  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight)

  return ctx.getImageData(0, 0, newWidth, newHeight)
}

self.onmessage = (e: MessageEvent<AnalysisRequest>) => {
  const { id, type, imageData, lut, vibrance, hueRotation, downsampleScale } = e.data

  if (type !== 'analyze') return

  let processedData = imageData

  // 1. ダウンサンプリング（解析精度は多少落ちるが高速化）
  if (downsampleScale && downsampleScale < 1) {
    processedData = downsample(processedData, downsampleScale)
  }

  // 2. LUT 適用
  if (lut) {
    applyLut(processedData, lut)
  }

  // 3. エフェクト適用
  if ((vibrance && Math.abs(vibrance) > 0.01) || (hueRotation && Math.abs(hueRotation) > 0.01)) {
    applyEffects(processedData, vibrance ?? 0, hueRotation ?? 0)
  }

  // 4. 解析
  const photo = $Photo.create(processedData)
  const analysis = $PhotoAnalysis.create(photo)

  const response: AnalysisResponse = { id, analysis }
  self.postMessage(response)
}
