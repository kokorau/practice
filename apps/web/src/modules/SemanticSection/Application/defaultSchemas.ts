/**
 * Default Schemas - Schema definitions for built-in section types
 *
 * These schemas define the content structure for each section type.
 */

import type { SectionSchema, ObjectFieldSchema, SectionType } from '../Domain'

// Use string literals to avoid circular dependency with Domain
// (Site.ts imports DEFAULT_SCHEMAS, which would import SECTION_TYPES from Domain)

// ============================================================================
// Reusable Field Schemas
// ============================================================================

/** Link item schema (label + url) */
const linkItemSchema: ObjectFieldSchema = {
  key: 'item',
  type: 'object',
  fields: [
    { key: 'label', type: 'text', label: 'Label', constraints: { maxLength: 30 } },
    { key: 'url', type: 'url', label: 'URL' },
  ],
}

/** Stat item schema (value + label) */
const statItemSchema: ObjectFieldSchema = {
  key: 'item',
  type: 'object',
  fields: [
    {
      key: 'value',
      type: 'text',
      label: 'Value',
      constraints: { maxLength: 10 },
      aiHint: 'A short numeric or text value (e.g., "10K+", "99%", "4.9")',
    },
    {
      key: 'label',
      type: 'text',
      label: 'Label',
      constraints: { maxLength: 20 },
      aiHint: 'Brief label describing the stat',
    },
  ],
}

/** Feature item schema (title + description) */
const featureItemSchema: ObjectFieldSchema = {
  key: 'item',
  type: 'object',
  fields: [
    {
      key: 'title',
      type: 'text',
      label: 'Title',
      constraints: { maxLength: 40 },
      aiHint: 'Concise feature name',
    },
    {
      key: 'description',
      type: 'text',
      label: 'Description',
      constraints: { maxLength: 120 },
      aiHint: 'Brief explanation of the feature benefit',
    },
  ],
}

/** Testimonial item schema */
const testimonialItemSchema: ObjectFieldSchema = {
  key: 'item',
  type: 'object',
  fields: [
    {
      key: 'quote',
      type: 'text',
      label: 'Quote',
      constraints: { maxLength: 200 },
      aiHint: 'Customer testimonial quote',
    },
    {
      key: 'authorName',
      type: 'text',
      label: 'Author Name',
      constraints: { maxLength: 40 },
    },
    {
      key: 'authorRole',
      type: 'text',
      label: 'Author Role',
      constraints: { maxLength: 50 },
      aiHint: 'Job title and company',
    },
  ],
}

/** Pricing feature schema */
const pricingFeatureSchema: ObjectFieldSchema = {
  key: 'item',
  type: 'object',
  fields: [
    {
      key: 'text',
      type: 'text',
      label: 'Feature',
      constraints: { maxLength: 50 },
    },
  ],
}

/** Pricing plan schema */
const pricingPlanSchema: ObjectFieldSchema = {
  key: 'item',
  type: 'object',
  fields: [
    { key: 'name', type: 'text', label: 'Plan Name', constraints: { maxLength: 20 } },
    {
      key: 'price',
      type: 'text',
      label: 'Price',
      constraints: { maxLength: 15 },
      aiHint: 'Price with currency (e.g., "$12", "Free", "Custom")',
    },
    { key: 'period', type: 'text', label: 'Period', required: false, constraints: { maxLength: 10 } },
    {
      key: 'features',
      type: 'list',
      label: 'Features',
      itemSchema: pricingFeatureSchema,
      constraints: { minItems: 2, maxItems: 8 },
    },
    { key: 'ctaLabel', type: 'text', label: 'CTA Label', constraints: { maxLength: 20 } },
    { key: 'isFeatured', type: 'text', label: 'Is Featured', required: false },
    { key: 'badge', type: 'text', label: 'Badge', required: false, constraints: { maxLength: 15 } },
  ],
}

/** FAQ item schema */
const faqItemSchema: ObjectFieldSchema = {
  key: 'item',
  type: 'object',
  fields: [
    {
      key: 'question',
      type: 'text',
      label: 'Question',
      constraints: { maxLength: 100 },
    },
    {
      key: 'answer',
      type: 'text',
      label: 'Answer',
      constraints: { maxLength: 300 },
    },
  ],
}

/** Footer column schema */
const footerColumnSchema: ObjectFieldSchema = {
  key: 'item',
  type: 'object',
  fields: [
    { key: 'heading', type: 'text', label: 'Heading', constraints: { maxLength: 20 } },
    {
      key: 'links',
      type: 'list',
      label: 'Links',
      itemSchema: linkItemSchema,
      constraints: { minItems: 1, maxItems: 6 },
    },
  ],
}

// ============================================================================
// Section Schemas
// ============================================================================

const headerSchema: SectionSchema = {
  id: 'header',
  type: 'header' satisfies SectionType,
  name: 'Header',
  description: 'Site header with logo, navigation, and CTA',
  fields: [
    {
      key: 'logoText',
      type: 'text',
      label: 'Logo Text',
      constraints: { maxLength: 20 },
      aiHint: 'Brand name or short logo text',
    },
    { key: 'logoUrl', type: 'url', label: 'Logo URL', required: false },
    {
      key: 'links',
      type: 'list',
      label: 'Navigation Links',
      itemSchema: linkItemSchema,
      constraints: { minItems: 1, maxItems: 6 },
    },
    { key: 'ctaLabel', type: 'text', label: 'CTA Label', required: false, constraints: { maxLength: 15 } },
    { key: 'ctaUrl', type: 'url', label: 'CTA URL', required: false },
  ],
}

const heroSchema: SectionSchema = {
  id: 'hero',
  type: 'hero' satisfies SectionType,
  name: 'Hero',
  description: 'Main hero section with headline, subtitle, CTAs, and stats',
  fields: [
    {
      key: 'badge',
      type: 'text',
      label: 'Badge',
      required: false,
      constraints: { maxLength: 30 },
      aiHint: 'Short announcement or status badge',
    },
    {
      key: 'title',
      type: 'text',
      label: 'Title',
      constraints: { maxLength: 60 },
      aiHint: 'Main headline - impactful and concise',
    },
    {
      key: 'highlight',
      type: 'text',
      label: 'Highlight',
      required: false,
      constraints: { maxLength: 30 },
      aiHint: 'Part of title to emphasize (should be substring of title)',
    },
    {
      key: 'subtitle',
      type: 'text',
      label: 'Subtitle',
      constraints: { maxLength: 150 },
      aiHint: 'Supporting description that expands on the headline',
    },
    {
      key: 'primaryCtaLabel',
      type: 'text',
      label: 'Primary CTA',
      constraints: { maxLength: 20 },
      aiHint: 'Main action button text',
    },
    {
      key: 'secondaryCtaLabel',
      type: 'text',
      label: 'Secondary CTA',
      required: false,
      constraints: { maxLength: 20 },
    },
    {
      key: 'stats',
      type: 'list',
      label: 'Stats',
      required: false,
      itemSchema: statItemSchema,
      constraints: { minItems: 2, maxItems: 4 },
    },
  ],
}

const featuresSchema: SectionSchema = {
  id: 'features',
  type: 'features' satisfies SectionType,
  name: 'Features',
  description: 'Feature highlights with title and description',
  fields: [
    {
      key: 'title',
      type: 'text',
      label: 'Section Title',
      constraints: { maxLength: 40 },
    },
    {
      key: 'features',
      type: 'list',
      label: 'Features',
      itemSchema: featureItemSchema,
      constraints: { minItems: 2, maxItems: 6 },
      aiHint: 'List of key features or benefits',
    },
  ],
}

const logosSchema: SectionSchema = {
  id: 'logos',
  type: 'logos' satisfies SectionType,
  name: 'Logos',
  description: 'Trust badges / client logos section',
  fields: [
    {
      key: 'label',
      type: 'text',
      label: 'Label',
      constraints: { maxLength: 40 },
      aiHint: 'Text above logos (e.g., "Trusted by teams at")',
    },
    {
      key: 'logos',
      type: 'list',
      label: 'Company Names',
      itemSchema: { key: 'name', type: 'text', constraints: { maxLength: 20 } },
      constraints: { minItems: 3, maxItems: 8 },
      aiHint: 'Company or brand names',
    },
  ],
}

const howItWorksSchema: SectionSchema = {
  id: 'howItWorks',
  type: 'howItWorks' satisfies SectionType,
  name: 'How It Works',
  description: 'Step-by-step process explanation',
  fields: [
    {
      key: 'title',
      type: 'text',
      label: 'Section Title',
      constraints: { maxLength: 40 },
    },
    {
      key: 'steps',
      type: 'list',
      label: 'Steps',
      itemSchema: featureItemSchema,
      constraints: { minItems: 2, maxItems: 5 },
      aiHint: 'Sequential steps explaining the process',
    },
  ],
}

const testimonialsSchema: SectionSchema = {
  id: 'testimonials',
  type: 'testimonials' satisfies SectionType,
  name: 'Testimonials',
  description: 'Customer testimonials and social proof',
  fields: [
    {
      key: 'title',
      type: 'text',
      label: 'Section Title',
      constraints: { maxLength: 50 },
    },
    {
      key: 'testimonials',
      type: 'list',
      label: 'Testimonials',
      itemSchema: testimonialItemSchema,
      constraints: { minItems: 1, maxItems: 6 },
    },
  ],
}

const pricingSchema: SectionSchema = {
  id: 'pricing',
  type: 'pricing' satisfies SectionType,
  name: 'Pricing',
  description: 'Pricing plans and comparison',
  fields: [
    {
      key: 'title',
      type: 'text',
      label: 'Section Title',
      constraints: { maxLength: 40 },
    },
    {
      key: 'subtitle',
      type: 'text',
      label: 'Subtitle',
      required: false,
      constraints: { maxLength: 80 },
    },
    {
      key: 'plans',
      type: 'list',
      label: 'Pricing Plans',
      itemSchema: pricingPlanSchema,
      constraints: { minItems: 1, maxItems: 4 },
    },
  ],
}

const faqSchema: SectionSchema = {
  id: 'faq',
  type: 'faq' satisfies SectionType,
  name: 'FAQ',
  description: 'Frequently asked questions',
  fields: [
    {
      key: 'title',
      type: 'text',
      label: 'Section Title',
      constraints: { maxLength: 50 },
    },
    {
      key: 'items',
      type: 'list',
      label: 'Questions',
      itemSchema: faqItemSchema,
      constraints: { minItems: 2, maxItems: 10 },
    },
  ],
}

const ctaSchema: SectionSchema = {
  id: 'cta',
  type: 'cta' satisfies SectionType,
  name: 'CTA',
  description: 'Call-to-action section with signup form',
  fields: [
    {
      key: 'title',
      type: 'text',
      label: 'Title',
      constraints: { maxLength: 50 },
      aiHint: 'Compelling call-to-action headline',
    },
    {
      key: 'description',
      type: 'text',
      label: 'Description',
      constraints: { maxLength: 120 },
    },
    {
      key: 'benefits',
      type: 'list',
      label: 'Benefits',
      required: false,
      itemSchema: { key: 'benefit', type: 'text', constraints: { maxLength: 30 } },
      constraints: { minItems: 2, maxItems: 4 },
      aiHint: 'Short benefit statements (e.g., "Free forever", "No credit card")',
    },
    {
      key: 'inputPlaceholder',
      type: 'text',
      label: 'Input Placeholder',
      required: false,
      constraints: { maxLength: 30 },
    },
    {
      key: 'ctaLabel',
      type: 'text',
      label: 'CTA Button',
      constraints: { maxLength: 20 },
    },
    {
      key: 'note',
      type: 'text',
      label: 'Note',
      required: false,
      constraints: { maxLength: 80 },
      aiHint: 'Fine print or disclaimer',
    },
  ],
}

const footerSchema: SectionSchema = {
  id: 'footer',
  type: 'footer' satisfies SectionType,
  name: 'Footer',
  description: 'Site footer with navigation and legal links',
  fields: [
    {
      key: 'logoText',
      type: 'text',
      label: 'Logo Text',
      constraints: { maxLength: 20 },
    },
    {
      key: 'tagline',
      type: 'text',
      label: 'Tagline',
      constraints: { maxLength: 50 },
    },
    {
      key: 'columns',
      type: 'list',
      label: 'Link Columns',
      itemSchema: footerColumnSchema,
      constraints: { minItems: 1, maxItems: 4 },
    },
    {
      key: 'copyright',
      type: 'text',
      label: 'Copyright',
      constraints: { maxLength: 60 },
    },
    {
      key: 'legalLinks',
      type: 'list',
      label: 'Legal Links',
      required: false,
      itemSchema: linkItemSchema,
      constraints: { maxItems: 4 },
    },
  ],
}

// ============================================================================
// Schema Registry
// ============================================================================

/**
 * All default section schemas
 */
export const DEFAULT_SCHEMAS: readonly SectionSchema[] = [
  headerSchema,
  heroSchema,
  featuresSchema,
  logosSchema,
  howItWorksSchema,
  testimonialsSchema,
  pricingSchema,
  faqSchema,
  ctaSchema,
  footerSchema,
] as const

/**
 * Get schema by section type
 */
export const getSchemaByType = (type: string): SectionSchema | undefined =>
  DEFAULT_SCHEMAS.find((s) => s.type === type)

/**
 * Get schema by ID
 */
export const getSchemaById = (id: string): SectionSchema | undefined =>
  DEFAULT_SCHEMAS.find((s) => s.id === id)
