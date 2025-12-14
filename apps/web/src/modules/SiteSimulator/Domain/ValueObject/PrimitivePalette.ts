import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'

/**
 * PrimitiveColor is a named color in OKLCH space.
 */
export type PrimitiveColor = {
  readonly name: string
  readonly oklch: Oklch
}

/**
 * PrimitivePalette is the base 40 colors.
 */
export type PrimitivePalette = {
  readonly baseColors: ReadonlyArray<PrimitiveColor>
}

// Hue names for the 8 base hues (0, 45, 90, 135, 180, 225, 270, 315)
const HUE_NAMES = ['red', 'orange', 'yellow', 'lime', 'cyan', 'blue', 'purple', 'magenta'] as const

// Lightness levels within albedo-safe range (0.25-0.90)
const LIGHTNESS_LEVELS = [
  { suffix: '30', L: 0.30 },
  { suffix: '45', L: 0.45 },
  { suffix: '60', L: 0.60 },
  { suffix: '75', L: 0.75 },
  { suffix: '85', L: 0.85 },
] as const

// Neutral grays (8 levels)
const NEUTRAL_LEVELS = [
  { suffix: '10', L: 0.15 },
  { suffix: '20', L: 0.25 },
  { suffix: '30', L: 0.35 },
  { suffix: '40', L: 0.45 },
  { suffix: '50', L: 0.55 },
  { suffix: '60', L: 0.65 },
  { suffix: '80', L: 0.80 },
  { suffix: '95', L: 0.95 },
] as const

export const $PrimitivePalette = {
  generateDefault: (): PrimitivePalette => {
    const baseColors: PrimitiveColor[] = []

    // Generate chromatic colors: 8 hues × 5 lightness = 40 colors
    // But we need neutrals too, so: 8 hues × 4 lightness = 32 + 8 neutrals = 40
    HUE_NAMES.forEach((hueName, hueIndex) => {
      const H = hueIndex * 45 // 0, 45, 90, 135, 180, 225, 270, 315
      // Use 4 lightness levels per hue
      LIGHTNESS_LEVELS.slice(0, 4).forEach(({ suffix, L }) => {
        baseColors.push({
          name: `${hueName}-${suffix}`,
          oklch: $Oklch.create(L, 0.12, H), // Mid chroma within safe range
        })
      })
    })

    // Add 8 neutral grays
    NEUTRAL_LEVELS.forEach(({ suffix, L }) => {
      baseColors.push({
        name: `neutral-${suffix}`,
        oklch: $Oklch.create(L, 0, 0), // C=0 for neutrals
      })
    })

    return { baseColors }
  },
}
