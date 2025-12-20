/**
 * All String Templates - Simplified, single-pattern templates
 *
 * All templates use fixed styling and preprocessors handle loops/conditionals.
 */

import type {
  StringSectionTemplate,
  TemplateVars,
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
  SectionContent,
  RenderTheme,
} from '../../Domain'
import { escapeHtml, mapToHtml } from '../templateEvaluator'
import { CONTEXT_CLASS_NAMES, COMPONENT_CLASS_NAMES } from '../../../SemanticColorPalette/Domain'

const ctx = CONTEXT_CLASS_NAMES
const cmp = COMPONENT_CLASS_NAMES

// ============================================================================
// Header
// ============================================================================

export const headerTemplate: StringSectionTemplate = {
  id: 'header',
  type: 'header',
  template: `
<header class="${ctx.canvas}" style="padding: 1rem 0;">
  <div style="max-width: 980px; margin: 0 auto; padding: 0 2rem;">
    <nav style="display: flex; align-items: center; justify-content: space-between;">
      <div class="logo">
        <span class="scp-title" style="font-size: 1.25rem; font-weight: 700;">\${logoText}</span>
      </div>
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        \${linksHtml}
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="${cmp.actionQuiet}" style="padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer;">\${ctaLabel}</button>
      </div>
    </nav>
  </div>
</header>`.trim(),
}

export const preprocessHeader = (content: HeaderContent): TemplateVars => ({
  logoText: escapeHtml(content.logoText),
  linksHtml: mapToHtml(content.links, (link) =>
    `<a href="${escapeHtml(link.url)}" class="scp-body" style="text-decoration: none;">${escapeHtml(link.label)}</a>`
  ),
  ctaLabel: escapeHtml(content.ctaLabel ?? 'Log in'),
})

// ============================================================================
// Hero
// ============================================================================

export const heroTemplate: StringSectionTemplate = {
  id: 'hero',
  type: 'hero',
  template: `
<section class="${ctx.sectionTint}" style="padding: 5rem 2rem; text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <span class="scp-meta" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: var(--surface); border-radius: 9999px; font-size: 0.875rem;">
      <span style="width: 6px; height: 6px; background: var(--link-text); border-radius: 50%;"></span>
      \${badge}
    </span>
    <h1 class="scp-title" style="font-size: 3.5rem; font-weight: 700; line-height: 1.1; margin: 1rem 0;">
      \${title}
    </h1>
    <p class="scp-body" style="font-size: 1.25rem; max-width: 600px; margin: 0 auto 2rem;">\${subtitle}</p>
    <div style="display: flex; gap: 1rem; justify-content: center;">
      <button class="${cmp.action}" style="padding: 0.75rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; font-size: 1rem;">\${primaryCtaLabel}</button>
      <button class="${cmp.actionQuiet}" style="padding: 0.75rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 0.75rem;">&#9654;</span>
        \${secondaryCtaLabel}
      </button>
    </div>
    <div style="display: flex; gap: 3rem; margin-top: 3rem; justify-content: center;">
      \${statsHtml}
    </div>
  </div>
</section>`.trim(),
}

export const preprocessHero = (content: HeroContent): TemplateVars => ({
  badge: escapeHtml(content.badge ?? ''),
  title: escapeHtml(content.title),
  subtitle: escapeHtml(content.subtitle),
  primaryCtaLabel: escapeHtml(content.primaryCtaLabel),
  secondaryCtaLabel: escapeHtml(content.secondaryCtaLabel ?? ''),
  statsHtml: mapToHtml(content.stats ?? [], (stat) =>
    `<div style="text-align: center;">
      <span class="scp-title" style="font-size: 2rem; font-weight: 700;">${escapeHtml(stat.value)}</span>
      <span class="scp-meta" style="display: block; font-size: 0.875rem;">${escapeHtml(stat.label)}</span>
    </div>`
  ),
})

// ============================================================================
// Features
// ============================================================================

export const featuresTemplate: StringSectionTemplate = {
  id: 'features',
  type: 'features',
  template: `
<section class="${ctx.sectionNeutral}" style="padding: 5rem 2rem;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 3rem;">\${title}</h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;">
      \${featuresHtml}
    </div>
  </div>
</section>`.trim(),
}

export const preprocessFeatures = (content: FeaturesContent): TemplateVars => ({
  title: escapeHtml(content.title),
  featuresHtml: mapToHtml(content.features, (feature) =>
    `<div class="${cmp.card}" style="padding: 2rem; border-radius: 12px; text-align: center;">
      <h3 class="scp-title" style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">${escapeHtml(feature.title)}</h3>
      <p class="scp-body" style="font-size: 0.9rem; line-height: 1.6;">${escapeHtml(feature.description)}</p>
    </div>`
  ),
})

// ============================================================================
// Logos
// ============================================================================

export const logosTemplate: StringSectionTemplate = {
  id: 'logos',
  type: 'logos',
  template: `
<section class="${ctx.canvas}" style="padding: 3rem 2rem; text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <p class="scp-meta" style="font-size: 0.875rem; margin-bottom: 1.5rem;">\${label}</p>
    <div style="display: flex; justify-content: center; align-items: center; gap: 3rem; flex-wrap: wrap;">
      \${logosHtml}
    </div>
  </div>
</section>`.trim(),
}

export const preprocessLogos = (content: LogosContent): TemplateVars => ({
  label: escapeHtml(content.label),
  logosHtml: mapToHtml(content.logos, (logo) =>
    `<span class="scp-body" style="font-size: 1.25rem; font-weight: 700; opacity: 0.35;">${escapeHtml(logo)}</span>`
  ),
})

// ============================================================================
// How It Works
// ============================================================================

export const howItWorksTemplate: StringSectionTemplate = {
  id: 'howItWorks',
  type: 'howItWorks',
  template: `
<section class="${ctx.canvas}" style="padding: 5rem 2rem;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 3rem;">\${title}</h2>
    <div style="display: flex; align-items: flex-start; gap: 1.5rem;">
      \${stepsHtml}
    </div>
  </div>
</section>`.trim(),
}

export const preprocessHowItWorks = (content: HowItWorksContent): TemplateVars => ({
  title: escapeHtml(content.title),
  stepsHtml: mapToHtml(content.steps, (step, i) =>
    `<div style="flex: 1; text-align: center;">
      <span class="scp-link" style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: color-mix(in oklch, var(--link-text) 15%, transparent); font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem;">${i + 1}</span>
      <h3 class="scp-title" style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.75rem;">${escapeHtml(step.title)}</h3>
      <p class="scp-body" style="font-size: 0.85rem; line-height: 1.6; opacity: 0.7;">${escapeHtml(step.description)}</p>
    </div>`
  ),
})

// ============================================================================
// Testimonials
// ============================================================================

export const testimonialsTemplate: StringSectionTemplate = {
  id: 'testimonials',
  type: 'testimonials',
  template: `
<section class="${ctx.sectionNeutral}" style="padding: 5rem 2rem;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 3rem;">\${title}</h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
      \${testimonialsHtml}
    </div>
  </div>
</section>`.trim(),
}

export const preprocessTestimonials = (content: TestimonialsContent): TemplateVars => ({
  title: escapeHtml(content.title),
  testimonialsHtml: mapToHtml(content.testimonials, (t) =>
    `<div class="${cmp.card}" style="padding: 2rem; border-radius: 12px;">
      <p class="scp-body" style="font-size: 0.9rem; line-height: 1.65; font-style: italic; margin-bottom: 1.5rem;">${escapeHtml(t.quote)}</p>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--title), color-mix(in oklch, var(--title) 50%, var(--surface))); opacity: 0.6;"></div>
        <div>
          <span class="scp-title" style="font-size: 0.9rem; font-weight: 600; display: block;">${escapeHtml(t.authorName)}</span>
          <span class="scp-meta" style="font-size: 0.7rem;">${escapeHtml(t.authorRole)}</span>
        </div>
      </div>
    </div>`
  ),
})

// ============================================================================
// Pricing
// ============================================================================

export const pricingTemplate: StringSectionTemplate = {
  id: 'pricing',
  type: 'pricing',
  template: `
<section class="${ctx.canvas}" style="padding: 5rem 2rem; text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">\${title}</h2>
    <p class="scp-body" style="font-size: 0.9rem; margin-bottom: 2.5rem; opacity: 0.8;">\${subtitle}</p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; text-align: left;">
      \${plansHtml}
    </div>
  </div>
</section>`.trim(),
}

export const preprocessPricing = (content: PricingContent): TemplateVars => ({
  title: escapeHtml(content.title),
  subtitle: escapeHtml(content.subtitle ?? ''),
  plansHtml: mapToHtml(content.plans, (plan) => {
    const featuresHtml = mapToHtml(plan.features, (f) =>
      `<li style="padding: 0.625rem 0; font-size: 0.85rem; border-bottom: 1px solid var(--border);">${escapeHtml(f.text)}</li>`
    )
    return `
      <div class="${cmp.card}" style="padding: 2rem; border-radius: 12px; display: flex; flex-direction: column;">
        <h3 class="scp-title" style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.75rem;">${escapeHtml(plan.name)}</h3>
        <div style="margin-bottom: 1.5rem; display: flex; align-items: baseline; gap: 0.25rem;">
          <span class="scp-title" style="font-size: 2.5rem; font-weight: 700;">${escapeHtml(plan.price)}</span>
          <span class="scp-body" style="font-size: 0.8rem;">/${escapeHtml(plan.period ?? '')}</span>
        </div>
        <ul style="list-style: none; margin: 0 0 2rem; padding: 0; flex: 1;">${featuresHtml}</ul>
        <button class="${cmp.actionQuiet}" style="width: 100%; padding: 0.75rem 1.25rem; font-size: 0.9rem; border-radius: 6px; border: none; cursor: pointer;">${escapeHtml(plan.ctaLabel)}</button>
      </div>
    `
  }),
})

// ============================================================================
// FAQ
// ============================================================================

export const faqTemplate: StringSectionTemplate = {
  id: 'faq',
  type: 'faq',
  template: `
<section class="${ctx.sectionNeutral}" style="padding: 5rem 2rem;">
  <div style="max-width: 700px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 2.5rem;">\${title}</h2>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      \${itemsHtml}
    </div>
  </div>
</section>`.trim(),
}

export const preprocessFAQ = (content: FAQContent): TemplateVars => ({
  title: escapeHtml(content.title),
  itemsHtml: mapToHtml(content.items, (item) =>
    `<details class="${cmp.card}" style="padding: 1.25rem 1.5rem; border-radius: 8px;">
      <summary class="scp-title" style="cursor: pointer; font-size: 1.1rem; font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center;">
        ${escapeHtml(item.question)}
        <span style="font-size: 1.25rem; font-weight: 400; opacity: 0.5;">+</span>
      </summary>
      <p class="scp-body" style="margin: 1rem 0 0; font-size: 0.9rem; line-height: 1.65; opacity: 0.75;">${escapeHtml(item.answer)}</p>
    </details>`
  ),
})

// ============================================================================
// CTA
// ============================================================================

export const ctaTemplate: StringSectionTemplate = {
  id: 'cta',
  type: 'cta',
  template: `
<section class="${ctx.sectionContrast}" style="padding: 4.5rem 2rem; text-align: center;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem;">\${title}</h2>
    <p class="scp-body" style="font-size: 1rem; margin-bottom: 1.5rem; opacity: 0.8;">\${description}</p>
    <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem;">
      \${benefitsHtml}
    </div>
    <div style="display: flex; gap: 0.75rem; max-width: 420px; margin: 0 auto 1.25rem; padding: 0.625rem; border-radius: 8px;">
      <input type="email" placeholder="\${inputPlaceholder}" class="scp-body" style="flex: 1; padding: 0.625rem 1rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--body); font-size: 0.85rem;" />
      <button class="${cmp.action}" style="padding: 0.75rem 1.5rem; font-size: 0.9rem; white-space: nowrap; border-radius: 6px; border: none; cursor: pointer;">\${ctaLabel}</button>
    </div>
    <p class="scp-meta" style="font-size: 0.7rem;">\${note}</p>
  </div>
</section>`.trim(),
}

export const preprocessCTA = (content: CTAContent): TemplateVars => ({
  title: escapeHtml(content.title),
  description: escapeHtml(content.description),
  benefitsHtml: mapToHtml(content.benefits ?? [], (b) =>
    `<span class="scp-body" style="font-size: 0.8rem;">${escapeHtml(b)}</span>`
  ),
  inputPlaceholder: escapeHtml(content.inputPlaceholder ?? 'Enter your email'),
  ctaLabel: escapeHtml(content.ctaLabel),
  note: escapeHtml(content.note ?? ''),
})

// ============================================================================
// Footer
// ============================================================================

export const footerTemplate: StringSectionTemplate = {
  id: 'footer',
  type: 'footer',
  template: `
<footer class="${ctx.sectionNeutral}" style="padding: 3rem 2rem 2rem;">
  <div style="max-width: 980px; margin: 0 auto;">
    <div style="display: flex; gap: 4rem; margin-bottom: 2rem;">
      <div style="flex: 1;">
        <div class="scp-title" style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;">\${logoText}</div>
        <p class="scp-body" style="font-size: 0.8rem; opacity: 0.8;">\${tagline}</p>
      </div>
      <div style="display: flex; gap: 3rem;">
        \${columnsHtml}
      </div>
    </div>
    <div class="scp-divider" style="display: flex; justify-content: space-between; align-items: center; padding-top: 1.5rem; border-top: 1px solid var(--border);">
      <p class="scp-meta" style="font-size: 0.7rem;">\${copyright}</p>
      <div style="display: flex; gap: 1rem;">
        \${legalLinksHtml}
      </div>
    </div>
  </div>
</footer>`.trim(),
}

export const preprocessFooter = (content: FooterContent): TemplateVars => ({
  logoText: escapeHtml(content.logoText),
  tagline: escapeHtml(content.tagline),
  columnsHtml: mapToHtml(content.columns, (col) =>
    `<div style="display: flex; flex-direction: column; gap: 0.625rem;">
      <h4 class="scp-title" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">${escapeHtml(col.heading)}</h4>
      ${mapToHtml(col.links, (link) =>
        `<a href="${escapeHtml(link.url)}" class="scp-body" style="font-size: 0.75rem; text-decoration: none; opacity: 0.7;">${escapeHtml(link.label)}</a>`
      )}
    </div>`
  ),
  copyright: escapeHtml(content.copyright),
  legalLinksHtml: mapToHtml(content.legalLinks ?? [], (link) =>
    `<a href="${escapeHtml(link.url)}" class="scp-body" style="font-size: 0.7rem; text-decoration: none; opacity: 0.7;">${escapeHtml(link.label)}</a>`
  ),
})

// ============================================================================
// Template & Preprocessor Registry
// ============================================================================

export const STRING_TEMPLATES: Record<string, StringSectionTemplate> = {
  header: headerTemplate,
  hero: heroTemplate,
  features: featuresTemplate,
  logos: logosTemplate,
  howItWorks: howItWorksTemplate,
  testimonials: testimonialsTemplate,
  pricing: pricingTemplate,
  faq: faqTemplate,
  cta: ctaTemplate,
  footer: footerTemplate,
}

/**
 * Default templates as array for Site.templates
 */
export const DEFAULT_TEMPLATES: readonly StringSectionTemplate[] = [
  headerTemplate,
  heroTemplate,
  featuresTemplate,
  logosTemplate,
  howItWorksTemplate,
  testimonialsTemplate,
  pricingTemplate,
  faqTemplate,
  ctaTemplate,
  footerTemplate,
] as const

type PreprocessorFn = (content: SectionContent, theme: RenderTheme) => TemplateVars

export const PREPROCESSORS: Record<string, PreprocessorFn> = {
  header: (c) => preprocessHeader(c as HeaderContent),
  hero: (c) => preprocessHero(c as HeroContent),
  features: (c) => preprocessFeatures(c as FeaturesContent),
  logos: (c) => preprocessLogos(c as LogosContent),
  howItWorks: (c) => preprocessHowItWorks(c as HowItWorksContent),
  testimonials: (c) => preprocessTestimonials(c as TestimonialsContent),
  pricing: (c) => preprocessPricing(c as PricingContent),
  faq: (c) => preprocessFAQ(c as FAQContent),
  cta: (c) => preprocessCTA(c as CTAContent),
  footer: (c) => preprocessFooter(c as FooterContent),
}
