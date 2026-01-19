/**
 * RenderTheme - Theme context for rendering sections
 *
 * Contains all styling information needed to render sections.
 */

import type { SemanticColorPalette } from '@practice/semantic-color-palette/Domain'
import type { DesignTokens } from '@practice/design-tokens/Domain'
import { createDesignTokens } from '@practice/design-tokens/Domain'

// ============================================================================
// RenderTheme
// ============================================================================

export interface RenderTheme {
  readonly palette: SemanticColorPalette
  readonly tokens: DesignTokens
}

/**
 * Default design tokens for RenderTheme
 */
export const DEFAULT_TOKENS: DesignTokens = createDesignTokens()
