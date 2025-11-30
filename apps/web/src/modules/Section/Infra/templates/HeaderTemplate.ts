import type { SectionTemplate, HeaderContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, cardGap } from './themeHelper'

export type { HeaderContent } from '../../Domain/ValueObject/SectionTemplate'

export const HeaderTemplate: SectionTemplate = {
  type: 'header',
  render: (content, theme: RenderTheme) => {
    const c = content as HeaderContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)

    const logo = c.logoUrl
      ? `<img src="${c.logoUrl}" alt="${c.logoAlt ?? ''}" style="height: 2rem;" />`
      : `<span style="font-size: 1.25rem; font-weight: 700;">${c.logoText ?? ''}</span>`

    const links = c.links
      .map(
        (link) =>
          `<a href="${link.url}" style="color: inherit; text-decoration: none; opacity: 0.8; transition: opacity 0.2s;">${link.label}</a>`
      )
      .join('')

    return `
<section class="section-header" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <header style="max-width: 1280px; margin: 0 auto; padding: 1rem 2rem;">
    <nav style="display: flex; align-items: center; justify-content: space-between;">
      <div class="logo">
        ${logo}
      </div>
      <div style="display: flex; gap: ${cardGap(s.gap)}; font-size: 0.875rem;">
        ${links}
      </div>
    </nav>
  </header>
</section>`
  },
}
