/**
 * ColorHelpers
 *
 * Shared color utility functions for HeroScene rendering.
 * Used by both buildPipeline and renderHeroConfig.
 */

import type { PrimitivePalette } from '@practice/semantic-color-palette'

// ============================================================
// Types
// ============================================================

/**
 * Oklch color representation
 */
export interface Oklch {
  L: number
  C: number
  H: number
}

/**
 * Semantic context names for surface key mapping
 */
export type SemanticContextName = 'canvas' | 'sectionNeutral' | 'sectionTint' | 'sectionContrast'

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
