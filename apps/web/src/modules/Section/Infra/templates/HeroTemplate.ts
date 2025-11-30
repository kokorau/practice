import type { SectionTemplate, HeroContent } from '../../Domain/ValueObject/SectionTemplate'

export const HeroTemplate: SectionTemplate = {
  type: 'hero',
  render: (content, cssVars) => {
    const c = content as HeroContent
    return `
<section class="section-hero" style="${cssVars} background: rgb(var(--color-primary)); color: rgb(var(--color-on-primary));">
  <div style="max-width: 1280px; margin: 0 auto; padding: 4rem 2rem; text-align: center;">
    <h1 style="margin: 0 0 1rem; font-size: 2.5rem;">${c.title}</h1>
    ${c.subtitle ? `<p style="margin: 0 0 2rem; opacity: 0.9;">${c.subtitle}</p>` : ''}
    ${c.ctaText ? `<button style="background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); border: none; padding: 0.75rem 2rem; border-radius: 4px; font-size: 1rem; cursor: pointer;">${c.ctaText}</button>` : ''}
  </div>
</section>`
  },
}
