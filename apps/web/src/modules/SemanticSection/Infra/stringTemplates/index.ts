/**
 * String Templates - DB-storable template definitions
 */

import type { SectionType, SectionContent, RenderTheme, TemplateVars, StringSectionTemplate } from '../../Domain'
import { STRING_TEMPLATES, PREPROCESSORS, DEFAULT_TEMPLATES } from './allTemplates'

export { DEFAULT_TEMPLATES }

export type { StringSectionTemplate }

// ============================================================================
// Template Access
// ============================================================================

/**
 * Get string template by section type
 */
export const getStringTemplate = (type: SectionType): StringSectionTemplate => {
  const template = STRING_TEMPLATES[type]
  if (!template) {
    throw new Error(`No string template found for section type: ${type}`)
  }
  return template
}

/**
 * Get all string templates
 */
export const getAllStringTemplates = (): readonly StringSectionTemplate[] =>
  Object.values(STRING_TEMPLATES)

// ============================================================================
// Preprocessor Access
// ============================================================================

export type Preprocessor = (content: SectionContent, theme: RenderTheme) => TemplateVars

/**
 * Get preprocessor for a section type
 */
export const getPreprocessor = (type: SectionType): Preprocessor => {
  const preprocessor = PREPROCESSORS[type]
  if (!preprocessor) {
    throw new Error(`No preprocessor found for section type: ${type}`)
  }
  return preprocessor
}

/**
 * Check if a section type has a string template
 */
export const hasStringTemplate = (type: SectionType): boolean =>
  type in STRING_TEMPLATES
