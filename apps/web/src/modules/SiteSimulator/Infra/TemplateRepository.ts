import type { SectionMeta, SectionContent, SectionTemplate, BaseTemplate } from '../Domain/ValueObject'
import { $ScopedStyle } from '../Domain/ValueObject'
import utilityStyle from './templates/base.css?raw'

// ============================================================
// Section Template Registry (auto-loaded from templates/section folder)
// ============================================================

const sectionModules = import.meta.glob<{ default: SectionTemplate }>(
  './templates/section/*/index.ts',
  { eager: true }
)

const sectionTemplates = new Map<string, SectionTemplate>(
  Object.values(sectionModules).map(mod => [mod.default.meta.templateId, mod.default])
)

// ============================================================
// Base Template Registry (auto-loaded from templates/base folder)
// ============================================================

const baseModules = import.meta.glob<{ default: BaseTemplate }>(
  './templates/base/*/index.ts',
  { eager: true }
)

const baseTemplates = new Map<string, BaseTemplate>(
  Object.values(baseModules).map(mod => [mod.default.meta.templateId, mod.default])
)

// ============================================================
// Repository
// ============================================================

export const TemplateRepository = {
  get(templateId: string): SectionTemplate | undefined {
    return sectionTemplates.get(templateId)
  },

  getMeta(templateId: string): SectionMeta | undefined {
    return sectionTemplates.get(templateId)?.meta
  },

  getAll(): SectionTemplate[] {
    return Array.from(sectionTemplates.values())
  },

  getAllIds(): string[] {
    return Array.from(sectionTemplates.keys())
  },

  createDefaultContent(templateId: string): SectionContent | undefined {
    return sectionTemplates.get(templateId)?.defaultContent()
  },

  register(template: SectionTemplate): void {
    sectionTemplates.set(template.meta.templateId, template)
  },

  getDefaultSections(): SectionContent[] {
    const defaultOrder = ['hero', 'cards', 'cta']
    return defaultOrder
      .map(id => sectionTemplates.get(id)?.defaultContent())
      .filter((c): c is SectionContent => c !== undefined)
  },

  /**
   * Get utility CSS (Tailwind-like utilities)
   */
  getUtilityStyle(): string {
    return utilityStyle
  },

  /**
   * Get combined CSS for given sections
   * Includes utility + each section's scoped style (using CSS nesting)
   */
  getStylesForSections(sections: Array<{ id: string; templateId: string }>): string {
    const sectionStyles = sections
      .map(section => {
        const template = sectionTemplates.get(section.templateId)
        if (!template?.meta.style) return ''
        // セクションIDでスコープを付与（CSS nesting）
        const scopeClass = $ScopedStyle.scopeClass(section.id)
        return $ScopedStyle.wrapCss(template.meta.style, scopeClass)
      })
      .filter(Boolean)
      .join('\n')

    return `${utilityStyle}\n${sectionStyles}`
  },

  /**
   * Get style for a single section (scoped with CSS nesting)
   */
  getStyleForSection(sectionId: string, templateId: string): string {
    const template = sectionTemplates.get(templateId)
    if (!template?.meta.style) return ''
    const scopeClass = $ScopedStyle.scopeClass(sectionId)
    return $ScopedStyle.wrapCss(template.meta.style, scopeClass)
  },

  /**
   * Get all registered styles (utility only, templates are scoped per-section)
   */
  getAllStyles(): string {
    return utilityStyle
  },

  // ============================================================
  // Base Template Methods
  // ============================================================

  /**
   * Get base template by ID
   */
  getBase(templateId: string): BaseTemplate | undefined {
    return baseTemplates.get(templateId)
  },

  /**
   * Get default base template
   */
  getDefaultBase(): BaseTemplate | undefined {
    return baseTemplates.get('default')
  },

  /**
   * Get all base template IDs
   */
  getAllBaseIds(): string[] {
    return Array.from(baseTemplates.keys())
  },
}
