import type { SectionTemplate, HeroSplitContent } from '../../Domain/ValueObject/SectionTemplate'

export type { HeroSplitContent } from '../../Domain/ValueObject/SectionTemplate'

export const HeroSplitTemplate: SectionTemplate = {
  type: 'hero-split',
  render: (content, cssVars) => {
    const c = content as HeroSplitContent
    const isImageRight = c.imagePosition !== 'left'

    const textBlock = `
      <div style="display: flex; flex-direction: column; justify-content: center; padding: 4rem 2rem;">
        <div style="max-width: 560px; ${isImageRight ? 'margin-left: auto;' : ''}">
          <h1 style="margin: 0 0 1.5rem; font-size: 3rem; font-weight: 700; line-height: 1.1;">${c.title}</h1>
          ${c.subtitle ? `<p style="margin: 0 0 2rem; font-size: 1.25rem; opacity: 0.8; line-height: 1.6;">${c.subtitle}</p>` : ''}
          ${c.buttonText ? `<a href="${c.buttonUrl ?? '#'}" style="display: inline-block; background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: 1rem 2.5rem; text-decoration: none; font-weight: 600; font-size: 1.125rem;">${c.buttonText}</a>` : ''}
        </div>
      </div>`

    const imageBlock = `
      <div style="position: relative; min-height: 100%;">
        <img src="${c.imageUrl}" alt="${c.imageAlt ?? ''}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;" />
      </div>`

    const gridContent = isImageRight ? `${textBlock}${imageBlock}` : `${imageBlock}${textBlock}`

    return `
<section class="section-hero-split" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); min-height: 600px;">
    ${gridContent}
  </div>
</section>`
  },
}
