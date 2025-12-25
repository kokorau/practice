/**
 * RenderTheme - Theme context for rendering sections
 *
 * Contains all styling information needed to render sections.
 */

import type { SemanticColorPalette } from '../../../SemanticColorPalette/Domain'
import type { DesignTokens } from '../../../DesignTokens/Domain'
import { createDesignTokens } from '../../../DesignTokens/Domain'

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
