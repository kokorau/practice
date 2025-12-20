/**
 * String Templates - DB-storable template definitions
 *
 * Each template has:
 * - template: The template string with ${variable} placeholders
 * - preprocessor: Function to prepare variables from content + theme
 */

import type { SectionType, SectionContent, RenderTheme, TemplateVars } from '../../Domain'
import { headerTemplate, preprocessHeader } from './HeaderStringTemplate'

// ============================================================================
// Preprocessor Type
// ============================================================================

/**
 * Preprocessor function that converts content + theme to template variables
 */
export type Preprocessor = (content: SectionContent, theme: RenderTheme) => TemplateVars

// ============================================================================
// Preprocessor Registry
// ============================================================================

/**
 * Map of section type to preprocessor function
 * Only string-based templates have preprocessors
 */
const preprocessors: Partial<Record<SectionType, Preprocessor>> = {
  // Add preprocessors as templates are converted
  // header: preprocessHeader as Preprocessor,
}

/**
 * Get preprocessor for a section type
 * Throws if no preprocessor is registered (section still uses legacy template)
 */
export const getPreprocessor = (type: SectionType): Preprocessor => {
  const preprocessor = preprocessors[type]
  if (!preprocessor) {
    throw new Error(`No preprocessor registered for section type: ${type}. Template may still be using legacy format.`)
  }
  return preprocessor
}

/**
 * Check if a section type has a string template
 */
export const hasStringTemplate = (type: SectionType): boolean =>
  type in preprocessors

// ============================================================================
// Template Exports
// ============================================================================

export { headerTemplate, preprocessHeader }
