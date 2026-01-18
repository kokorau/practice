/**
 * SectionContent - Content types for each section
 *
 * Each section type has its corresponding content structure.
 */

import type { SectionType } from './Section'

// ============================================================================
// Common Content Types
// ============================================================================

export interface LinkItem {
  readonly label: string
  readonly url: string
}

export interface StatItem {
  readonly value: string
  readonly label: string
}

export interface FeatureItem {
  readonly title: string
  readonly description: string
}

export interface TestimonialItem {
  readonly quote: string
  readonly authorName: string
  readonly authorRole: string
}

export interface PricingFeature {
  readonly text: string
}

export interface PricingPlan {
  readonly name: string
  readonly price: string
  readonly period?: string
  readonly features: readonly PricingFeature[]
  readonly ctaLabel: string
  readonly isFeatured?: boolean
  readonly badge?: string
}

export interface FAQItem {
  readonly question: string
  readonly answer: string
}

// ============================================================================
// Section Content Types
// ============================================================================

export interface HeaderContent {
  readonly logoText: string
  readonly logoUrl?: string
  readonly links: readonly LinkItem[]
  readonly ctaLabel?: string
  readonly ctaUrl?: string
}

export interface HeroContent {
  readonly badge?: string
  readonly title: string
  readonly highlight?: string
  readonly subtitle: string
  readonly primaryCtaLabel: string
  readonly secondaryCtaLabel?: string
  readonly stats?: readonly StatItem[]
}

export interface FeaturesContent {
  readonly title: string
  readonly features: readonly FeatureItem[]
}

export interface LogosContent {
  readonly label: string
  readonly logos: readonly string[]
}

export interface HowItWorksContent {
  readonly title: string
  readonly steps: readonly FeatureItem[]
}

export interface TestimonialsContent {
  readonly title: string
  readonly testimonials: readonly TestimonialItem[]
}

export interface PricingContent {
  readonly title: string
  readonly subtitle?: string
  readonly plans: readonly PricingPlan[]
}

export interface FAQContent {
  readonly title: string
  readonly items: readonly FAQItem[]
}

export interface CTAContent {
  readonly title: string
  readonly description: string
  readonly benefits?: readonly string[]
  readonly inputPlaceholder?: string
  readonly ctaLabel: string
  readonly note?: string
}

export interface FooterContent {
  readonly logoText: string
  readonly tagline: string
  readonly columns: readonly {
    readonly heading: string
    readonly links: readonly LinkItem[]
  }[]
  readonly copyright: string
  readonly legalLinks?: readonly LinkItem[]
}

// ============================================================================
// Content Type Map
// ============================================================================

export interface SectionContentMap {
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

export type SectionContent = SectionContentMap[SectionType]

// ============================================================================
// Page Contents
// ============================================================================

/**
 * Map of section ID to its content
 */
export type PageContents = Readonly<Record<string, SectionContent>>
