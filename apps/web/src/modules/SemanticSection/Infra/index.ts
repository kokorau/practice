// Renderer
export { renderSection, renderPage, generateCSS } from './SectionRenderer'
export type { RenderPageOptions } from './SectionRenderer'

// Templates
export { getTemplate, getAllTemplates } from './templates'
export {
  HeaderTemplate,
  HeroTemplate,
  FeaturesTemplate,
  LogosTemplate,
  HowItWorksTemplate,
  TestimonialsTemplate,
  PricingTemplate,
  FAQTemplate,
  CTATemplate,
  FooterTemplate,
} from './templates'

// Default Content
export { getDefaultContent, getAllDefaultContents } from './getDefaultContent'

// Template Evaluator
export { evaluateTemplate, escapeHtml, mapToHtml, when, ifElse } from './templateEvaluator'

// String Templates
export { getPreprocessor, hasStringTemplate } from './stringTemplates'
