/**
 * SectionTemplate - Template interface for rendering sections
 *
 * Supports two formats:
 * 1. Legacy: TypeScript render function (for backward compatibility)
 * 2. String: Template string with ${variable} placeholders (DB-storable)
 */

import type { SectionType } from './Section'
import type { SectionContent } from './SectionContent'
import type { RenderTheme } from './RenderTheme'

// ============================================================================
// Legacy Template Interface (backward compatibility)
// ============================================================================

/**
 * A template that renders a section to HTML using a function
 * @deprecated Use StringSectionTemplate for new templates
 */
export interface LegacySectionTemplate<T extends SectionContent = SectionContent> {
  readonly type: SectionType
  readonly render: (content: T, theme: RenderTheme) => string
}

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
  readonly type: SectionType
  readonly template: string
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Either legacy function-based or new string-based template
 */
export type SectionTemplate<T extends SectionContent = SectionContent> =
  | LegacySectionTemplate<T>
  | StringSectionTemplate

/**
 * Type guard to check if template is string-based
 */
export const isStringTemplate = (t: SectionTemplate): t is StringSectionTemplate =>
  'template' in t && typeof t.template === 'string'

/**
 * Type guard to check if template is legacy function-based
 */
export const isLegacyTemplate = <T extends SectionContent>(
  t: SectionTemplate<T>
): t is LegacySectionTemplate<T> =>
  'render' in t && typeof t.render === 'function'

// ============================================================================
// Template Registry Type
// ============================================================================

/**
 * Registry of all section templates
 */
export type TemplateRegistry = Readonly<
  Record<SectionType, SectionTemplate<SectionContent>>
>
