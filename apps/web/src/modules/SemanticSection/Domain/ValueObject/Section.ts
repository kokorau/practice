/**
 * Section - Core types for page sections
 *
 * Defines the structure of sections that can be composed into a page.
 */

// ============================================================================
// Section Types
// ============================================================================

/**
 * Available section types for the page builder
 * Based on the Demo in SemanticColorPaletteGeneratorView
 */
export const SECTION_TYPES = {
  header: 'header',
  hero: 'hero',
  features: 'features',
  logos: 'logos',
  howItWorks: 'howItWorks',
  testimonials: 'testimonials',
  pricing: 'pricing',
  faq: 'faq',
  cta: 'cta',
  footer: 'footer',
} as const

export type SectionType = (typeof SECTION_TYPES)[keyof typeof SECTION_TYPES]

export const SECTION_TYPE_LIST = Object.values(SECTION_TYPES) as SectionType[]

// ============================================================================
// Section
// ============================================================================

/**
 * A single section in a page
 */
export interface Section {
  readonly id: string
  readonly type: SectionType
}

// ============================================================================
// Page
// ============================================================================

/**
 * A page composed of sections
 */
export interface Page {
  readonly id: string
  readonly sections: readonly Section[]
}

// ============================================================================
// Factory
// ============================================================================

export const $Section = {
  create: (type: SectionType, id?: string): Section => ({
    id: id ?? `${type}-${Date.now()}`,
    type,
  }),
} as const

export const $Page = {
  create: (sections: Section[], id?: string): Page => ({
    id: id ?? `page-${Date.now()}`,
    sections,
  }),

  /** Create a default demo page with all sections */
  createDemo: (): Page => ({
    id: 'demo-page',
    sections: [
      { id: 'header-1', type: 'header' },
      { id: 'hero-1', type: 'hero' },
      { id: 'features-1', type: 'features' },
      { id: 'logos-1', type: 'logos' },
      { id: 'how-it-works-1', type: 'howItWorks' },
      { id: 'testimonials-1', type: 'testimonials' },
      { id: 'pricing-1', type: 'pricing' },
      { id: 'faq-1', type: 'faq' },
      { id: 'cta-1', type: 'cta' },
      { id: 'footer-1', type: 'footer' },
    ],
  }),
} as const
