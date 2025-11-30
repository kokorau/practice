import type { SectionTemplate, HeroBackgroundContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, roundedToCss, sectionPadding, buttonPadding, lineHeight } from './themeHelper'

export type { HeroBackgroundContent } from '../../Domain/ValueObject/SectionTemplate'

export const HeroBackgroundTemplate: SectionTemplate = {
  type: 'hero-background',
  render: (content, theme: RenderTheme) => {
    const c = content as HeroBackgroundContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)
    const opacity = c.overlayOpacity ?? 0.5

    return `
<section class="section-hero-background" style="${cssVars} position: relative; min-height: 600px; display: flex; align-items: center; justify-content: center;">
  <div style="position: absolute; inset: 0; background-image: url('${c.backgroundUrl}'); background-size: cover; background-position: center;"></div>
  <div style="position: absolute; inset: 0; background: rgb(var(--color-base)); opacity: ${opacity};"></div>
  <div style="position: relative; z-index: 1; max-width: 800px; margin: 0 auto; padding: ${sectionPadding(s.padding)}; text-align: center; color: rgb(var(--color-on-base));">
    <h1 style="margin: 0 0 1.5rem; font-size: 3.5rem; font-weight: 700; line-height: 1.1;">${c.title}</h1>
    ${c.subtitle ? `<p style="margin: 0 0 2rem; font-size: 1.25rem; opacity: 0.9; line-height: ${lineHeight(s.leading)};">${c.subtitle}</p>` : ''}
    ${c.buttonText ? `<a href="${c.buttonUrl ?? '#'}" style="display: inline-block; background: rgb(var(--color-brand)); color: rgb(var(--color-on-brand)); padding: ${buttonPadding(s.padding)}; border-radius: ${roundedToCss(s.rounded)}; text-decoration: none; font-weight: 600; font-size: 1.125rem;">${c.buttonText}</a>` : ''}
  </div>
</section>`
  },
}
