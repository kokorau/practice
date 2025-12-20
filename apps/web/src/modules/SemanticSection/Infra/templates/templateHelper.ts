/**
 * Template Helper - Utilities for building section templates
 *
 * Provides consistent CSS class application and styling helpers.
 */

import { CONTEXT_CLASS_NAMES, COMPONENT_CLASS_NAMES } from '../../../SemanticColorPalette/Domain'
import type { RenderTheme } from '../../Domain'
import { $StylePack } from '../../Domain'

// ============================================================================
// CSS Class Helpers
// ============================================================================

/** Context CSS class names */
export const ctx = CONTEXT_CLASS_NAMES

/** Component CSS class names */
export const cmp = COMPONENT_CLASS_NAMES

// ============================================================================
// Style Helpers
// ============================================================================

/** Get section padding from theme */
export const sectionPadding = (theme: RenderTheme): string =>
  $StylePack.sectionPadding(theme.style.padding)

/** Get grid gap from theme */
export const gridGap = (theme: RenderTheme): string =>
  $StylePack.gridGap(theme.style.gap)

/** Get card gap from theme */
export const cardGap = (theme: RenderTheme): string =>
  $StylePack.cardGap(theme.style.gap)

/** Get card padding from theme */
export const cardPadding = (theme: RenderTheme): string =>
  $StylePack.cardPadding(theme.style.padding)

/** Get button padding from theme */
export const buttonPadding = (theme: RenderTheme): string =>
  $StylePack.buttonPadding(theme.style.padding)

/** Get border radius from theme */
export const rounded = (theme: RenderTheme): string =>
  $StylePack.rounded(theme.style.rounded)

/** Get smaller border radius */
export const roundedSm = (theme: RenderTheme): string => {
  const size = theme.style.rounded
  if (size === 'none') return '0'
  if (size === 'sm') return '2px'
  if (size === 'md') return '4px'
  if (size === 'lg') return '8px'
  return '9999px'
}

// ============================================================================
// Common Style Patterns
// ============================================================================

/** Common container styles - matches original demo content-width */
export const containerStyle = `
  max-width: 980px;
  margin: 0 auto;
  padding: 0 2rem;
`.trim().replace(/\n/g, ' ')

/** Flex center styles */
export const flexCenter = `
  display: flex;
  align-items: center;
  justify-content: center;
`.trim().replace(/\n/g, ' ')

/** Flex between styles */
export const flexBetween = `
  display: flex;
  align-items: center;
  justify-content: space-between;
`.trim().replace(/\n/g, ' ')

/** Grid auto-fit styles */
export const gridAutoFit = (minWidth: string, gap: string) => `
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${minWidth}, 1fr));
  gap: ${gap};
`.trim().replace(/\n/g, ' ')

// ============================================================================
// HTML Helpers
// ============================================================================

/** Escape HTML special characters */
export const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

/** Join class names */
export const cx = (...classes: (string | undefined | false)[]): string =>
  classes.filter(Boolean).join(' ')
