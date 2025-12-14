import { $Hex, type Hex } from '@practice/color'
import type { ColorProfile } from './ColorProfile'

/**
 * Palette with color role analysis
 */
export type ProfiledPalette = {
  colors: readonly ColorProfile[]
  background: ColorProfile | null
  text: ColorProfile | null
  accent: ColorProfile | null
}

export type CreateProfiledPaletteInput = {
  colors: ColorProfile[]
}

export const $ProfiledPalette = {
  create: (input: CreateProfiledPaletteInput): ProfiledPalette => {
    const { colors } = input

    // Find best candidates for each role
    const background = colors
      .filter((c) => c.role === 'background')
      .sort((a, b) => b.confidence - a.confidence)[0] ?? null

    const text = colors
      .filter((c) => c.role === 'text')
      .sort((a, b) => b.confidence - a.confidence)[0] ?? null

    const accent = colors
      .filter((c) => c.role === 'accent')
      .sort((a, b) => b.confidence - a.confidence)[0] ?? null

    return {
      colors,
      background,
      text,
      accent,
    }
  },

  /**
   * Get colors sorted by weight (descending)
   */
  sortedByWeight: (palette: ProfiledPalette): readonly ColorProfile[] => {
    return [...palette.colors].sort((a, b) => b.weight - a.weight)
  },

  /**
   * Convert to CSS hex colors
   */
  toHexArray: (palette: ProfiledPalette): Hex[] => {
    return palette.colors.map((c) => $Hex.fromSrgb(c.color))
  },
}
