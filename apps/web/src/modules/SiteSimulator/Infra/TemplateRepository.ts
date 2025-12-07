import type { SectionMeta, SectionContent, SectionTemplate } from '../Domain/ValueObject'

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
}
