/**
 * Template Registry - All section templates
 */

import type { SectionType, SectionTemplate, SectionContent } from '../../Domain'

import { HeaderTemplate } from './HeaderTemplate'
import { HeroTemplate } from './HeroTemplate'
import { FeaturesTemplate } from './FeaturesTemplate'
import { LogosTemplate } from './LogosTemplate'
import { HowItWorksTemplate } from './HowItWorksTemplate'
import { TestimonialsTemplate } from './TestimonialsTemplate'
import { PricingTemplate } from './PricingTemplate'
import { FAQTemplate } from './FAQTemplate'
import { CTATemplate } from './CTATemplate'
import { FooterTemplate } from './FooterTemplate'

// ============================================================================
// Template Registry
// ============================================================================

type InternalTemplateRegistry = Record<SectionType, SectionTemplate<SectionContent>>

// Templates are type-safe internally but we need to cast for the registry
// because each template accepts a specific content type
const templates: InternalTemplateRegistry = {
  header: HeaderTemplate as SectionTemplate<SectionContent>,
  hero: HeroTemplate as SectionTemplate<SectionContent>,
  features: FeaturesTemplate as SectionTemplate<SectionContent>,
  logos: LogosTemplate as SectionTemplate<SectionContent>,
  howItWorks: HowItWorksTemplate as SectionTemplate<SectionContent>,
  testimonials: TestimonialsTemplate as SectionTemplate<SectionContent>,
  pricing: PricingTemplate as SectionTemplate<SectionContent>,
  faq: FAQTemplate as SectionTemplate<SectionContent>,
  cta: CTATemplate as SectionTemplate<SectionContent>,
  footer: FooterTemplate as SectionTemplate<SectionContent>,
}

/**
 * Get a template by section type
 */
export const getTemplate = (type: SectionType): SectionTemplate<SectionContent> => {
  const template = templates[type]
  if (!template) {
    throw new Error(`Unknown section type: ${type}`)
  }
  return template
}

/**
 * Get all available templates
 */
export const getAllTemplates = (): InternalTemplateRegistry => templates

// Re-export individual templates
export { HeaderTemplate } from './HeaderTemplate'
export { HeroTemplate } from './HeroTemplate'
export { FeaturesTemplate } from './FeaturesTemplate'
export { LogosTemplate } from './LogosTemplate'
export { HowItWorksTemplate } from './HowItWorksTemplate'
export { TestimonialsTemplate } from './TestimonialsTemplate'
export { PricingTemplate } from './PricingTemplate'
export { FAQTemplate } from './FAQTemplate'
export { CTATemplate } from './CTATemplate'
export { FooterTemplate } from './FooterTemplate'
