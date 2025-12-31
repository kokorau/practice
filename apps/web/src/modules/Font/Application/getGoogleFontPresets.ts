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

/**
 * Get a font preset by ID
 */
export const getFontPresetById = (id: string): FontPreset | undefined => {
  return GoogleFontPresets.find((p) => p.id === id)
}

/**
 * Load a Google Font by adding a link element to the document head
 * Returns true if the font was loaded, false if already loaded
 */
const loadedFontIds = new Set<string>()

export const loadGoogleFont = (preset: FontPreset): boolean => {
  if (loadedFontIds.has(preset.id)) return false
  if (preset.source.vendor !== 'google') return false

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = preset.source.url
  link.dataset.fontId = preset.id
  document.head.appendChild(link)
  loadedFontIds.add(preset.id)
  return true
}

/**
 * Ensure a font is loaded by ID, returns the font family string or undefined
 */
export const ensureFontLoaded = (fontId: string | undefined): string | undefined => {
  if (!fontId) return undefined
  const preset = getFontPresetById(fontId)
  if (!preset) return undefined
  loadGoogleFont(preset)
  return preset.family
}
