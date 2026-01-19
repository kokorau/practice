/**
 * Section - Core types for page sections
 *
 * Sections are pure data structures that represent page content.
 * Each section type is a discriminated union with `kind` as the discriminator.
 * Content is embedded directly in the section (no separate lookup).
 */

import type {
  HeaderContent,
  HeroContent,
  FeaturesContent,
  LogosContent,
  HowItWorksContent,
  TestimonialsContent,
  PricingContent,
  FAQContent,
  CTAContent,
  FooterContent,
} from './SectionContent'
import type { HeroViewConfig } from '@practice/section-visual'

// ============================================================================
// Section Kind Constants
// ============================================================================

/**
 * Available section kinds for the page builder
 */
export const SECTION_KINDS = {
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

export type SectionKind = (typeof SECTION_KINDS)[keyof typeof SECTION_KINDS]

export const SECTION_KIND_LIST = Object.values(SECTION_KINDS) as SectionKind[]

// ============================================================================
// Section Types (Discriminated Union)
// ============================================================================

interface BaseSection {
  readonly id: string
}

export interface HeaderSection extends BaseSection {
  readonly kind: 'header'
  readonly content: HeaderContent
}

export interface HeroSection extends BaseSection {
  readonly kind: 'hero'
  readonly content: HeroContent
  /** Optional Canvas-based rendering config */
  readonly canvas?: HeroViewConfig
}

export interface FeaturesSection extends BaseSection {
  readonly kind: 'features'
  readonly content: FeaturesContent
}

export interface LogosSection extends BaseSection {
  readonly kind: 'logos'
  readonly content: LogosContent
}

export interface HowItWorksSection extends BaseSection {
  readonly kind: 'howItWorks'
  readonly content: HowItWorksContent
}

export interface TestimonialsSection extends BaseSection {
  readonly kind: 'testimonials'
  readonly content: TestimonialsContent
}

export interface PricingSection extends BaseSection {
  readonly kind: 'pricing'
  readonly content: PricingContent
}

export interface FAQSection extends BaseSection {
  readonly kind: 'faq'
  readonly content: FAQContent
}

export interface CTASection extends BaseSection {
  readonly kind: 'cta'
  readonly content: CTAContent
}

export interface FooterSection extends BaseSection {
  readonly kind: 'footer'
  readonly content: FooterContent
}

/**
 * Section - Discriminated union of all section types
 *
 * Each section contains its own content directly.
 * Use `section.kind` to discriminate between types.
 */
export type Section =
  | HeaderSection
  | HeroSection
  | FeaturesSection
  | LogosSection
  | HowItWorksSection
  | TestimonialsSection
  | PricingSection
  | FAQSection
  | CTASection
  | FooterSection

// ============================================================================
// Section Content Type Map (for type inference)
// ============================================================================

export interface SectionKindContentMap {
  header: HeaderContent
  hero: HeroContent
  features: FeaturesContent
  logos: LogosContent
  howItWorks: HowItWorksContent
  testimonials: TestimonialsContent
  pricing: PricingContent
  faq: FAQContent
  cta: CTAContent
  footer: FooterContent
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
// Factory Functions
// ============================================================================

export const $Section = {
  /**
   * Create a section with the given kind and content
   */
  create: <K extends SectionKind>(
    kind: K,
    content: SectionKindContentMap[K],
    id?: string
  ): Section => ({
    id: id ?? `${kind}-${Date.now()}`,
    kind,
    content,
  } as Section),

  /**
   * Create a hero section with optional canvas config
   */
  createHero: (
    content: HeroContent,
    canvas?: HeroViewConfig,
    id?: string
  ): HeroSection => ({
    id: id ?? `hero-${Date.now()}`,
    kind: 'hero',
    content,
    canvas,
  }),

  /**
   * Check if section has canvas rendering
   */
  hasCanvas: (section: Section): section is HeroSection & { canvas: HeroViewConfig } =>
    section.kind === 'hero' && section.canvas !== undefined,
} as const

export const $Page = {
  create: (sections: Section[], id?: string): Page => ({
    id: id ?? `page-${Date.now()}`,
    sections,
  }),

  /**
   * Create a demo page with all section kinds
   * Note: Requires default content to be injected from Infra layer
   */
  createDemoWithContent: (getContent: <K extends SectionKind>(kind: K) => SectionKindContentMap[K]): Page => ({
    id: 'demo-page',
    sections: [
      { id: 'header-1', kind: 'header', content: getContent('header') },
      { id: 'hero-1', kind: 'hero', content: getContent('hero') },
      { id: 'features-1', kind: 'features', content: getContent('features') },
      { id: 'logos-1', kind: 'logos', content: getContent('logos') },
      { id: 'how-it-works-1', kind: 'howItWorks', content: getContent('howItWorks') },
      { id: 'testimonials-1', kind: 'testimonials', content: getContent('testimonials') },
      { id: 'pricing-1', kind: 'pricing', content: getContent('pricing') },
      { id: 'faq-1', kind: 'faq', content: getContent('faq') },
      { id: 'cta-1', kind: 'cta', content: getContent('cta') },
      { id: 'footer-1', kind: 'footer', content: getContent('footer') },
    ],
  }),
} as const

// ============================================================================
// Legacy Compatibility (deprecated)
// ============================================================================

/**
 * @deprecated Use SectionKind instead
 */
export type SectionType = SectionKind

/**
 * @deprecated Use SECTION_KINDS instead
 */
export const SECTION_TYPES = SECTION_KINDS

/**
 * @deprecated Use SECTION_KIND_LIST instead
 */
export const SECTION_TYPE_LIST = SECTION_KIND_LIST
