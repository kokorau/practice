import type { SectionTemplate, CTAContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, roundedToCss, sectionPadding, buttonPadding, lineHeight } from './themeHelper'

export type { CTAContent } from '../../Domain/ValueObject/SectionTemplate'

export const CTATemplate: SectionTemplate = {
  type: 'cta',
  render: (content, theme: RenderTheme) => {
    const c = content as CTAContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)

    return `
<section class="section-cta" style="${cssVars} background: rgb(var(--color-primary)); color: rgb(var(--color-on-primary));">
  <div style="max-width: 800px; margin: 0 auto; padding: ${sectionPadding(s.padding)}; text-align: center;">
    <h2 style="margin: 0 0 1rem; font-size: 2.5rem; font-weight: 700;">${c.title}</h2>
    ${c.description ? `<p style="margin: 0 0 2rem; opacity: 0.9; font-size: 1.125rem; line-height: ${lineHeight(s.leading)};">${c.description}</p>` : ''}
    <a href="${c.buttonUrl ?? '#'}" style="display: inline-block; background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: ${buttonPadding(s.padding)}; border-radius: ${roundedToCss(s.rounded)}; text-decoration: none; font-weight: 600; transition: opacity 0.2s;">
      ${c.buttonText}
    </a>
  </div>
</section>`
  },
}
