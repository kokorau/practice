/**
 * resolveColors
 *
 * Palette key resolution to RGBA/Oklch colors
 */

import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import type { RGBA } from '@practice/texture'
import type {
  PrimitivePalette,
  PrimitiveKey,
  ContextName,
} from '@practice/semantic-color-palette/Domain'
import type { HeroPrimitiveKey } from '../../Domain/HeroViewConfig'

// ============================================================
// Types
// ============================================================

/**
 * Context to primitive key mapping by theme
 */
const CONTEXT_SURFACE_KEYS: Record<'light' | 'dark', Record<ContextName, PrimitiveKey>> = {
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
// Helpers
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
// Resolution Functions
// ============================================================

/**
 * Get the canvas surface key for a given theme
 */
export function getCanvasSurfaceKey(isDark: boolean): PrimitiveKey {
  return CONTEXT_SURFACE_KEYS[isDark ? 'dark' : 'light'].canvas
}

/**
 * Get the surface key for a semantic context
 */
export function getSurfaceKeyForContext(
  context: ContextName,
  isDark: boolean
): PrimitiveKey {
  return CONTEXT_SURFACE_KEYS[isDark ? 'dark' : 'light'][context]
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
 * Resolve surface colors config to RGBA tuple
 *
 * @param palette - Primitive palette
 * @param colorKey - Color key which may be 'auto'
 * @param fallbackKey - Key to use when colorKey is 'auto'
 * @param isDark - Whether dark theme is active
 * @param isPrimary - Whether this is primary (for auto deltaL adjustment)
 * @returns Resolved RGBA color
 */
export function resolveSurfaceColorKey(
  palette: PrimitivePalette,
  colorKey: HeroPrimitiveKey | 'auto',
  fallbackKey: PrimitiveKey,
  isDark: boolean,
  isPrimary: boolean = false
): RGBA {
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
