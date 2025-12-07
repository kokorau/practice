import type { SectionMeta, SectionContent } from '../Domain/ValueObject'
import { heroTemplate, cardsTemplate, ctaTemplate, contentTemplate } from './templates'

/**
 * SectionTemplate - テンプレート定義（Meta + デフォルトコンテンツ）
 */
export type SectionTemplate = {
  readonly meta: SectionMeta
  readonly defaultContent: () => SectionContent
}

// ============================================================
// Template Registry
// ============================================================

const templates = new Map<string, SectionTemplate>([
  ['hero', heroTemplate],
  ['cards', cardsTemplate],
  ['cta', ctaTemplate],
  ['content', contentTemplate],
])

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
    return [
      heroTemplate.defaultContent(),
      cardsTemplate.defaultContent(),
      ctaTemplate.defaultContent(),
    ]
  },
}
