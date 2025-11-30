import type { SectionTemplate, ImageTextContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, sectionPadding, lineHeight } from './themeHelper'

export type { ImageTextContent } from '../../Domain/ValueObject/SectionTemplate'

export const ImageTextTemplate: SectionTemplate = {
  type: 'image-text',
  render: (content, theme: RenderTheme) => {
    const c = content as ImageTextContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)
    const isImageLeft = c.imagePosition === 'left'

    const imageBlock = `
      <div style="aspect-ratio: 4/3; overflow: hidden;">
        <img src="${c.imageUrl}" alt="${c.imageAlt ?? ''}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>`

    const textBlock = `
      <div style="display: flex; flex-direction: column; justify-content: center; padding: ${sectionPadding(s.padding)};">
        <h2 style="margin: 0 0 1rem; font-size: 2rem; font-weight: 600;">${c.title}</h2>
        ${c.text ? `<p style="margin: 0; opacity: 0.8; line-height: ${lineHeight(s.leading)};">${c.text}</p>` : ''}
      </div>`

    const gridContent = isImageLeft ? `${imageBlock}${textBlock}` : `${textBlock}${imageBlock}`

    return `
<section class="section-image-text" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto;">
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); min-height: 400px;">
      ${gridContent}
    </div>
  </div>
</section>`
  },
}
