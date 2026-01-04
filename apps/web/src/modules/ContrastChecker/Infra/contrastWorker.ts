/**
 * Web Worker for contrast analysis
 * Offloads CPU-intensive luminance map generation and APCA calculation
 */

import { $APCA, $Srgb, $Oklch, type Srgb } from '@practice/color'

// ============================================================
// Types (duplicated to avoid import issues in worker)
// ============================================================

interface LuminanceMap {
  width: number
  height: number
  data: Float32Array
}

interface ContrastHistogram {
  bins: number[]
  totalPixels: number
}

interface ContrastAnalysisResult {
  score: number
  histogram: ContrastHistogram
  textY: number
}

interface ContrastRegion {
  x: number
  y: number
  width: number
  height: number
}

interface WorkerRequest {
  id: number
  imageData: ImageData
  textColor: string
  region: ContrastRegion
}

interface WorkerResponse {
  id: number
  result: ContrastAnalysisResult | null
}

// ============================================================
// Luminance Map Generation
// ============================================================

function createLuminanceMap(width: number, height: number): LuminanceMap {
  return {
    width,
    height,
    data: new Float32Array(width * height),
  }
}

function generateLuminanceMap(imageData: ImageData): LuminanceMap {
  const { width, height, data } = imageData
  const luminanceMap = createLuminanceMap(width, height)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const pixelIndex = i / 4

    const y = $APCA.srgbToY($Srgb.from255(r, g, b))
    luminanceMap.data[pixelIndex] = y
  }

  return luminanceMap
}

// ============================================================
// Contrast Analysis
// ============================================================

function calculateMinimumScore(histogram: ContrastHistogram, thresholdPercent: number): number {
  for (let i = 0; i < histogram.bins.length; i++) {
    if (histogram.bins[i]! >= thresholdPercent) {
      return i * 10
    }
  }
  return 100
}

function analyzeContrast(
  luminanceMap: LuminanceMap,
  textY: number,
  region: ContrastRegion
): ContrastAnalysisResult {
  const histogram: ContrastHistogram = {
    bins: new Array(10).fill(0),
    totalPixels: 0,
  }

  const startX = region.x
  const startY = region.y
  const endX = startX + region.width
  const endY = startY + region.height

  const clampedStartX = Math.max(0, Math.floor(startX))
  const clampedStartY = Math.max(0, Math.floor(startY))
  const clampedEndX = Math.min(luminanceMap.width, Math.ceil(endX))
  const clampedEndY = Math.min(luminanceMap.height, Math.ceil(endY))

  const bins = new Array(10).fill(0)
  let totalPixels = 0

  for (let y = clampedStartY; y < clampedEndY; y++) {
    for (let x = clampedStartX; x < clampedEndX; x++) {
      const bgY = luminanceMap.data[y * luminanceMap.width + x]!
      const score = $APCA.fromY(textY, bgY)
      const absScore = Math.abs(score)

      const clamped = Math.min(Math.max(absScore, 0), 100)
      const binIndex = Math.min(Math.floor(clamped / 10), 9)
      bins[binIndex]++
      totalPixels++
    }
  }

  if (totalPixels > 0) {
    for (let i = 0; i < bins.length; i++) {
      histogram.bins[i] = (bins[i] / totalPixels) * 100
    }
  }
  histogram.totalPixels = totalPixels

  return {
    score: calculateMinimumScore(histogram, 2),
    histogram,
    textY,
  }
}

// ============================================================
// Color Parsing
// ============================================================

function parseOklchCss(css: string): Srgb | null {
  const match = css.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!match) return null

  const L = parseFloat(match[1]!) / 100
  const C = parseFloat(match[2]!)
  const H = parseFloat(match[3]!)

  return $Oklch.toSrgb({ L, C, H })
}

function parseTextColorToY(textColor: string): number | null {
  if (textColor.startsWith('oklch(')) {
    const srgb = parseOklchCss(textColor)
    if (!srgb) return null
    return $APCA.srgbToY(srgb)
  }
  const srgb = $Srgb.fromHex(textColor)
  if (!srgb) return null
  return $APCA.srgbToY(srgb)
}

// ============================================================
// Worker Message Handler
// ============================================================

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, imageData, textColor, region } = event.data

  const textY = parseTextColorToY(textColor)
  if (textY === null) {
    self.postMessage({ id, result: null } satisfies WorkerResponse)
    return
  }

  const luminanceMap = generateLuminanceMap(imageData)
  const result = analyzeContrast(luminanceMap, textY, region)

  self.postMessage({ id, result } satisfies WorkerResponse)
}
