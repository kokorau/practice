/**
 * ColorHelpers
 *
 * Shared color utility functions for HeroScene rendering.
 * Used by both buildPipeline and renderHeroConfig.
 */

import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { RGBA } from '@practice/texture'
import type { PrimitivePalette, PrimitiveKey, ContextName } from '@practice/semantic-color-palette'
import type { HeroPrimitiveKey, ColorValue } from './HeroViewConfig'
import { isCustomColor } from './HeroViewConfig'

// Re-export for convenience
export type { Oklch }

/**
 * Semantic context names for surface key mapping
 */
export type SemanticContextName = ContextName

// ============================================================
// Constants
// ============================================================

/**
 * Semantic context to primitive surface key mapping.
 * Maps semantic context names to primitive palette keys for light/dark themes.
 */
export const CONTEXT_SURFACE_KEYS: Record<'light' | 'dark', Record<SemanticContextName, string>> = {
  light: {
    canvas: 'F1',
    sectionNeutral: 'F2',
    sectionTint: 'Bt',
    sectionContrast: 'Bf',
  },
  dark: {
    canvas: 'F8',
    sectionNeutral: 'F7',
    sectionTint: 'Bs',
    sectionContrast: 'Bf',
  },
}

// ============================================================
// Color Functions
// ============================================================

/**
 * Get Oklch color from palette by key.
 *
 * @param palette - Primitive palette
 * @param key - Palette key (e.g., 'F1', 'B', 'AN3')
 * @returns Oklch color, or neutral gray if key not found
 */
export function getOklchFromPalette(
  palette: PrimitivePalette,
  key: string
): Oklch {
  const oklch = (palette as Record<string, Oklch>)[key]
  return oklch ?? { L: 0.5, C: 0, H: 0 }
}

/**
 * Determine if palette represents dark theme.
 * Based on the lightness of the F0 (foundation) color.
 *
 * @param palette - Primitive palette
 * @returns true if dark theme (F0 lightness < 0.5)
 */
export function isDarkTheme(palette: PrimitivePalette): boolean {
  const f0 = getOklchFromPalette(palette, 'F0')
  return f0.L < 0.5
}

/**
 * Get mask surface key based on semantic context and theme.
 *
 * @param semanticContext - Semantic context name
 * @param isDark - Whether dark theme is active
 * @returns Primitive palette key for the surface
 */
export function getMaskSurfaceKey(
  semanticContext: string,
  isDark: boolean
): string {
  const mode = isDark ? 'dark' : 'light'
  const context = (semanticContext as SemanticContextName) || 'canvas'
  return CONTEXT_SURFACE_KEYS[mode][context] ?? CONTEXT_SURFACE_KEYS[mode].canvas
}

// ============================================================
// Oklch ↔ RGBA/CSS Conversion
// ============================================================

/**
 * Convert Oklch to RGBA tuple
 */
export function oklchToRgba(oklch: Oklch, alpha: number = 1.0): RGBA {
  const srgb = $Oklch.toSrgb(oklch)
  return [
    Math.max(0, Math.min(1, srgb.r)),
    Math.max(0, Math.min(1, srgb.g)),
    Math.max(0, Math.min(1, srgb.b)),
    alpha,
  ]
}

/**
 * Convert Oklch to CSS string
 */
export function oklchToCss(oklch: Oklch): string {
  return $Oklch.toCss(oklch)
}

// ============================================================
// Palette Key Resolution
// ============================================================

/**
 * Get the canvas surface key for a given theme
 */
export function getCanvasSurfaceKey(isDark: boolean): PrimitiveKey {
  return CONTEXT_SURFACE_KEYS[isDark ? 'dark' : 'light'].canvas as PrimitiveKey
}

/**
 * Get the surface key for a semantic context
 */
export function getSurfaceKeyForContext(
  context: ContextName,
  isDark: boolean
): PrimitiveKey {
  return CONTEXT_SURFACE_KEYS[isDark ? 'dark' : 'light'][context] as PrimitiveKey
}

/**
 * Resolve a color key to Oklch
 *
 * @param palette - Primitive palette
 * @param key - Palette key (e.g., 'B', 'BN5', 'F1')
 * @returns Oklch color or undefined if key is invalid
 */
export function resolveKeyToOklch(
  palette: PrimitivePalette,
  key: HeroPrimitiveKey | PrimitiveKey
): Oklch | undefined {
  return palette[key as PrimitiveKey]
}

/**
 * Resolve a color key to RGBA
 *
 * @param palette - Primitive palette
 * @param key - Palette key (e.g., 'B', 'BN5', 'F1')
 * @param alpha - Alpha value (default: 1.0)
 * @returns RGBA color or fallback gray if key is invalid
 */
export function resolveKeyToRgba(
  palette: PrimitivePalette,
  key: HeroPrimitiveKey | PrimitiveKey,
  alpha: number = 1.0
): RGBA {
  const oklch = resolveKeyToOklch(palette, key)
  if (oklch) {
    return oklchToRgba(oklch, alpha)
  }
  return [0.5, 0.5, 0.5, alpha] // Fallback gray
}

/**
 * Resolve a color key to CSS string
 *
 * @param palette - Primitive palette
 * @param key - Palette key (e.g., 'B', 'BN5', 'F1')
 * @returns CSS color string or fallback gray if key is invalid
 */
export function resolveKeyToCss(
  palette: PrimitivePalette,
  key: HeroPrimitiveKey | PrimitiveKey
): string {
  const oklch = resolveKeyToOklch(palette, key)
  if (oklch) {
    return oklchToCss(oklch)
  }
  return 'oklch(0.5 0 0)' // Fallback gray
}

/**
 * Resolve 'auto' primary color for mask layer
 *
 * For 'auto', use the mask surface key with a deltaL adjustment
 * to create visible contrast for patterns.
 */
export function resolveAutoMaskPrimaryColor(
  palette: PrimitivePalette,
  maskSurfaceKey: PrimitiveKey,
  isDark: boolean
): Oklch {
  const surface = palette[maskSurfaceKey]
  const deltaL = isDark ? 0.12 : -0.12
  return { L: surface.L + deltaL, C: surface.C, H: surface.H }
}

/**
 * Convert HSV to Oklch color.
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param v - Value (0-100)
 */
function hsvToOklch(h: number, s: number, v: number): Oklch {
  // Convert HSV to RGB first
  const sNorm = s / 100
  const vNorm = v / 100
  const c = vNorm * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = vNorm - c

  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  r += m; g += m; b += m

  // Convert sRGB to Oklch
  return $Oklch.fromSrgb({ r, g, b })
}

/**
 * Resolve surface colors config to RGBA tuple
 *
 * @param palette - Primitive palette
 * @param colorKey - Color value which may be 'auto', primitive key, or custom HSV color
 * @param fallbackKey - Key to use when colorKey is 'auto'
 * @param isDark - Whether dark theme is active
 * @param isPrimary - Whether this is primary (for auto deltaL adjustment)
 * @returns Resolved RGBA color
 */
export function resolveSurfaceColorKey(
  palette: PrimitivePalette,
  colorKey: ColorValue,
  fallbackKey: PrimitiveKey,
  isDark: boolean,
  isPrimary: boolean = false
): RGBA {
  // Handle transparent color
  if (colorKey === 'transparent') {
    return [0, 0, 0, 0]
  }

  // Handle custom color
  if (isCustomColor(colorKey)) {
    const oklch = hsvToOklch(colorKey.hue, colorKey.saturation, colorKey.value)
    return oklchToRgba(oklch)
  }

  if (colorKey === 'auto') {
    if (isPrimary) {
      // For primary auto, apply deltaL adjustment
      const oklch = resolveAutoMaskPrimaryColor(palette, fallbackKey, isDark)
      return oklchToRgba(oklch)
    }
    // For secondary auto, use the fallback key directly
    return resolveKeyToRgba(palette, fallbackKey)
  }
  return resolveKeyToRgba(palette, colorKey)
}
