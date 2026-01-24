/**
 * resolveForeground
 *
 * Foreground element resolution including fonts and colors
 */

import type { PrimitivePalette, PrimitiveKey } from '@practice/semantic-color-palette/Domain'
import type {
  ForegroundLayerConfig,
  ForegroundElementConfig,
} from '../../Domain/HeroViewConfig'
import type {
  CompiledForegroundLayer,
  CompiledForegroundElement,
} from '../../Domain/CompiledHeroView'
import { resolveKeyToCss } from './resolveColors'

// ============================================================
// Types
// ============================================================

/**
 * Default foreground element values
 */
const FOREGROUND_DEFAULTS = {
  title: {
    fontWeight: 700,
    fontSize: 4, // rem units (will be converted to px)
    letterSpacing: -0.02,
    lineHeight: 1.1,
  },
  description: {
    fontWeight: 400,
    fontSize: 1.25,
    letterSpacing: 0,
    lineHeight: 1.5,
  },
} as const

/**
 * Font resolver function type
 */
export type FontResolver = (fontId: string | undefined) => string

/**
 * Default font resolver that returns the fontId or system font
 */
export const DEFAULT_FONT_RESOLVER: FontResolver = (fontId) =>
  fontId ?? 'system-ui, sans-serif'

/**
 * Context for resolving 'auto' foreground colors
 */
export interface ForegroundColorContext {
  /**
   * Fallback color for title elements when colorKey is 'auto'
   * This is the auto-selected ink color based on background analysis
   */
  titleAutoColor: string
  /**
   * Fallback color for description elements when colorKey is 'auto'
   */
  bodyAutoColor: string
  /**
   * Per-element color map for more specific overrides
   */
  elementColors?: Map<string, string>
  /**
   * Font resolver function (optional, uses DEFAULT_FONT_RESOLVER if not provided)
   */
  fontResolver?: FontResolver
}

// ============================================================
// Resolution Functions
// ============================================================

/**
 * Resolve font ID to font family name
 */
export function resolveFontFamily(
  fontId: string | undefined,
  resolver: FontResolver = DEFAULT_FONT_RESOLVER
): string {
  return resolver(fontId)
}

/**
 * Resolve foreground element color
 *
 * Priority:
 * 1. Specific element color from elementColors map
 * 2. Element's colorKey (if not 'auto')
 * 3. Auto color based on element type (title/description)
 */
export function resolveElementColor(
  element: ForegroundElementConfig,
  palette: PrimitivePalette,
  colorContext: ForegroundColorContext
): string {
  // Check element-specific color map first
  if (colorContext.elementColors?.has(element.id)) {
    return colorContext.elementColors.get(element.id)!
  }

  // If colorKey is defined and not 'auto', resolve from palette
  if (element.colorKey && element.colorKey !== 'auto') {
    return resolveKeyToCss(palette, element.colorKey as PrimitiveKey)
  }

  // Use auto color based on element type
  return element.type === 'title'
    ? colorContext.titleAutoColor
    : colorContext.bodyAutoColor
}

/**
 * Compile a single foreground element
 */
export function compileForegroundElement(
  element: ForegroundElementConfig,
  palette: PrimitivePalette,
  colorContext: ForegroundColorContext
): CompiledForegroundElement {
  const defaults = FOREGROUND_DEFAULTS[element.type]
  const fontResolver = colorContext.fontResolver ?? DEFAULT_FONT_RESOLVER

  return {
    id: element.id,
    type: element.type,
    visible: element.visible,
    position: element.position,
    content: element.content,
    fontFamily: resolveFontFamily(element.fontId, fontResolver),
    fontSize: element.fontSize ?? defaults.fontSize,
    fontWeight: element.fontWeight ?? defaults.fontWeight,
    letterSpacing: element.letterSpacing ?? defaults.letterSpacing,
    lineHeight: element.lineHeight ?? defaults.lineHeight,
    color: resolveElementColor(element, palette, colorContext),
  }
}

/**
 * Compile foreground layer config to fully resolved CompiledForegroundLayer
 */
export function compileForegroundLayer(
  config: ForegroundLayerConfig,
  palette: PrimitivePalette,
  colorContext: ForegroundColorContext
): CompiledForegroundLayer {
  return {
    elements: config.elements.map((el) =>
      compileForegroundElement(el, palette, colorContext)
    ),
  }
}

/**
 * Create a default color context with fallback colors
 * Used when no auto-color analysis is available
 */
export function createDefaultColorContext(
  palette: PrimitivePalette,
  isDark: boolean
): ForegroundColorContext {
  // Use neutral keys for fallback
  const titleKey: PrimitiveKey = isDark ? 'F1' : 'F9'
  const bodyKey: PrimitiveKey = isDark ? 'F2' : 'F8'

  return {
    titleAutoColor: resolveKeyToCss(palette, titleKey),
    bodyAutoColor: resolveKeyToCss(palette, bodyKey),
  }
}
