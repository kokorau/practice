/**
 * LUT Worker Utilities
 * Shared functions for applying LUTs in Web Workers
 * These are optimized versions that work directly on ImageData
 */

import type { Lut, Lut1D, Lut3D } from './Lut'

/**
 * Type guard: Check if LUT is a 3D LUT
 */
export const isLut3D = (lut: Lut): lut is Lut3D => {
  return lut.type === 'lut3d'
}

/**
 * Apply 1D LUT to ImageData (in-place mutation)
 * Lut1D values are Float32Array (0-1) so we multiply by 255
 */
export const applyLut1DInPlace = (imageData: ImageData, lut: Lut1D): void => {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(lut.r[data[i]!]! * 255)
    data[i + 1] = Math.round(lut.g[data[i + 1]!]! * 255)
    data[i + 2] = Math.round(lut.b[data[i + 2]!]! * 255)
  }
}

/**
 * Apply 3D LUT to ImageData (in-place mutation) with trilinear interpolation
 */
export const applyLut3DInPlace = (imageData: ImageData, lut: Lut3D): void => {
  const data = imageData.data
  const { size, data: lutData } = lut
  const maxIdx = size - 1

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const getColor = (ri: number, gi: number, bi: number): [number, number, number] => {
    const idx = (ri + gi * size + bi * size * size) * 3
    return [lutData[idx]!, lutData[idx + 1]!, lutData[idx + 2]!]
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]! / 255
    const g = data[i + 1]! / 255
    const b = data[i + 2]! / 255

    // Scale to LUT indices
    const rScaled = r * maxIdx
    const gScaled = g * maxIdx
    const bScaled = b * maxIdx

    // Get integer indices
    const r0 = Math.floor(rScaled)
    const g0 = Math.floor(gScaled)
    const b0 = Math.floor(bScaled)
    const r1 = Math.min(r0 + 1, maxIdx)
    const g1 = Math.min(g0 + 1, maxIdx)
    const b1 = Math.min(b0 + 1, maxIdx)

    // Interpolation weights
    const rT = rScaled - r0
    const gT = gScaled - g0
    const bT = bScaled - b0

    // Sample 8 corners
    const c000 = getColor(r0, g0, b0)
    const c100 = getColor(r1, g0, b0)
    const c010 = getColor(r0, g1, b0)
    const c110 = getColor(r1, g1, b0)
    const c001 = getColor(r0, g0, b1)
    const c101 = getColor(r1, g0, b1)
    const c011 = getColor(r0, g1, b1)
    const c111 = getColor(r1, g1, b1)

    // Trilinear interpolation for each channel
    const result: [number, number, number] = [0, 0, 0]
    for (let ch = 0; ch < 3; ch++) {
      const c00 = lerp(c000[ch]!, c100[ch]!, rT)
      const c01 = lerp(c001[ch]!, c101[ch]!, rT)
      const c10 = lerp(c010[ch]!, c110[ch]!, rT)
      const c11 = lerp(c011[ch]!, c111[ch]!, rT)
      const c0_g = lerp(c00, c10, gT)
      const c1_g = lerp(c01, c11, gT)
      result[ch] = lerp(c0_g, c1_g, bT)
    }

    data[i] = Math.round(result[0] * 255)
    data[i + 1] = Math.round(result[1] * 255)
    data[i + 2] = Math.round(result[2] * 255)
  }
}

/**
 * Apply LUT to ImageData (auto-detects 1D or 3D)
 */
export const applyLutInPlace = (imageData: ImageData, lut: Lut): void => {
  if (isLut3D(lut)) {
    applyLut3DInPlace(imageData, lut)
  } else {
    applyLut1DInPlace(imageData, lut)
  }
}

/**
 * RGB (0-255) to HSL tuple [h (0-1), s (0-1), l (0-1)]
 * Optimized for worker use (returns tuple instead of object)
 */
export const rgbToHslTuple = (r: number, g: number, b: number): [number, number, number] => {
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

/**
 * HSL tuple to RGB (0-255)
 * Optimized for worker use
 */
export const hslTupleToRgb = (h: number, s: number, l: number): [number, number, number] => {
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
 * Apply Vibrance and Hue Rotation effects to ImageData (in-place)
 */
export const applyEffectsInPlace = (
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
      const [h, s, l] = rgbToHslTuple(r, g, b)
      const newH = (h + hueShift + 1) % 1
      ;[r, g, b] = hslTupleToRgb(newH, s, l)
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
 * Downsample ImageData using OffscreenCanvas
 */
export const downsampleImageData = (imageData: ImageData, scale: number): ImageData => {
  if (scale >= 1) return imageData

  const newWidth = Math.max(1, Math.floor(imageData.width * scale))
  const newHeight = Math.max(1, Math.floor(imageData.height * scale))

  const canvas = new OffscreenCanvas(newWidth, newHeight)
  const ctx = canvas.getContext('2d')!

  // Draw ImageData to temporary canvas
  const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height)
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(imageData, 0, 0)

  // Draw scaled down
  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight)

  return ctx.getImageData(0, 0, newWidth, newHeight)
}

/**
 * Convert plain object to ImageData
 * Needed because postMessage can convert ImageData to plain object
 */
export const ensureImageData = (
  data: ImageData | { width: number; height: number; data: Uint8ClampedArray }
): ImageData => {
  if (data instanceof ImageData) {
    return data
  }
  return new ImageData(
    new Uint8ClampedArray(data.data),
    data.width,
    data.height
  )
}
