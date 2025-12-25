/**
 * Eta Templates - All section templates using Eta syntax
 *
 * Template context (it):
 * - content: Section-specific content object
 * - ctx: CONTEXT_CLASS_NAMES
 * - cmp: COMPONENT_CLASS_NAMES
 *
 * Note: Eta auto-escapes <%= %> output. Use <%~ %> for raw HTML.
 */

import type { SectionType } from '../../Domain'
import { CONTEXT_CLASS_NAMES, COMPONENT_CLASS_NAMES } from '../../../SemanticColorPalette/Domain'

const ctx = CONTEXT_CLASS_NAMES
const cmp = COMPONENT_CLASS_NAMES

export interface EtaTemplate {
  readonly id: string
  readonly type: SectionType
  readonly template: string
}

// ============================================================================
// Header
// ============================================================================

export const headerTemplate: EtaTemplate = {
  id: 'header',
  type: 'header',
  template: `
<header class="${ctx.canvas}" style="padding: var(--dt-spacing-md) 0;">
  <div style="max-width: 980px; margin: 0 auto; padding: 0 var(--dt-spacing-xl);">
    <nav style="display: flex; align-items: center; justify-content: space-between;">
      <div class="logo">
        <span class="scp-title" style="font-size: var(--dt-typography-title-size); font-weight: var(--dt-typography-title-weight);"><%= it.content.logoText %></span>
      </div>
      <div style="display: flex; gap: var(--dt-spacing-lg); align-items: center;">
        <% it.content.links.forEach(link => { %>
        <a href="<%= link.url %>" class="scp-body" style="text-decoration: none; font-size: var(--dt-typography-body-size);"><%= link.label %></a>
        <% }) %>
      </div>
      <div style="display: flex; gap: var(--dt-spacing-sm); align-items: center;">
        <button class="${cmp.actionQuiet}" style="padding: var(--dt-spacing-sm) var(--dt-spacing-md); border-radius: var(--dt-radius-md); border: none; cursor: pointer;"><%= it.content.ctaLabel || 'Log in' %></button>
      </div>
    </nav>
  </div>
</header>`.trim(),
}

// ============================================================================
// Hero
// ============================================================================

export const heroTemplate: EtaTemplate = {
  id: 'hero',
  type: 'hero',
  template: `
<section class="${ctx.sectionTint}" style="padding: var(--dt-spacing-3xl) var(--dt-spacing-xl); text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <% if (it.content.badge) { %>
    <span class="scp-meta" style="display: inline-flex; align-items: center; gap: var(--dt-spacing-sm); padding: var(--dt-spacing-xs) var(--dt-spacing-md); background: var(--surface); border-radius: var(--dt-radius-full); font-size: var(--dt-typography-meta-size);">
      <span style="width: 6px; height: 6px; background: var(--link-text); border-radius: 50%;"></span>
      <%= it.content.badge %>
    </span>
    <% } %>
    <h1 class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 2.5); font-weight: var(--dt-typography-title-weight); line-height: var(--dt-typography-title-line-height); margin: var(--dt-spacing-md) 0;">
      <%= it.content.title %>
    </h1>
    <p class="scp-body" style="font-size: var(--dt-typography-title-size); max-width: 600px; margin: 0 auto var(--dt-spacing-xl); line-height: var(--dt-typography-body-line-height);"><%= it.content.subtitle %></p>
    <div style="display: flex; gap: var(--dt-spacing-md); justify-content: center;">
      <button class="${cmp.action}" style="padding: var(--dt-spacing-md) var(--dt-spacing-lg); border-radius: var(--dt-radius-md); border: none; cursor: pointer; font-size: var(--dt-typography-body-size);"><%= it.content.primaryCtaLabel %></button>
      <% if (it.content.secondaryCtaLabel) { %>
      <button class="${cmp.actionQuiet}" style="padding: var(--dt-spacing-md) var(--dt-spacing-lg); border-radius: var(--dt-radius-md); border: none; cursor: pointer; font-size: var(--dt-typography-body-size); display: inline-flex; align-items: center; gap: var(--dt-spacing-sm);">
        <span style="font-size: var(--dt-typography-meta-size);">&#9654;</span>
        <%= it.content.secondaryCtaLabel %>
      </button>
      <% } %>
    </div>
    <% if (it.content.stats && it.content.stats.length > 0) { %>
    <div style="display: flex; gap: var(--dt-spacing-2xl); margin-top: var(--dt-spacing-2xl); justify-content: center;">
      <% it.content.stats.forEach(stat => { %>
      <div style="text-align: center;">
        <span class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 1.5); font-weight: var(--dt-typography-title-weight);"><%= stat.value %></span>
        <span class="scp-meta" style="display: block; font-size: var(--dt-typography-meta-size);"><%= stat.label %></span>
      </div>
      <% }) %>
    </div>
    <% } %>
  </div>
</section>`.trim(),
}

// ============================================================================
// Features
// ============================================================================

export const featuresTemplate: EtaTemplate = {
  id: 'features',
  type: 'features',
  template: `
<section class="${ctx.sectionNeutral}" style="padding: var(--dt-spacing-3xl) var(--dt-spacing-xl);">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 1.5); font-weight: var(--dt-typography-title-weight); text-align: center; margin-bottom: var(--dt-spacing-2xl);"><%= it.content.title %></h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--dt-spacing-xl);">
      <% it.content.features.forEach(feature => { %>
      <div class="${cmp.card}" style="padding: var(--dt-spacing-xl); border-radius: var(--dt-radius-lg); text-align: center;">
        <h3 class="scp-title" style="font-size: var(--dt-typography-title-size); font-weight: var(--dt-typography-title-weight); margin-bottom: var(--dt-spacing-md);"><%= feature.title %></h3>
        <p class="scp-body" style="font-size: var(--dt-typography-body-size); line-height: var(--dt-typography-body-line-height);"><%= feature.description %></p>
      </div>
      <% }) %>
    </div>
  </div>
</section>`.trim(),
}

// ============================================================================
// Logos
// ============================================================================

export const logosTemplate: EtaTemplate = {
  id: 'logos',
  type: 'logos',
  template: `
<section class="${ctx.canvas}" style="padding: var(--dt-spacing-2xl) var(--dt-spacing-xl); text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <p class="scp-meta" style="font-size: var(--dt-typography-meta-size); margin-bottom: var(--dt-spacing-lg);"><%= it.content.label %></p>
    <div style="display: flex; justify-content: center; align-items: center; gap: var(--dt-spacing-2xl); flex-wrap: wrap;">
      <% it.content.logos.forEach(logo => { %>
      <span class="scp-body" style="font-size: var(--dt-typography-title-size); font-weight: var(--dt-typography-title-weight); opacity: 0.35;"><%= logo %></span>
      <% }) %>
    </div>
  </div>
</section>`.trim(),
}

// ============================================================================
// How It Works
// ============================================================================

export const howItWorksTemplate: EtaTemplate = {
  id: 'howItWorks',
  type: 'howItWorks',
  template: `
<section class="${ctx.canvas}" style="padding: var(--dt-spacing-3xl) var(--dt-spacing-xl);">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 1.5); font-weight: var(--dt-typography-title-weight); text-align: center; margin-bottom: var(--dt-spacing-2xl);"><%= it.content.title %></h2>
    <div style="display: flex; align-items: flex-start; gap: var(--dt-spacing-lg);">
      <% it.content.steps.forEach((step, i) => { %>
      <div style="flex: 1; text-align: center;">
        <span class="scp-link" style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: var(--dt-radius-full); background: color-mix(in oklch, var(--link-text) 15%, transparent); font-size: var(--dt-typography-title-size); font-weight: var(--dt-typography-title-weight); margin-bottom: var(--dt-spacing-lg);"><%= i + 1 %></span>
        <h3 class="scp-title" style="font-size: var(--dt-typography-title-size); font-weight: var(--dt-typography-title-weight); margin-bottom: var(--dt-spacing-md);"><%= step.title %></h3>
        <p class="scp-body" style="font-size: var(--dt-typography-body-size); line-height: var(--dt-typography-body-line-height); opacity: 0.7;"><%= step.description %></p>
      </div>
      <% }) %>
    </div>
  </div>
</section>`.trim(),
}

// ============================================================================
// Testimonials
// ============================================================================

export const testimonialsTemplate: EtaTemplate = {
  id: 'testimonials',
  type: 'testimonials',
  template: `
<section class="${ctx.sectionNeutral}" style="padding: var(--dt-spacing-3xl) var(--dt-spacing-xl);">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 1.5); font-weight: var(--dt-typography-title-weight); text-align: center; margin-bottom: var(--dt-spacing-2xl);"><%= it.content.title %></h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--dt-spacing-lg);">
      <% it.content.testimonials.forEach(t => { %>
      <div class="${cmp.card}" style="padding: var(--dt-spacing-xl); border-radius: var(--dt-radius-lg);">
        <p class="scp-body" style="font-size: var(--dt-typography-body-size); line-height: var(--dt-typography-body-line-height); font-style: italic; margin-bottom: var(--dt-spacing-lg);"><%= t.quote %></p>
        <div style="display: flex; align-items: center; gap: var(--dt-spacing-md);">
          <div style="width: 40px; height: 40px; border-radius: var(--dt-radius-full); background: linear-gradient(135deg, var(--title), color-mix(in oklch, var(--title) 50%, var(--surface))); opacity: 0.6;"></div>
          <div>
            <span class="scp-title" style="font-size: var(--dt-typography-body-size); font-weight: var(--dt-typography-title-weight); display: block;"><%= t.authorName %></span>
            <span class="scp-meta" style="font-size: var(--dt-typography-meta-size);"><%= t.authorRole %></span>
          </div>
        </div>
      </div>
      <% }) %>
    </div>
  </div>
</section>`.trim(),
}

// ============================================================================
// Pricing
// ============================================================================

export const pricingTemplate: EtaTemplate = {
  id: 'pricing',
  type: 'pricing',
  template: `
<section class="${ctx.canvas}" style="padding: var(--dt-spacing-3xl) var(--dt-spacing-xl); text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 1.5); font-weight: var(--dt-typography-title-weight); margin-bottom: var(--dt-spacing-sm);"><%= it.content.title %></h2>
    <% if (it.content.subtitle) { %>
    <p class="scp-body" style="font-size: var(--dt-typography-body-size); margin-bottom: var(--dt-spacing-2xl); opacity: 0.8;"><%= it.content.subtitle %></p>
    <% } %>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--dt-spacing-lg); text-align: left;">
      <% it.content.plans.forEach(plan => { %>
      <div class="${cmp.card}" style="padding: var(--dt-spacing-xl); border-radius: var(--dt-radius-lg); display: flex; flex-direction: column;">
        <h3 class="scp-title" style="font-size: var(--dt-typography-title-size); font-weight: var(--dt-typography-title-weight); margin-bottom: var(--dt-spacing-md);"><%= plan.name %></h3>
        <div style="margin-bottom: var(--dt-spacing-lg); display: flex; align-items: baseline; gap: var(--dt-spacing-xs);">
          <span class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 2); font-weight: var(--dt-typography-title-weight);"><%= plan.price %></span>
          <% if (plan.period) { %>
          <span class="scp-body" style="font-size: var(--dt-typography-meta-size);">/<%= plan.period %></span>
          <% } %>
        </div>
        <ul style="list-style: none; margin: 0 0 var(--dt-spacing-xl); padding: 0; flex: 1;">
          <% plan.features.forEach(f => { %>
          <li style="padding: var(--dt-spacing-sm) 0; font-size: var(--dt-typography-body-size); border-bottom: 1px solid var(--border);"><%= f.text %></li>
          <% }) %>
        </ul>
        <button class="${cmp.actionQuiet}" style="width: 100%; padding: var(--dt-spacing-md) var(--dt-spacing-lg); font-size: var(--dt-typography-body-size); border-radius: var(--dt-radius-md); border: none; cursor: pointer;"><%= plan.ctaLabel %></button>
      </div>
      <% }) %>
    </div>
  </div>
</section>`.trim(),
}

// ============================================================================
// FAQ
// ============================================================================

export const faqTemplate: EtaTemplate = {
  id: 'faq',
  type: 'faq',
  template: `
<section class="${ctx.sectionNeutral}" style="padding: var(--dt-spacing-3xl) var(--dt-spacing-xl);">
  <div style="max-width: 700px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 1.5); font-weight: var(--dt-typography-title-weight); text-align: center; margin-bottom: var(--dt-spacing-2xl);"><%= it.content.title %></h2>
    <div style="display: flex; flex-direction: column; gap: var(--dt-spacing-md);">
      <% it.content.items.forEach(item => { %>
      <details class="${cmp.card}" style="padding: var(--dt-spacing-lg); border-radius: var(--dt-radius-md);">
        <summary class="scp-title" style="cursor: pointer; font-size: var(--dt-typography-title-size); font-weight: var(--dt-typography-title-weight); list-style: none; display: flex; justify-content: space-between; align-items: center;">
          <%= item.question %>
          <span style="font-size: var(--dt-typography-title-size); font-weight: 400; opacity: 0.5;">+</span>
        </summary>
        <p class="scp-body" style="margin: var(--dt-spacing-md) 0 0; font-size: var(--dt-typography-body-size); line-height: var(--dt-typography-body-line-height); opacity: 0.75;"><%= item.answer %></p>
      </details>
      <% }) %>
    </div>
  </div>
</section>`.trim(),
}

// ============================================================================
// CTA
// ============================================================================

export const ctaTemplate: EtaTemplate = {
  id: 'cta',
  type: 'cta',
  template: `
<section class="${ctx.sectionContrast}" style="padding: var(--dt-spacing-3xl) var(--dt-spacing-xl); text-align: center;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: calc(var(--dt-typography-title-size) * 1.75); font-weight: var(--dt-typography-title-weight); margin-bottom: var(--dt-spacing-md);"><%= it.content.title %></h2>
    <p class="scp-body" style="font-size: var(--dt-typography-body-size); margin-bottom: var(--dt-spacing-lg); opacity: 0.8;"><%= it.content.description %></p>
    <% if (it.content.benefits && it.content.benefits.length > 0) { %>
    <div style="display: flex; justify-content: center; gap: var(--dt-spacing-xl); margin-bottom: var(--dt-spacing-xl);">
      <% it.content.benefits.forEach(b => { %>
      <span class="scp-body" style="font-size: var(--dt-typography-meta-size);"><%= b %></span>
      <% }) %>
    </div>
    <% } %>
    <div style="display: flex; gap: var(--dt-spacing-md); max-width: 420px; margin: 0 auto var(--dt-spacing-lg); padding: var(--dt-spacing-sm); border-radius: var(--dt-radius-md);">
      <input type="email" placeholder="<%= it.content.inputPlaceholder || 'Enter your email' %>" class="scp-body" style="flex: 1; padding: var(--dt-spacing-sm) var(--dt-spacing-md); border: 1px solid var(--border); border-radius: var(--dt-radius-md); background: var(--surface); color: var(--body); font-size: var(--dt-typography-body-size);" />
      <button class="${cmp.action}" style="padding: var(--dt-spacing-md) var(--dt-spacing-lg); font-size: var(--dt-typography-body-size); white-space: nowrap; border-radius: var(--dt-radius-md); border: none; cursor: pointer;"><%= it.content.ctaLabel %></button>
    </div>
    <% if (it.content.note) { %>
    <p class="scp-meta" style="font-size: var(--dt-typography-meta-size);"><%= it.content.note %></p>
    <% } %>
  </div>
</section>`.trim(),
}

// ============================================================================
// Footer
// ============================================================================

export const footerTemplate: EtaTemplate = {
  id: 'footer',
  type: 'footer',
  template: `
<footer class="${ctx.sectionNeutral}" style="padding: var(--dt-spacing-2xl) var(--dt-spacing-xl) var(--dt-spacing-xl);">
  <div style="max-width: 980px; margin: 0 auto;">
    <div style="display: flex; gap: var(--dt-spacing-3xl); margin-bottom: var(--dt-spacing-xl);">
      <div style="flex: 1;">
        <div class="scp-title" style="font-size: var(--dt-typography-title-size); font-weight: var(--dt-typography-title-weight); margin-bottom: var(--dt-spacing-sm);"><%= it.content.logoText %></div>
        <p class="scp-body" style="font-size: var(--dt-typography-meta-size); opacity: 0.8;"><%= it.content.tagline %></p>
      </div>
      <div style="display: flex; gap: var(--dt-spacing-2xl);">
        <% it.content.columns.forEach(col => { %>
        <div style="display: flex; flex-direction: column; gap: var(--dt-spacing-sm);">
          <h4 class="scp-title" style="font-size: var(--dt-typography-meta-size); font-weight: var(--dt-typography-title-weight); text-transform: uppercase; margin-bottom: var(--dt-spacing-sm);"><%= col.heading %></h4>
          <% col.links.forEach(link => { %>
          <a href="<%= link.url %>" class="scp-body" style="font-size: var(--dt-typography-meta-size); text-decoration: none; opacity: 0.7;"><%= link.label %></a>
          <% }) %>
        </div>
        <% }) %>
      </div>
    </div>
    <div class="scp-divider" style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--dt-spacing-lg); border-top: 1px solid var(--border);">
      <p class="scp-meta" style="font-size: var(--dt-typography-meta-size);"><%= it.content.copyright %></p>
      <% if (it.content.legalLinks && it.content.legalLinks.length > 0) { %>
      <div style="display: flex; gap: var(--dt-spacing-md);">
        <% it.content.legalLinks.forEach(link => { %>
        <a href="<%= link.url %>" class="scp-body" style="font-size: var(--dt-typography-meta-size); text-decoration: none; opacity: 0.7;"><%= link.label %></a>
        <% }) %>
      </div>
      <% } %>
    </div>
  </div>
</footer>`.trim(),
}

// ============================================================================
// Template Registry
// ============================================================================

export const ETA_TEMPLATES: Record<SectionType, EtaTemplate> = {
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

export const getEtaTemplate = (type: SectionType): EtaTemplate => {
  const template = ETA_TEMPLATES[type]
  if (!template) {
    throw new Error(`Unknown section type: ${type}`)
  }
  return template
}
