import type { SectionTemplate, GalleryContent, RenderTheme } from '../../Domain/ValueObject/SectionTemplate'
import { themeToCssVars, roundedToCss, sectionPadding, cardGap } from './themeHelper'

export type { GalleryContent } from '../../Domain/ValueObject/SectionTemplate'

export const GalleryTemplate: SectionTemplate = {
  type: 'gallery',
  render: (content, theme: RenderTheme) => {
    const c = content as GalleryContent
    const s = theme.stylePack
    const cssVars = themeToCssVars(theme)

    const images = c.images
      .slice(0, 6)
      .map(
        (img) => `
      <div style="aspect-ratio: 1; overflow: hidden; border-radius: ${roundedToCss(s.rounded)};">
        <img src="${img.url}" alt="${img.alt ?? ''}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" />
      </div>`
      )
      .join('')

    return `
<section class="section-gallery" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: ${sectionPadding(s.padding)};">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: ${cardGap(s.gap)};">
      ${images}
    </div>
  </div>
</section>`
  },
}
