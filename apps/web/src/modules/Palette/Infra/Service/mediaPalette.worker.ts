/**
 * Media Palette Web Worker
 * k-means パレット抽出を Worker で処理
 */

import type { Lut, Lut1D, Lut3D } from '../../../Filter/Domain/ValueObject/Lut'

// Domain と互換の型定義（Worker 内で使用）
type RGB = { r: number; g: number; b: number }
type ColorMetrics = {
  edgeRatio: number
  borderRatio: number
  avgClusterSize: number
  clusterCount: number
}
type ColorRole = 'background' | 'text' | 'accent' | 'unknown'
type ColorProfile = {
  color: RGB
  weight: number
  metrics: ColorMetrics
  role: ColorRole
  confidence: number
}
type ProfiledPalette = {
  colors: readonly ColorProfile[]
  background: ColorProfile | null
  text: ColorProfile | null
  accent: ColorProfile | null
}

export type PaletteRequest = {
  id: number
  type: 'extract'
  imageData: ImageData
  lut?: Lut
  vibrance?: number
  hueRotation?: number
  downsampleScale?: number
}

export type PaletteResponse = {
  id: number
  palette: ProfiledPalette
}

const K_CLUSTERS = 7
const TOP_COLORS = 4

/** Type guard: 3D LUT かどうかを判定 */
const isLut3D = (lut: Lut): lut is Lut3D => {
  return 'size' in lut && 'data' in lut
}

// === 1D LUT 適用 ===
// Lut1D は Float32Array (0-1) なので * 255 が必要
const applyLut1D = (imageData: ImageData, lut: Lut1D): void => {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(lut.r[data[i]!]! * 255)
    data[i + 1] = Math.round(lut.g[data[i + 1]!]! * 255)
    data[i + 2] = Math.round(lut.b[data[i + 2]!]! * 255)
  }
}

// === 3D LUT 適用（三線形補間） ===
const applyLut3D = (imageData: ImageData, lut: Lut3D): void => {
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

// === LUT 適用（1D または 3D を自動判別）===
const applyLut = (imageData: ImageData, lut: Lut): void => {
  if (isLut3D(lut)) {
    applyLut3D(imageData, lut)
  } else {
    applyLut1D(imageData, lut)
  }
}

// === HSL 変換 ===
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
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
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
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

// === エフェクト適用 ===
const applyEffects = (imageData: ImageData, vibrance: number, hueRotation: number): void => {
  const data = imageData.data
  const hueShift = hueRotation / 360
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]!, g = data[i + 1]!, b = data[i + 2]!
    if (Math.abs(hueRotation) > 0.01) {
      const [h, s, l] = rgbToHsl(r, g, b)
      ;[r, g, b] = hslToRgb((h + hueShift + 1) % 1, s, l)
    }
    if (Math.abs(vibrance) > 0.01) {
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const sat = (max - min) / 255, avg = (r + g + b) / 3
      const boost = vibrance * (1 - sat)
      r = Math.min(255, Math.max(0, avg + (r - avg) * (1 + boost)))
      g = Math.min(255, Math.max(0, avg + (g - avg) * (1 + boost)))
      b = Math.min(255, Math.max(0, avg + (b - avg) * (1 + boost)))
    }
    data[i] = r; data[i + 1] = g; data[i + 2] = b
  }
}

// === ダウンサンプリング ===
const downsample = (imageData: ImageData, scale: number): ImageData => {
  if (scale >= 1) return imageData
  const newWidth = Math.max(1, Math.floor(imageData.width * scale))
  const newHeight = Math.max(1, Math.floor(imageData.height * scale))
  const canvas = new OffscreenCanvas(newWidth, newHeight)
  const ctx = canvas.getContext('2d')!
  const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height)
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(imageData, 0, 0)
  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight)
  return ctx.getImageData(0, 0, newWidth, newHeight)
}

// === K-means ===
const computeKmeans = (imageData: ImageData, k: number = K_CLUSTERS) => {
  const { data, width, height } = imageData
  const pixelCount = width * height
  const sampleRate = Math.max(1, Math.floor(pixelCount / 5000)) // より多くサンプリング
  const samples: RGB[] = []

  for (let i = 0; i < pixelCount; i += sampleRate) {
    const idx = i * 4
    samples.push({ r: data[idx]!, g: data[idx + 1]!, b: data[idx + 2]! })
  }

  const centroids = samples.slice(0, k).map(s => ({ ...s }))

  // K-means iterations (少なめ)
  for (let iter = 0; iter < 5; iter++) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))
    for (const pixel of samples) {
      let minDist = Infinity, minIdx = 0
      for (let c = 0; c < k; c++) {
        const cent = centroids[c]!
        const dist = (pixel.r - cent.r) ** 2 + (pixel.g - cent.g) ** 2 + (pixel.b - cent.b) ** 2
        if (dist < minDist) { minDist = dist; minIdx = c }
      }
      const sum = sums[minIdx]!
      sum.r += pixel.r; sum.g += pixel.g; sum.b += pixel.b; sum.count++
    }
    for (let c = 0; c < k; c++) {
      const sum = sums[c]!, cent = centroids[c]!
      if (sum.count > 0) {
        cent.r = sum.r / sum.count
        cent.g = sum.g / sum.count
        cent.b = sum.b / sum.count
      }
    }
  }

  // Final counts
  const counts = new Uint32Array(k)
  for (let i = 0; i < pixelCount; i += sampleRate) {
    const idx = i * 4
    const pixel = { r: data[idx]!, g: data[idx + 1]!, b: data[idx + 2]! }
    let minDist = Infinity, minIdx = 0
    for (let c = 0; c < k; c++) {
      const cent = centroids[c]!
      const dist = (pixel.r - cent.r) ** 2 + (pixel.g - cent.g) ** 2 + (pixel.b - cent.b) ** 2
      if (dist < minDist) { minDist = dist; minIdx = c }
    }
    counts[minIdx]!++
  }

  return {
    centroids: centroids.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) })),
    counts,
    totalSamples: samples.length,
  }
}

// === メトリクス計算 (簡略版) ===
const computeSimpleMetrics = (): ColorMetrics => {
  // Worker 内では詳細なメトリクス計算を省略
  return {
    edgeRatio: 0,
    borderRatio: 0,
    avgClusterSize: 0,
    clusterCount: 0,
  }
}

// === Role 推定 (簡略版) ===
const inferRole = (color: RGB, weight: number): { role: ColorRole; confidence: number } => {
  const [, s, l] = rgbToHsl(color.r, color.g, color.b)

  // 明るい低彩度 + 高面積 → 背景候補
  if (l > 0.7 && s < 0.3 && weight > 0.2) {
    return { role: 'background', confidence: 0.7 }
  }

  // 暗い低彩度 → テキスト候補
  if (l < 0.3 && s < 0.3) {
    return { role: 'text', confidence: 0.6 }
  }

  // 高彩度 + 低面積 → アクセント候補
  if (s > 0.5 && weight < 0.15) {
    return { role: 'accent', confidence: 0.6 }
  }

  return { role: 'unknown', confidence: 0 }
}

self.onmessage = (e: MessageEvent<PaletteRequest>) => {
  const { id, type, imageData, lut, vibrance, hueRotation, downsampleScale } = e.data
  if (type !== 'extract') return

  let processedData = imageData

  // 1. ダウンサンプリング
  if (downsampleScale && downsampleScale < 1) {
    processedData = downsample(processedData, downsampleScale)
  }

  // 2. LUT 適用
  if (lut) applyLut(processedData, lut)

  // 3. エフェクト適用
  if ((vibrance && Math.abs(vibrance) > 0.01) || (hueRotation && Math.abs(hueRotation) > 0.01)) {
    applyEffects(processedData, vibrance ?? 0, hueRotation ?? 0)
  }

  // 4. k-means
  const result = computeKmeans(processedData, K_CLUSTERS)

  // 5. プロファイル作成
  const profiles: ColorProfile[] = result.centroids.map((color, i) => {
    const weight = (result.counts[i] ?? 0) / result.totalSamples
    const metrics = computeSimpleMetrics()
    const { role, confidence } = inferRole(color, weight)
    return {
      color,
      weight,
      metrics,
      role,
      confidence,
    }
  })

  profiles.sort((a, b) => b.weight - a.weight)
  const topProfiles = profiles.slice(0, TOP_COLORS)

  // Role別に取得
  const background = topProfiles.find(p => p.role === 'background') ?? null
  const text = topProfiles.find(p => p.role === 'text') ?? null
  const accent = topProfiles.find(p => p.role === 'accent') ?? null

  const palette: ProfiledPalette = {
    colors: topProfiles,
    background,
    text,
    accent,
  }

  const response: PaletteResponse = { id, palette }
  self.postMessage(response)
}
