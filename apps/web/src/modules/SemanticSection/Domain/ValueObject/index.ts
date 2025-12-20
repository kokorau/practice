// Section
export type { SectionType, Section, Page } from './Section'
export { SECTION_TYPES, SECTION_TYPE_LIST, $Section, $Page } from './Section'

// Content
export type {
  LinkItem,
  StatItem,
  FeatureItem,
  TestimonialItem,
  PricingFeature,
  PricingPlan,
  FAQItem,
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
  SectionContentMap,
  SectionContent,
  PageContents,
} from './SectionContent'

// RenderTheme
export type {
  RoundedSize,
  SpacingSize,
  StylePack,
  RenderTheme,
} from './RenderTheme'
export { DEFAULT_STYLE_PACK, $StylePack } from './RenderTheme'

// Template
export type {
  LegacySectionTemplate,
  StringSectionTemplate,
  SectionTemplate,
  TemplateVars,
  TemplateRegistry,
} from './SectionTemplate'
export { isStringTemplate, isLegacyTemplate } from './SectionTemplate'

// Site
export type { SiteMeta, Site } from './Site'
export { $Site } from './Site'

// Schema
export type {
  PrimitiveFieldType,
  FieldType,
  FieldConstraints,
  TextFieldSchema,
  ListFieldSchema,
  ObjectFieldSchema,
  FieldSchema,
  SectionSchema,
} from './SectionSchema'
export { $FieldSchema } from './SectionSchema'

// Validation
export type { ValidationError, ValidationResult } from './ContentValidator'
export { validateContent, formatErrors, hasErrorAt, getErrorsAt } from './ContentValidator'
