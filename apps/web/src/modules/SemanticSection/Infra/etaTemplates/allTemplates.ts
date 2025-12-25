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
<header class="${ctx.canvas}" style="padding: 1rem 0;">
  <div style="max-width: 980px; margin: 0 auto; padding: 0 2rem;">
    <nav style="display: flex; align-items: center; justify-content: space-between;">
      <div class="logo">
        <span class="scp-title" style="font-size: 1.25rem; font-weight: 700;"><%= it.content.logoText %></span>
      </div>
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <% it.content.links.forEach(link => { %>
        <a href="<%= link.url %>" class="scp-body" style="text-decoration: none;"><%= link.label %></a>
        <% }) %>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="${cmp.actionQuiet}" style="padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer;"><%= it.content.ctaLabel || 'Log in' %></button>
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
<section class="${ctx.sectionTint}" style="padding: 5rem 2rem; text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <% if (it.content.badge) { %>
    <span class="scp-meta" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: var(--surface); border-radius: 9999px; font-size: 0.875rem;">
      <span style="width: 6px; height: 6px; background: var(--link-text); border-radius: 50%;"></span>
      <%= it.content.badge %>
    </span>
    <% } %>
    <h1 class="scp-title" style="font-size: 3.5rem; font-weight: 700; line-height: 1.1; margin: 1rem 0;">
      <%= it.content.title %>
    </h1>
    <p class="scp-body" style="font-size: 1.25rem; max-width: 600px; margin: 0 auto 2rem;"><%= it.content.subtitle %></p>
    <div style="display: flex; gap: 1rem; justify-content: center;">
      <button class="${cmp.action}" style="padding: 0.75rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; font-size: 1rem;"><%= it.content.primaryCtaLabel %></button>
      <% if (it.content.secondaryCtaLabel) { %>
      <button class="${cmp.actionQuiet}" style="padding: 0.75rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 0.75rem;">&#9654;</span>
        <%= it.content.secondaryCtaLabel %>
      </button>
      <% } %>
    </div>
    <% if (it.content.stats && it.content.stats.length > 0) { %>
    <div style="display: flex; gap: 3rem; margin-top: 3rem; justify-content: center;">
      <% it.content.stats.forEach(stat => { %>
      <div style="text-align: center;">
        <span class="scp-title" style="font-size: 2rem; font-weight: 700;"><%= stat.value %></span>
        <span class="scp-meta" style="display: block; font-size: 0.875rem;"><%= stat.label %></span>
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
<section class="${ctx.sectionNeutral}" style="padding: 5rem 2rem;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 3rem;"><%= it.content.title %></h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;">
      <% it.content.features.forEach(feature => { %>
      <div class="${cmp.card}" style="padding: 2rem; border-radius: 12px; text-align: center;">
        <h3 class="scp-title" style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;"><%= feature.title %></h3>
        <p class="scp-body" style="font-size: 0.9rem; line-height: 1.6;"><%= feature.description %></p>
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
<section class="${ctx.canvas}" style="padding: 3rem 2rem; text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <p class="scp-meta" style="font-size: 0.875rem; margin-bottom: 1.5rem;"><%= it.content.label %></p>
    <div style="display: flex; justify-content: center; align-items: center; gap: 3rem; flex-wrap: wrap;">
      <% it.content.logos.forEach(logo => { %>
      <span class="scp-body" style="font-size: 1.25rem; font-weight: 700; opacity: 0.35;"><%= logo %></span>
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
<section class="${ctx.canvas}" style="padding: 5rem 2rem;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 3rem;"><%= it.content.title %></h2>
    <div style="display: flex; align-items: flex-start; gap: 1.5rem;">
      <% it.content.steps.forEach((step, i) => { %>
      <div style="flex: 1; text-align: center;">
        <span class="scp-link" style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: color-mix(in oklch, var(--link-text) 15%, transparent); font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem;"><%= i + 1 %></span>
        <h3 class="scp-title" style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.75rem;"><%= step.title %></h3>
        <p class="scp-body" style="font-size: 0.85rem; line-height: 1.6; opacity: 0.7;"><%= step.description %></p>
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
<section class="${ctx.sectionNeutral}" style="padding: 5rem 2rem;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 3rem;"><%= it.content.title %></h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
      <% it.content.testimonials.forEach(t => { %>
      <div class="${cmp.card}" style="padding: 2rem; border-radius: 12px;">
        <p class="scp-body" style="font-size: 0.9rem; line-height: 1.65; font-style: italic; margin-bottom: 1.5rem;"><%= t.quote %></p>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--title), color-mix(in oklch, var(--title) 50%, var(--surface))); opacity: 0.6;"></div>
          <div>
            <span class="scp-title" style="font-size: 0.9rem; font-weight: 600; display: block;"><%= t.authorName %></span>
            <span class="scp-meta" style="font-size: 0.7rem;"><%= t.authorRole %></span>
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
<section class="${ctx.canvas}" style="padding: 5rem 2rem; text-align: center;">
  <div style="max-width: 980px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;"><%= it.content.title %></h2>
    <% if (it.content.subtitle) { %>
    <p class="scp-body" style="font-size: 0.9rem; margin-bottom: 2.5rem; opacity: 0.8;"><%= it.content.subtitle %></p>
    <% } %>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; text-align: left;">
      <% it.content.plans.forEach(plan => { %>
      <div class="${cmp.card}" style="padding: 2rem; border-radius: 12px; display: flex; flex-direction: column;">
        <h3 class="scp-title" style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.75rem;"><%= plan.name %></h3>
        <div style="margin-bottom: 1.5rem; display: flex; align-items: baseline; gap: 0.25rem;">
          <span class="scp-title" style="font-size: 2.5rem; font-weight: 700;"><%= plan.price %></span>
          <% if (plan.period) { %>
          <span class="scp-body" style="font-size: 0.8rem;">/<%= plan.period %></span>
          <% } %>
        </div>
        <ul style="list-style: none; margin: 0 0 2rem; padding: 0; flex: 1;">
          <% plan.features.forEach(f => { %>
          <li style="padding: 0.625rem 0; font-size: 0.85rem; border-bottom: 1px solid var(--border);"><%= f.text %></li>
          <% }) %>
        </ul>
        <button class="${cmp.actionQuiet}" style="width: 100%; padding: 0.75rem 1.25rem; font-size: 0.9rem; border-radius: 6px; border: none; cursor: pointer;"><%= plan.ctaLabel %></button>
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
<section class="${ctx.sectionNeutral}" style="padding: 5rem 2rem;">
  <div style="max-width: 700px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 2.5rem;"><%= it.content.title %></h2>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <% it.content.items.forEach(item => { %>
      <details class="${cmp.card}" style="padding: 1.25rem 1.5rem; border-radius: 8px;">
        <summary class="scp-title" style="cursor: pointer; font-size: 1.1rem; font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center;">
          <%= item.question %>
          <span style="font-size: 1.25rem; font-weight: 400; opacity: 0.5;">+</span>
        </summary>
        <p class="scp-body" style="margin: 1rem 0 0; font-size: 0.9rem; line-height: 1.65; opacity: 0.75;"><%= item.answer %></p>
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
<section class="${ctx.sectionContrast}" style="padding: 4.5rem 2rem; text-align: center;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 class="scp-title" style="font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem;"><%= it.content.title %></h2>
    <p class="scp-body" style="font-size: 1rem; margin-bottom: 1.5rem; opacity: 0.8;"><%= it.content.description %></p>
    <% if (it.content.benefits && it.content.benefits.length > 0) { %>
    <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem;">
      <% it.content.benefits.forEach(b => { %>
      <span class="scp-body" style="font-size: 0.8rem;"><%= b %></span>
      <% }) %>
    </div>
    <% } %>
    <div style="display: flex; gap: 0.75rem; max-width: 420px; margin: 0 auto 1.25rem; padding: 0.625rem; border-radius: 8px;">
      <input type="email" placeholder="<%= it.content.inputPlaceholder || 'Enter your email' %>" class="scp-body" style="flex: 1; padding: 0.625rem 1rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--body); font-size: 0.85rem;" />
      <button class="${cmp.action}" style="padding: 0.75rem 1.5rem; font-size: 0.9rem; white-space: nowrap; border-radius: 6px; border: none; cursor: pointer;"><%= it.content.ctaLabel %></button>
    </div>
    <% if (it.content.note) { %>
    <p class="scp-meta" style="font-size: 0.7rem;"><%= it.content.note %></p>
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
<footer class="${ctx.sectionNeutral}" style="padding: 3rem 2rem 2rem;">
  <div style="max-width: 980px; margin: 0 auto;">
    <div style="display: flex; gap: 4rem; margin-bottom: 2rem;">
      <div style="flex: 1;">
        <div class="scp-title" style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;"><%= it.content.logoText %></div>
        <p class="scp-body" style="font-size: 0.8rem; opacity: 0.8;"><%= it.content.tagline %></p>
      </div>
      <div style="display: flex; gap: 3rem;">
        <% it.content.columns.forEach(col => { %>
        <div style="display: flex; flex-direction: column; gap: 0.625rem;">
          <h4 class="scp-title" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;"><%= col.heading %></h4>
          <% col.links.forEach(link => { %>
          <a href="<%= link.url %>" class="scp-body" style="font-size: 0.75rem; text-decoration: none; opacity: 0.7;"><%= link.label %></a>
          <% }) %>
        </div>
        <% }) %>
      </div>
    </div>
    <div class="scp-divider" style="display: flex; justify-content: space-between; align-items: center; padding-top: 1.5rem; border-top: 1px solid var(--border);">
      <p class="scp-meta" style="font-size: 0.7rem;"><%= it.content.copyright %></p>
      <% if (it.content.legalLinks && it.content.legalLinks.length > 0) { %>
      <div style="display: flex; gap: 1rem;">
        <% it.content.legalLinks.forEach(link => { %>
        <a href="<%= link.url %>" class="scp-body" style="font-size: 0.7rem; text-decoration: none; opacity: 0.7;"><%= link.label %></a>
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
