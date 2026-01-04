import { $APCA, $Srgb, type Srgb } from '@practice/color'
import { type ContrastAnalysisResult, type LuminanceMap } from '../Domain'
import { $ContrastAnalyzer, type AnalysisRegion } from '../Infra'

/**
 * Options for text contrast check
 */
export type TextContrastCheckOptions = {
  /** Text color in sRGB (0-1 normalized) */
  textColor: Srgb
  /** Background luminance map */
  luminanceMap: LuminanceMap
  /** Region where text will be placed */
  region?: AnalysisRegion
  /** Percentage threshold for score calculation (default: 2) */
  thresholdPercent?: number
}

/**
 * Check contrast between text color and background
 * Returns analysis result with minimum guaranteed score
 */
export function checkTextContrast(options: TextContrastCheckOptions): ContrastAnalysisResult {
  const { textColor, luminanceMap, region } = options
  const textY = $APCA.srgbToY(textColor)

  return $ContrastAnalyzer.analyze(luminanceMap, textY, region)
}

/**
 * Check contrast using hex color string
 */
export function checkTextContrastFromHex(
  hexColor: string,
  luminanceMap: LuminanceMap,
  region?: AnalysisRegion
): ContrastAnalysisResult | null {
  const srgb = $Srgb.fromHex(hexColor)
  if (!srgb) return null

  return checkTextContrast({ textColor: srgb, luminanceMap, region })
}

export const $CheckTextContrast = {
  check: checkTextContrast,
  checkFromHex: checkTextContrastFromHex,
}
