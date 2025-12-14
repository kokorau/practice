import { $Hex, type Srgb, type Hex } from '@practice/color'

/**
 * A color with its weight (pixel count ratio)
 */
export type PaletteColor = {
  color: Srgb
  weight: number  // 0-1, ratio of pixels
}

/**
 * A 4-color palette extracted from an image
 */
export type Palette = {
  colors: readonly [PaletteColor, PaletteColor, PaletteColor, PaletteColor]
}

export type CreatePaletteInput = {
  colors: [PaletteColor, PaletteColor, PaletteColor, PaletteColor]
}

export const $Palette = {
  create: (input: CreatePaletteInput): Palette => ({
    colors: input.colors,
  }),

  /**
   * Get colors sorted by weight (descending)
   */
  sortedByWeight: (palette: Palette): readonly PaletteColor[] => {
    return [...palette.colors].sort((a, b) => b.weight - a.weight)
  },

  /**
   * Get the dominant color
   */
  dominant: (palette: Palette): PaletteColor => {
    return $Palette.sortedByWeight(palette)[0]!
  },

  /**
   * Convert palette to CSS hex colors
   */
  toHexArray: (palette: Palette): Hex[] => {
    return palette.colors.map(({ color }) => $Hex.fromSrgb(color))
  },
}
