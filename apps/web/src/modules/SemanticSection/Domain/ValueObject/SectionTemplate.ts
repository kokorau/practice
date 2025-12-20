/**
 * SectionTemplate - Template interface for rendering sections
 *
 * Each section type has a template that renders it to HTML.
 */

import type { SectionType } from './Section'
import type { SectionContent } from './SectionContent'
import type { RenderTheme } from './RenderTheme'

// ============================================================================
// Template Interface
// ============================================================================

/**
 * A template that renders a section to HTML
 */
export interface SectionTemplate<T extends SectionContent = SectionContent> {
  readonly type: SectionType
  readonly render: (content: T, theme: RenderTheme) => string
}

// ============================================================================
// Template Registry Type
// ============================================================================

/**
 * Registry of all section templates
 * Uses a looser type to allow specific content types in templates
 */
export type TemplateRegistry = Readonly<
  Record<SectionType, SectionTemplate<SectionContent>>
>
