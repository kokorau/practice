import type { FontPreset, FontCategory } from '../Domain/ValueObject'
import { GoogleFontPresets } from '../Infra'

export interface GetGoogleFontPresetsOptions {
  category?: FontCategory
  excludeIconFonts?: boolean
}

/**
 * Get Google Font presets with optional filtering
 */
export const getGoogleFontPresets = (options: GetGoogleFontPresetsOptions = {}): FontPreset[] => {
  const { category, excludeIconFonts = true } = options

  let presets = GoogleFontPresets

  // Exclude icon fonts (Material Icons, Material Symbols) by default
  if (excludeIconFonts) {
    presets = presets.filter(
      (p) => !p.name.toLowerCase().includes('material')
    )
  }

  // Filter by category if specified
  if (category) {
    presets = presets.filter((p) => p.category === category)
  }

  return presets
}
