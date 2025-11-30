import type { SectionTemplate, TextContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, sectionPadding, lineHeight } from './themeHelper'

export const TextTemplate: SectionTemplate = {
  type: 'text',
  render: (content, theme: RenderTheme) => {
    const c = content as TextContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)

    return `
<section class="section-text" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 800px; margin: 0 auto; padding: ${sectionPadding(s.padding)};">
    ${c.title ? `<h2 style="margin: 0 0 1.5rem;">${c.title}</h2>` : ''}
    <p style="margin: 0; line-height: ${lineHeight(s.leading)};">${c.body}</p>
  </div>
</section>`
  },
}
