import { $APCA, $Srgb, type Srgb } from '@practice/color'
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
 * Parse text color to Y value
 */
function parseTextColorToY(textColor: string | Srgb): number | null {
  if (typeof textColor === 'string') {
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

export const $CheckCanvasContrast = {
  check: checkCanvasContrast,
}
