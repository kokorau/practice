import type { SectionTemplate, GalleryContent } from '../../Domain/ValueObject/SectionTemplate'

export type { GalleryContent } from '../../Domain/ValueObject/SectionTemplate'

export const GalleryTemplate: SectionTemplate = {
  type: 'gallery',
  render: (content, cssVars) => {
    const c = content as GalleryContent
    const images = c.images
      .slice(0, 6)
      .map(
        (img) => `
      <div style="aspect-ratio: 1; overflow: hidden;">
        <img src="${img.url}" alt="${img.alt ?? ''}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" />
      </div>`
      )
      .join('')

    return `
<section class="section-gallery" style="${cssVars} background: rgb(var(--color-base)); color: rgb(var(--color-on-base));">
  <div style="max-width: 1280px; margin: 0 auto; padding: 5rem 2rem;">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
      ${images}
    </div>
  </div>
</section>`
  },
}
