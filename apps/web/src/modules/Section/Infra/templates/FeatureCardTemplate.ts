import type { SectionTemplate, FeatureCardContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, roundedToCss, sectionPadding, cardPadding, cardGap, lineHeight } from './themeHelper'

export type { FeatureCardContent } from '../../Domain/ValueObject/SectionTemplate'

export const FeatureCardTemplate: SectionTemplate = {
  type: 'feature-card',
  render: (content, theme: RenderTheme) => {
    const c = content as FeatureCardContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)

    const cards = c.cards
      .slice(0, 3)
      .map(
        (card) => `
      <div style="background: rgb(var(--color-secondary)); overflow: hidden; border-radius: ${roundedToCss(s.rounded)};">
        <div style="aspect-ratio: 16/9; overflow: hidden;">
          <img src="${card.imageUrl}" alt="${card.imageAlt ?? ''}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <div style="padding: ${cardPadding(s.padding)}; color: rgb(var(--color-on-secondary));">
          <h3 style="margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 600;">${card.title}</h3>
          <p style="margin: 0; opacity: 0.8; line-height: ${lineHeight(s.leading)};">${card.description}</p>
        </div>
      </div>`
      )
      .join('')

    return `
<section class="section-feature-card" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: ${sectionPadding(s.padding)};">
    ${c.title ? `<h2 style="margin: 0 0 3rem; text-align: center; font-size: 2rem; font-weight: 700;">${c.title}</h2>` : ''}
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: ${cardGap(s.gap)};">
      ${cards}
    </div>
  </div>
</section>`
  },
}
