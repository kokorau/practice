import type { SectionTemplate, AboutContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, roundedToCss, sectionPadding, buttonPadding, gridGap, lineHeight } from './themeHelper'

export type { AboutContent } from '../../Domain/ValueObject/SectionTemplate'

export const AboutTemplate: SectionTemplate = {
  type: 'about',
  render: (content, theme: RenderTheme) => {
    const c = content as AboutContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)

    return `
<section class="section-about" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: ${sectionPadding(s.padding)};">
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: ${gridGap(s.gap)}; align-items: start;">
      <div>
        <h2 style="margin: 0; font-size: 2.5rem; font-weight: 700; line-height: 1.2;">${c.title}</h2>
      </div>
      <div>
        <p style="margin: 0 0 2rem; line-height: ${lineHeight(s.leading)}; opacity: 0.8;">${c.description}</p>
        ${c.buttonText ? `<a href="${c.buttonUrl ?? '#'}" style="display: inline-block; background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: ${buttonPadding(s.padding)}; border-radius: ${roundedToCss(s.rounded)}; text-decoration: none; font-weight: 600;">${c.buttonText}</a>` : ''}
      </div>
    </div>
  </div>
</section>`
  },
}
