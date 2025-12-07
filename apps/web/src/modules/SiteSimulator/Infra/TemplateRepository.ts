import type { SectionMeta, SectionContent, SectionTemplate } from '../Domain/ValueObject'
import { $ScopedStyle } from '../Domain/ValueObject'
import baseStyle from './templates/base.css?raw'

// ============================================================
// Template Registry (auto-loaded from templates folder)
// ============================================================

const templateModules = import.meta.glob<{ default: SectionTemplate }>(
  './templates/*/index.ts',
  { eager: true }
)

const templates = new Map<string, SectionTemplate>(
  Object.values(templateModules).map(mod => [mod.default.meta.templateId, mod.default])
)

// ============================================================
// Repository
// ============================================================

export const TemplateRepository = {
  get(templateId: string): SectionTemplate | undefined {
    return templates.get(templateId)
  },

  getMeta(templateId: string): SectionMeta | undefined {
    return templates.get(templateId)?.meta
  },

  getAll(): SectionTemplate[] {
    return Array.from(templates.values())
  },

  getAllIds(): string[] {
    return Array.from(templates.keys())
  },

  createDefaultContent(templateId: string): SectionContent | undefined {
    return templates.get(templateId)?.defaultContent()
  },

  register(template: SectionTemplate): void {
    templates.set(template.meta.templateId, template)
  },

  getDefaultSections(): SectionContent[] {
    const defaultOrder = ['hero', 'cards', 'cta']
    return defaultOrder
      .map(id => templates.get(id)?.defaultContent())
      .filter((c): c is SectionContent => c !== undefined)
  },

  /**
   * Get base CSS (Tailwind-like utilities)
   */
  getBaseStyle(): string {
    return baseStyle
  },

  /**
   * Get combined CSS for given sections
   * Includes base + each section's scoped style (using CSS nesting)
   */
  getStylesForSections(sections: Array<{ id: string; templateId: string }>): string {
    const sectionStyles = sections
      .map(section => {
        const template = templates.get(section.templateId)
        if (!template?.meta.style) return ''
        // セクションIDでスコープを付与（CSS nesting）
        const scopeClass = $ScopedStyle.scopeClass(section.id)
        return $ScopedStyle.wrapCss(template.meta.style, scopeClass)
      })
      .filter(Boolean)
      .join('\n')

    return `${baseStyle}\n${sectionStyles}`
  },

  /**
   * Get style for a single section (scoped with CSS nesting)
   */
  getStyleForSection(sectionId: string, templateId: string): string {
    const template = templates.get(templateId)
    if (!template?.meta.style) return ''
    const scopeClass = $ScopedStyle.scopeClass(sectionId)
    return $ScopedStyle.wrapCss(template.meta.style, scopeClass)
  },

  /**
   * Get all registered styles (base only, templates are scoped per-section)
   */
  getAllStyles(): string {
    return baseStyle
  },
}
