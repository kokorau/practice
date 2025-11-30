import type { SectionTemplate, AboutContent } from '../../Domain/ValueObject/SectionTemplate'

export type { AboutContent } from '../../Domain/ValueObject/SectionTemplate'

export const AboutTemplate: SectionTemplate = {
  type: 'about',
  render: (content, cssVars) => {
    const c = content as AboutContent
    return `
<section class="section-about" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: 5rem 2rem;">
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 4rem; align-items: start;">
      <div>
        <h2 style="margin: 0; font-size: 2.5rem; font-weight: 700; line-height: 1.2;">${c.title}</h2>
      </div>
      <div>
        <p style="margin: 0 0 2rem; line-height: 1.8; opacity: 0.8;">${c.description}</p>
        ${c.buttonText ? `<a href="${c.buttonUrl ?? '#'}" style="display: inline-block; background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: 0.875rem 2rem; text-decoration: none; font-weight: 600;">${c.buttonText}</a>` : ''}
      </div>
    </div>
  </div>
</section>`
  },
}
