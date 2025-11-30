import type { SectionTemplate, FeatureContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, roundedToCss, sectionPadding, cardPadding, cardGap, lineHeight } from './themeHelper'

export const FeatureTemplate: SectionTemplate = {
  type: 'feature',
  render: (content, theme: RenderTheme) => {
    const c = content as FeatureContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)

    const items = c.items
      .map(
        (item) => `
    <div style="background: rgb(var(--color-secondary)); color: rgb(var(--color-on-secondary)); padding: ${cardPadding(s.padding)}; border-radius: ${roundedToCss(s.rounded)};">
      <h3 style="margin: 0 0 0.5rem;">${item.title}</h3>
      <p style="margin: 0; opacity: 0.9; line-height: ${lineHeight(s.leading)};">${item.description}</p>
    </div>`
      )
      .join('\n')

    return `
<section class="section-feature" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: ${sectionPadding(s.padding)};">
    <h2 style="text-align: center; margin: 0 0 1rem;">${c.title}</h2>
    <p style="text-align: center; margin: 0 0 2rem; opacity: 0.8; line-height: ${lineHeight(s.leading)};">${c.description}</p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: ${cardGap(s.gap)};">
      ${items}
    </div>
  </div>
</section>`
  },
}
