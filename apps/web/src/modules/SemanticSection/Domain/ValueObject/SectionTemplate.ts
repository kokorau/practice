/**
 * SectionTemplate - Template interface for rendering sections
 *
 * Uses string template format with ${variable} placeholders (DB-storable)
 */

import type { SectionKind } from './Section'

// ============================================================================
// String Template Interface (DB-storable)
// ============================================================================

/**
 * Variables map for template substitution
 */
export type TemplateVars = Readonly<Record<string, string>>

/**
 * A template that uses string substitution
 * Can be stored in database and evaluated at runtime
 */
export interface StringSectionTemplate {
  readonly id: string
  readonly kind: SectionKind
  readonly template: string
}

/**
 * Section template type alias (now only StringSectionTemplate)
 */
export type SectionTemplate = StringSectionTemplate

/**
 * Type guard to check if template is string-based
 */
export const isStringTemplate = (t: SectionTemplate): t is StringSectionTemplate =>
  'template' in t && typeof t.template === 'string'

// ============================================================================
// Template Registry Type
// ============================================================================

/**
 * Registry of all section templates
 */
export type TemplateRegistry = Readonly<Record<SectionKind, StringSectionTemplate>>
