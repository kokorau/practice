import { $APCA, $Srgb, $Oklch, type Srgb } from '@practice/color'
import { type ContrastAnalysisResult } from '../Domain'
import { $LuminanceMapGenerator, $ContrastAnalyzer } from '../Infra'

/**
 * Region bounds for contrast check
 */
export type ContrastRegion = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Options for canvas contrast check
 */
export type CanvasContrastCheckOptions = {
  /** Canvas element to analyze */
  canvas: HTMLCanvasElement
  /** Text color (hex string or Srgb) */
  textColor: string | Srgb
  /** Region where text is placed */
  region: ContrastRegion
}

/**
 * Parse oklch CSS string to Srgb
 * Format: oklch(L% C H) or oklch(L C H)
 */
function parseOklchCss(css: string): Srgb | null {
  const match = css.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!match) return null

  const L = parseFloat(match[1]!) / 100 // Convert percentage to 0-1
  const C = parseFloat(match[2]!)
  const H = parseFloat(match[3]!)

  return $Oklch.toSrgb({ L, C, H })
}

/**
 * Parse text color to Y value
 * Supports: hex string (#fff, #ffffff), oklch CSS string, or Srgb object
 */
function parseTextColorToY(textColor: string | Srgb): number | null {
  if (typeof textColor === 'string') {
    // Try oklch CSS format first
    if (textColor.startsWith('oklch(')) {
      const srgb = parseOklchCss(textColor)
      if (!srgb) return null
      return $APCA.srgbToY(srgb)
    }
    // Fall back to hex format
    const srgb = $Srgb.fromHex(textColor)
    if (!srgb) return null
    return $APCA.srgbToY(srgb)
  }
  return $APCA.srgbToY(textColor)
}

/**
 * Check contrast between text and canvas background
 *
 * Simple high-level API for HeroView usage:
 * - Pass canvas, text color, and text region
 * - Returns contrast analysis result with score and histogram
 *
 * @example
 * ```typescript
 * const result = checkCanvasContrast({
 *   canvas: heroCanvas,
 *   textColor: '#ffffff',
 *   region: { x: 100, y: 50, width: 200, height: 40 }
 * })
 * if (result) {
 *   console.log('Minimum score:', result.score)
 * }
 * ```
 */
export function checkCanvasContrast(
  options: CanvasContrastCheckOptions
): ContrastAnalysisResult | null {
  const { canvas, textColor, region } = options

  // Parse text color
  const textY = parseTextColorToY(textColor)
  if (textY === null) return null

  // Get canvas context
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Get image data from canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Generate luminance map (internal)
  const luminanceMap = $LuminanceMapGenerator.fromImageData(imageData)

  // Analyze contrast for the region
  return $ContrastAnalyzer.analyze(luminanceMap, textY, region)
}

/**
 * Options for ImageData contrast check (WebGPU compatible)
 */
export type ImageDataContrastCheckOptions = {
  /** ImageData from WebGPU readPixels or other source */
  imageData: ImageData
  /** Text color (hex string, oklch CSS string, or Srgb) */
  textColor: string | Srgb
  /** Region where text is placed */
  region: ContrastRegion
}

/**
 * Check contrast between text and background from ImageData
 *
 * Use this when working with WebGPU canvas (where getContext('2d') is not available).
 * Get ImageData via TextureRenderer.readPixels() instead.
 */
export function checkImageDataContrast(
  options: ImageDataContrastCheckOptions
): ContrastAnalysisResult | null {
  const { imageData, textColor, region } = options

  // Parse text color
  const textY = parseTextColorToY(textColor)
  if (textY === null) return null

  // Generate luminance map from ImageData
  const luminanceMap = $LuminanceMapGenerator.fromImageData(imageData)

  // Analyze contrast for the region
  return $ContrastAnalyzer.analyze(luminanceMap, textY, region)
}

export const $CheckCanvasContrast = {
  check: checkCanvasContrast,
  checkImageData: checkImageDataContrast,
}
