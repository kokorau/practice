// SectionSemantic (abstract type for Site)
export type { SectionSemantic } from './SectionSemantic'

// Section
export type {
  SectionKind,
  Section,
  Page,
  HeaderSection,
  HeroSection,
  FeaturesSection,
  LogosSection,
  HowItWorksSection,
  TestimonialsSection,
  PricingSection,
  FAQSection,
  CTASection,
  FooterSection,
  SectionKindContentMap,
  // Legacy (deprecated)
  SectionType,
} from './Section'
export {
  SECTION_KINDS,
  SECTION_KIND_LIST,
  $Section,
  $Page,
  // Legacy (deprecated)
  SECTION_TYPES,
  SECTION_TYPE_LIST,
} from './Section'

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

// Template
export type {
  StringSectionTemplate,
  SectionTemplate,
  TemplateVars,
  TemplateRegistry,
} from './SectionTemplate'
export { isStringTemplate } from './SectionTemplate'

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

// RenderTheme
export type { RenderTheme } from './RenderTheme'
export { DEFAULT_TOKENS } from './RenderTheme'
