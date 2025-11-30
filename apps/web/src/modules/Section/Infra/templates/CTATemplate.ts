import type { SectionTemplate, CTAContent } from '../../Domain/ValueObject/SectionTemplate'

export type { CTAContent } from '../../Domain/ValueObject/SectionTemplate'

export const CTATemplate: SectionTemplate = {
  type: 'cta',
  render: (content, cssVars) => {
    const c = content as CTAContent
    return `
<section class="section-cta" style="${cssVars} background: rgb(var(--color-primary)); color: rgb(var(--color-on-primary));">
  <div style="max-width: 800px; margin: 0 auto; padding: 5rem 2rem; text-align: center;">
    <h2 style="margin: 0 0 1rem; font-size: 2.5rem; font-weight: 700;">${c.title}</h2>
    ${c.description ? `<p style="margin: 0 0 2rem; opacity: 0.9; font-size: 1.125rem; line-height: 1.7;">${c.description}</p>` : ''}
    <a href="${c.buttonUrl ?? '#'}" style="display: inline-block; background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: 1rem 2.5rem; text-decoration: none; font-weight: 600; transition: opacity 0.2s;">
      ${c.buttonText}
    </a>
  </div>
</section>`
  },
}
