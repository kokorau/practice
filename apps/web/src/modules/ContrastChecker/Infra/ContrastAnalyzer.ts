import { $APCA } from '@practice/color'
import {
  type LuminanceMap,
  type ContrastAnalysisResult,
  createEmptyHistogram,
  calculateMinimumScore,
} from '../Domain'

/**
 * Region bounds for analysis
 */
export type AnalysisRegion = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Analyze contrast between text color and background luminance map
 *
 * @param luminanceMap - Background luminance map
 * @param textY - Text color luminance (Y value)
 * @param region - Optional region to analyze (defaults to entire map)
 * @returns Contrast analysis result with histogram
 */
export function analyzeContrast(
  luminanceMap: LuminanceMap,
  textY: number,
  region?: AnalysisRegion
): ContrastAnalysisResult {
  const histogram = createEmptyHistogram()

  const startX = region?.x ?? 0
  const startY = region?.y ?? 0
  const endX = region ? startX + region.width : luminanceMap.width
  const endY = region ? startY + region.height : luminanceMap.height

  // Clamp bounds
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

      // Clamp to 0-100 and determine bin
      const clamped = Math.min(Math.max(absScore, 0), 100)
      const binIndex = Math.min(Math.floor(clamped / 10), 9)
      bins[binIndex]++
      totalPixels++
    }
  }

  // Convert to percentages
  if (totalPixels > 0) {
    for (let i = 0; i < bins.length; i++) {
      histogram.bins[i] = (bins[i] / totalPixels) * 100
    }
  }
  histogram.totalPixels = totalPixels

  return {
    score: calculateMinimumScore(histogram, 2), // Default 2% threshold
    histogram,
    textY,
  }
}

/**
 * Generate APCA score map as ImageData for visualization
 * Each pixel's grayscale value represents its APCA score (0-255 maps to 0-100)
 *
 * @param luminanceMap - Background luminance map
 * @param textY - Text color luminance (Y value)
 * @param region - Optional region to render (defaults to entire map)
 * @returns ImageData with APCA scores as grayscale values
 */
export function generateScoreMap(
  luminanceMap: LuminanceMap,
  textY: number,
  region?: AnalysisRegion
): ImageData {
  const width = region?.width ?? luminanceMap.width
  const height = region?.height ?? luminanceMap.height
  const startX = region?.x ?? 0
  const startY = region?.y ?? 0

  const imageData = new ImageData(Math.ceil(width), Math.ceil(height))
  const data = imageData.data

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const srcX = Math.floor(startX + dx)
      const srcY = Math.floor(startY + dy)

      if (srcX < 0 || srcX >= luminanceMap.width || srcY < 0 || srcY >= luminanceMap.height) {
        continue
      }

      const bgY = luminanceMap.data[srcY * luminanceMap.width + srcX]!
      const score = $APCA.fromY(textY, bgY)
      const absScore = Math.abs(score)

      const clamped = Math.min(Math.max(absScore, 0), 100)
      const gray = Math.round((clamped / 100) * 255)
      const idx = (dy * Math.ceil(width) + dx) * 4

      data[idx] = gray
      data[idx + 1] = gray
      data[idx + 2] = gray
      data[idx + 3] = 255
    }
  }

  return imageData
}

export const $ContrastAnalyzer = {
  analyze: analyzeContrast,
  generateScoreMap,
}
