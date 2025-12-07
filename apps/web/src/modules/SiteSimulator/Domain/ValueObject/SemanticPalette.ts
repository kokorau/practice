import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import type { CorePalette } from './CorePalette'

/**
 * SemanticPalette assigns meaning to colors for UI usage.
 */
export type SemanticPalette = {
  readonly surface: {
    /** Page background */
    readonly base: Oklch
    /** Section, modal background */
    readonly elevated: Oklch
    /** Card background (stronger than elevated) */
    readonly card: Oklch
    /** Border color */
    readonly border: Oklch
  }
  readonly text: {
    readonly primary: Oklch
    readonly secondary: Oklch
    readonly muted: Oklch
    /** Text color on brand-primary background */
    readonly onBrandPrimary: Oklch
    /** Text color on accent background */
    readonly onAccent: Oklch
  }
  readonly brand: {
    /** Primary brand UI elements (buttons, etc.) */
    readonly primary: Oklch
    readonly hover: Oklch
    readonly active: Oklch
  }
  readonly accent: {
    readonly base: Oklch
    readonly hover: Oklch
  }
}

/**
 * SemanticColorToken is a string representation of SemanticPalette keys.
 * Used in data-* attributes to reference semantic colors.
 */
export type SemanticColorToken =
  | `surface.${keyof SemanticPalette['surface']}`
  | `text.${keyof SemanticPalette['text']}`
  | `brand.${keyof SemanticPalette['brand']}`
  | `accent.${keyof SemanticPalette['accent']}`

/**
 * Convert sRGB component (0-1) to APCA Y (luminance).
 * Uses simplified gamma of 2.4 for sRGB.
 */
const srgbToApcaY = (r: number, g: number, b: number): number => {
  // Linearize with gamma 2.4
  const rLin = Math.pow(r, 2.4)
  const gLin = Math.pow(g, 2.4)
  const bLin = Math.pow(b, 2.4)

  // APCA coefficients (slightly different from WCAG)
  let y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin

  // Soft clamp for very dark colors
  if (y < 0.022) {
    y += Math.pow(0.022 - y, 1.414)
  }

  return y
}

/**
 * Calculate APCA contrast value.
 * https://github.com/Myndex/SAPC-APCA
 *
 * Returns value between -108 and 105.
 * Positive = dark text on light bg, Negative = light text on dark bg.
 * |Lc| >= 60 recommended for body text.
 */
const calculateApcaContrast = (fg: Oklch, bg: Oklch): number => {
  const fgSrgb = $Oklch.toSrgb(fg)
  const bgSrgb = $Oklch.toSrgb(bg)

  const yFg = srgbToApcaY(fgSrgb.r, fgSrgb.g, fgSrgb.b)
  const yBg = srgbToApcaY(bgSrgb.r, bgSrgb.g, bgSrgb.b)

  const scale = 1.14

  let contrast: number
  if (yBg > yFg) {
    // Light background, dark text (positive contrast)
    contrast = scale * (Math.pow(yBg, 0.56) - Math.pow(yFg, 0.57))
  } else {
    // Dark background, light text (negative contrast)
    contrast = scale * (Math.pow(yBg, 0.65) - Math.pow(yFg, 0.62))
  }

  // Apply offset for very low contrast
  if (Math.abs(contrast) < 0.1) {
    return 0
  } else if (contrast > 0) {
    contrast -= 0.027
  } else {
    contrast += 0.027
  }

  return contrast * 100
}

/**
 * Choose white or black text based on background color.
 * Uses APCA (Advanced Perceptual Contrast Algorithm) for better accuracy.
 */
const chooseTextColor = (background: Oklch): Oklch => {
  const white = $Oklch.create(0.99, 0, 0)
  const black = $Oklch.create(0.15, 0, 0)

  // APCA returns negative for light-on-dark, positive for dark-on-light
  const whiteContrast = Math.abs(calculateApcaContrast(white, background))
  const blackContrast = Math.abs(calculateApcaContrast(black, background))

  // Choose the one with better contrast
  return whiteContrast > blackContrast ? white : black
}

/**
 * Mix two OKLCH colors by ratio.
 * @param base - Base color
 * @param mix - Color to mix in
 * @param ratio - Mix ratio (0 = all base, 1 = all mix)
 */
const mixColors = (base: Oklch, mix: Oklch, ratio: number): Oklch => {
  const r = Math.max(0, Math.min(1, ratio))
  const L = base.L * (1 - r) + mix.L * r
  const C = base.C * (1 - r) + mix.C * r

  // Handle hue interpolation (circular)
  let H: number
  if (base.C < 0.01) {
    // Base is neutral, use mix hue
    H = mix.H
  } else if (mix.C < 0.01) {
    // Mix is neutral, use base hue
    H = base.H
  } else {
    // Both have hue, interpolate
    let diff = mix.H - base.H
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    H = (base.H + diff * r + 360) % 360
  }

  return $Oklch.create(L, C, H)
}

export const $SemanticPalette = {
  /**
   * Create SemanticPalette from CorePalette
   */
  fromCorePalette: (core: CorePalette): SemanticPalette => {
    const { brand } = core

    // === Surface colors (white-based) ===
    const white = $Oklch.create(0.99, 0, 0)
    const black = $Oklch.create(0.15, 0, 0)

    // Base: pure white
    const surfaceBase = white

    // Elevated: white with a hint of brand color
    const surfaceElevated = mixColors(white, brand.primary, 0.06)

    // Card: stronger brand tint for smaller card elements
    const surfaceCard = mixColors(white, brand.primary, 0.18)

    // Border: light gray with brand tint
    const surfaceBorder = mixColors(white, brand.primary, 0.12)
    const borderAdjusted = $Oklch.create(0.88, surfaceBorder.C * 0.5, surfaceBorder.H)

    // === Text colors ===
    // Primary text: high contrast on white base
    const textPrimary = $Oklch.create(0.20, 0.01, brand.primary.H)
    // Secondary: lighter
    const textSecondary = $Oklch.create(0.50, 0.01, brand.primary.H)
    // Muted: even lighter
    const textMuted = $Oklch.create(0.65, 0.01, brand.primary.H)
    // On brand: choose based on brand lightness
    const textOnBrand = chooseTextColor(brand.primary)
    // On accent: choose based on accent lightness
    const textOnAccent = chooseTextColor(brand.accent)

    // === Brand colors ===
    const brandHover = $Oklch.create(
      Math.min(brand.primary.L + 0.08, 0.95),
      brand.primary.C * 1.1,
      brand.primary.H
    )
    const brandActive = $Oklch.create(
      Math.max(brand.primary.L - 0.08, 0.15),
      brand.primary.C * 0.95,
      brand.primary.H
    )

    // === Accent colors ===
    const accentHover = $Oklch.create(
      Math.min(brand.accent.L + 0.08, 0.95),
      brand.accent.C * 1.1,
      brand.accent.H
    )

    return {
      surface: {
        base: surfaceBase,
        elevated: surfaceElevated,
        card: surfaceCard,
        border: borderAdjusted,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
        muted: textMuted,
        onBrandPrimary: textOnBrand,
        onAccent: textOnAccent,
      },
      brand: {
        primary: brand.primary,
        hover: brandHover,
        active: brandActive,
      },
      accent: {
        base: brand.accent,
        hover: accentHover,
      },
    }
  },

  /**
   * Get color from SemanticPalette by token
   */
  getColor: (palette: SemanticPalette, token: SemanticColorToken): Oklch => {
    const [category, key] = token.split('.') as [
      keyof SemanticPalette,
      string
    ]
    const group = palette[category] as Record<string, Oklch>
    const color = group[key]
    if (!color) {
      // Fallback to neutral gray
      return $Oklch.create(0.5, 0, 0)
    }
    return color
  },
}
