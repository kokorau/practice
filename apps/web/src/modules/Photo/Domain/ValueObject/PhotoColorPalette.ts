import { $Oklch, type Oklch } from '@practice/color'

/**
 * Shade levels for palette colors (Tailwind-like naming)
 */
export const SHADE_LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
export type ShadeLevel = (typeof SHADE_LEVELS)[number]

/**
 * Lightness values for each shade level (OKLCH L: 0-1)
 * 50 is lightest, 900 is darkest
 */
const SHADE_LIGHTNESS_NEUTRAL: Record<ShadeLevel, number> = {
  50: 0.97,
  100: 0.93,
  200: 0.87,
  300: 0.78,
  400: 0.68,
  500: 0.58,
  600: 0.48,
  700: 0.38,
  800: 0.28,
  900: 0.18,
}

/**
 * Lightness values for chromatic colors (narrower range for better color visibility)
 */
const SHADE_LIGHTNESS_CHROMATIC: Record<ShadeLevel, number> = {
  50: 0.92,
  100: 0.87,
  200: 0.80,
  300: 0.72,
  400: 0.64,
  500: 0.56,
  600: 0.48,
  700: 0.40,
  800: 0.32,
  900: 0.25,
}

/**
 * Palette hue definition
 */
export type PaletteHue = {
  name: string
  H: number   // OKLCH Hue (0-360)
  C: number   // Base chroma (adjusted per shade)
}

/**
 * 17 chromatic hues distributed across the color wheel
 * Hue values chosen for visual distinctiveness in OKLCH
 */
const CHROMATIC_HUES: PaletteHue[] = [
  { name: 'red', H: 25, C: 0.18 },
  { name: 'vermilion', H: 45, C: 0.18 },
  { name: 'orange', H: 65, C: 0.17 },
  { name: 'amber', H: 85, C: 0.16 },
  { name: 'yellow', H: 100, C: 0.15 },
  { name: 'lime', H: 125, C: 0.16 },
  { name: 'green', H: 145, C: 0.17 },
  { name: 'emerald', H: 165, C: 0.16 },
  { name: 'teal', H: 185, C: 0.14 },
  { name: 'cyan', H: 200, C: 0.13 },
  { name: 'sky', H: 220, C: 0.13 },
  { name: 'blue', H: 250, C: 0.15 },
  { name: 'indigo', H: 275, C: 0.15 },
  { name: 'violet', H: 295, C: 0.16 },
  { name: 'purple', H: 315, C: 0.17 },
  { name: 'magenta', H: 335, C: 0.18 },
  { name: 'rose', H: 5, C: 0.18 },
]

/**
 * 3 neutral/achromatic hues (very low chroma)
 */
const NEUTRAL_HUES: PaletteHue[] = [
  { name: 'warm-gray', H: 60, C: 0.02 },   // Slight warm tint
  { name: 'gray', H: 0, C: 0.0 },           // Pure neutral
  { name: 'cool-gray', H: 250, C: 0.02 },  // Slight cool tint
]

/**
 * All 20 palette hues
 */
export const PALETTE_HUES: readonly PaletteHue[] = [...CHROMATIC_HUES, ...NEUTRAL_HUES]

/**
 * A single color in the palette with its shade
 */
export type PaletteColor = {
  hue: PaletteHue
  shade: ShadeLevel
  oklch: Oklch
}

/**
 * PhotoColorPalette - 20 base colors × 10 shades = 200 colors
 */
export type PhotoColorPalette = {
  hues: readonly PaletteHue[]
  shades: readonly ShadeLevel[]
  colors: readonly PaletteColor[]
}

/**
 * Calculate chroma for a given hue and shade
 * Chroma is reduced at extreme lightness values to stay in gamut
 */
const calculateChroma = (baseChroma: number, L: number): number => {
  // Reduce chroma at very light and very dark values
  // Peak chroma around L=0.5-0.7
  if (L > 0.85) {
    return baseChroma * (1 - L) * 6  // Fade to 0 at L=1
  }
  if (L < 0.25) {
    return baseChroma * L * 4        // Fade to 0 at L=0
  }
  return baseChroma
}

export const $PhotoColorPalette = {
  /**
   * Create the full color palette
   */
  create: (): PhotoColorPalette => {
    const colors: PaletteColor[] = []
    const isChromatic = (hue: PaletteHue) => !NEUTRAL_HUES.includes(hue)

    for (const hue of PALETTE_HUES) {
      for (const shade of SHADE_LEVELS) {
        const lightnessTable = isChromatic(hue) ? SHADE_LIGHTNESS_CHROMATIC : SHADE_LIGHTNESS_NEUTRAL
        const L = lightnessTable[shade]
        const C = calculateChroma(hue.C, L)
        const oklch = $Oklch.clampToGamut({ L, C, H: hue.H })
        colors.push({ hue, shade, oklch })
      }
    }

    return {
      hues: PALETTE_HUES,
      shades: SHADE_LEVELS,
      colors,
    }
  },

  /**
   * Get a specific color by hue name and shade
   */
  getColor: (palette: PhotoColorPalette, hueName: string, shade: ShadeLevel): PaletteColor | undefined => {
    return palette.colors.find(c => c.hue.name === hueName && c.shade === shade)
  },

  /**
   * Get all shades for a specific hue
   */
  getHueShades: (palette: PhotoColorPalette, hueName: string): PaletteColor[] => {
    return palette.colors.filter(c => c.hue.name === hueName)
  },

  /**
   * Get all colors for a specific shade level
   */
  getShadeColors: (palette: PhotoColorPalette, shade: ShadeLevel): PaletteColor[] => {
    return palette.colors.filter(c => c.shade === shade)
  },

  /**
   * Get palette dimensions for rendering
   */
  dimensions: (palette: PhotoColorPalette) => ({
    columns: palette.hues.length,   // 20 hues
    rows: palette.shades.length,    // 10 shades
    total: palette.colors.length,   // 200 colors
  }),
}
