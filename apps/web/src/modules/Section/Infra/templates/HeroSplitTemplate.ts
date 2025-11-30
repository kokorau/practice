import type { SectionTemplate, HeroSplitContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, roundedToCss, sectionPadding, buttonPadding, lineHeight } from './themeHelper'

export type { HeroSplitContent } from '../../Domain/ValueObject/SectionTemplate'

export const HeroSplitTemplate: SectionTemplate = {
  type: 'hero-split',
  render: (content, theme: RenderTheme) => {
    const c = content as HeroSplitContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)
    const isImageRight = c.imagePosition !== 'left'

    const textBlock = `
      <div style="display: flex; flex-direction: column; justify-content: center; padding: ${sectionPadding(s.padding)};">
        <div style="max-width: 560px; ${isImageRight ? 'margin-left: auto;' : ''}">
          <h1 style="margin: 0 0 1.5rem; font-size: 3rem; font-weight: 700; line-height: 1.1;">${c.title}</h1>
          ${c.subtitle ? `<p style="margin: 0 0 2rem; font-size: 1.25rem; opacity: 0.8; line-height: ${lineHeight(s.leading)};">${c.subtitle}</p>` : ''}
          ${c.buttonText ? `<a href="${c.buttonUrl ?? '#'}" style="display: inline-block; background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: ${buttonPadding(s.padding)}; border-radius: ${roundedToCss(s.rounded)}; text-decoration: none; font-weight: 600; font-size: 1.125rem;">${c.buttonText}</a>` : ''}
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
